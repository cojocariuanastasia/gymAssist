const { test, expect } = require('@playwright/test');

test.describe('Select Muscle Group for Workout Generation Tests', () => {

  let testUserToken;

  test.beforeEach(async ({ page, request }) => {
    // Create fresh test user before each test
    const uniqueId = Date.now();
    const registerRes = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: `muscleuser${uniqueId}`,
        email: `muscle${uniqueId}@email.com`,
        password: 'TestPass123!'
      }
    });
    const userData = await registerRes.json();
    testUserToken = userData.token;
    
    // Login and go to muscle selection screen
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Email').fill(`muscle${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
  });


  test('SMG-01: User selects one muscle group', async ({ page }) => {
    // Given the user is on the muscle group selection screen
    
    // When the user selects "Chest"
    await page.getByRole('button', { name: 'Chest' }).click();

    // Then goes to difficulty screen
    await expect(page.getByText('Select difficulty')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Chest')).toBeVisible();
  });


  test('SMG-02: User selects the second muscle group', async ({ page, request }) => {
    // Given the user has completed one workout today
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: { muscleGroup: 'Back', difficulty: 'Expert', exercises: [] }
    });

    // Refresh page to load today's status
    await page.reload();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });

    // Before selecting the second muscle group
    // The message displayed is correct
    await expect(page.getByText('You can train up to 2 muscle groups per day. Today: Back (1/2)')).toBeVisible();

    // Then the user can select the second muscle group
    await page.getByRole('button', { name: 'Chest' }).click();
    
    // Which goes to the difficulty screen
    await expect(page.getByText('Select difficulty')).toBeVisible({ timeout: 5000 });
  });


  test('SMG-03: Max 2 muscle groups per day', async ({ page, request }) => {
    // Given user has already completed 2 workouts today
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: { muscleGroup: 'Back', difficulty: 'Expert', exercises: [] }
    });
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: { muscleGroup: 'Chest', difficulty: 'Intermediate', exercises: [] }
    });

    // Refresh page to load today's status
    await page.reload();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });

    // Then error message is displayed
    await expect(page.getByText('You have trained 2 muscle groups today. Come back tomorrow!')).toBeVisible();
  });


  test('SMG-04: Cannot train same muscle group twice per day', async ({ page, request }) => {
    // Given user has already trained "Back" today
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: { muscleGroup: 'Back', difficulty: 'Expert', exercises: [] }
    });

    // Refresh page to load today's status
    await page.reload();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });

    // When user tries to select "Back" again
    const backButton = page.getByRole('button', { name: 'Back ✓' });

    // The "Back" option is disabled as an option from the Select Muscle Group screen
    await expect(backButton).toBeDisabled();
    await expect(backButton).toHaveCSS('opacity', '0.4');
  });

});
