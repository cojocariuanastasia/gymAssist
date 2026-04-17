const { test, expect } = require('@playwright/test');

test.describe('User Signup Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // User flow: click register link on login page
    await page.getByRole('button', { name: "Don't have an account? Register" }).click();
  });

  test('USU-01: Successful signup', async ({ page }) => {
    // Given the user is on the signup page
    await expect(page.getByPlaceholder('Username')).toBeVisible();

    // When the user enters valid email, password, and username
    const uniqueId = Date.now();
    await page.getByPlaceholder('Username').fill(`newuser${uniqueId}`);
    await page.getByPlaceholder('Email').fill(`new_user_${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('StrongPass123!');

    // And clicks "Register"
    await page.getByRole('button', { name: 'Register' }).click();

    // Then the account should be created
    // Wait for profile button which confirms login completed (contains › character)
    await expect(page.getByText('›')).toBeVisible({ timeout: 12000 });
    // Verify we are on muscle selection screen
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 3000 });
  });

  test('USU-02: Signup with existing email', async ({ page, request }) => {
    // Given an account already exists with email "test@email.com"
    // Pre-create test account via API
    await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: 'existinguser',
        email: 'test@email.com',
        password: 'TestPass123!'
      }
    });

    // We are already on register page, no need to reload/navigate
    await expect(page.getByPlaceholder('Username')).toBeVisible();

    // When the user tries to sign up with the same email
    await page.getByPlaceholder('Username').fill('anotheruser');
    await page.getByPlaceholder('Email').fill('test@email.com');
    await page.getByPlaceholder('Password').fill('AnotherPass123!');
    await page.getByRole('button', { name: 'Register' }).click();

    // Then an error message "Email already in use" should be displayed
    await expect(page.getByText('Email already in use')).toBeVisible({ timeout: 5000 });
  });

  test('USU-03: Signup with invalid data', async ({ page }) => {
    // Given the user is on the signup page
    await expect(page.getByPlaceholder('Username')).toBeVisible();

    // When the user enters an invalid email
    const emailInput = page.getByPlaceholder('Email');
    await emailInput.fill('invalid-email');
    await page.getByPlaceholder('Password').fill('123');
    
    // Click register button
    await page.getByRole('button', { name: 'Register' }).click();

    // Test passes: we are still on register page (did NOT navigate away)
    // This confirms form submission was blocked
    await expect(page.getByPlaceholder('Username')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toHaveValue('invalid-email');
    await expect(page.getByPlaceholder('Password')).toHaveValue('123');
  });

});

test.describe('User Authentication Tests', () => {

  test.beforeEach(async ({ page, request }) => {
    // Create valid test account before each test
    await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: 'testuser',
        email: 'testuser@email.com',
        password: 'TestUser123!'
      }
    });
    await page.goto('http://localhost:3000/login');
  });

  test('UAU-01: Successful login', async ({ page }) => {
    // Given the user has a valid account
    // When the user enters correct credentials
    await page.getByPlaceholder('Email').fill('testuser@email.com');
    await page.getByPlaceholder('Password').fill('TestUser123!');

    // And clicks "Login"
    await page.getByRole('button', { name: 'Login' }).click();

    // Then the user should be authenticated
    // And redirected to the muscle selection screen
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('testuser ›')).toBeVisible();
  });

  test('UAU-02: Login with incorrect credentials', async ({ page }) => {
    // Given the user has a valid account
    // When the user enters incorrect password
    await page.getByPlaceholder('Email').fill('testuser@email.com');
    await page.getByPlaceholder('Password').fill('WrongPassword!');
    await page.getByRole('button', { name: 'Login' }).click();

    // Then an error message should be displayed
    await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 3000 });
  });

  test('UAU-03: Logout', async ({ page }) => {
    // Given the user is logged in
    await page.getByPlaceholder('Email').fill('testuser@email.com');
    await page.getByPlaceholder('Password').fill('TestUser123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });

    // When the user clicks username profile button
    await page.getByText('testuser ›').click();

    // Then click Logout
    await page.getByRole('button', { name: 'Logout' }).click();

    // Then the session should be terminated
    // And the user should be redirected to the login page
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
  });

});
