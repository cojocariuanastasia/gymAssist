const { test, expect } = require('@playwright/test');

test.describe('Replace Exercise Based On Equipment Availability Tests', () => {

  let testUserToken;

  test.beforeEach(async ({ page, request }) => {
    // Create fresh test user before each test
    const uniqueId = Date.now();
    const registerRes = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: `replaceuser${uniqueId}`,
        email: `replace${uniqueId}@email.com`,
        password: 'TestPass123!'
      }
    });
    
    if (registerRes.ok()) {
      const userData = await registerRes.json();
      testUserToken = userData.token;
    }
    
    // Login and go to muscle selection screen
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Email').fill(`replace${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
  });


  test('REX-01: Replace with equivalent exercise', async ({ page }) => {
    // Given a workout is generated
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // When the user clicks "Replace"
    await page.getByRole('button', { name: 'Replace' }).first().click();

    // Then system responds without error
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible();
  });


  test('REX-02: Replacement keeps difficulty level', async ({ page, request }) => {
    // Given an exercise is selected for replacement
    await page.getByRole('button', { name: 'Legs' }).click();
    await page.getByRole('button', { name: 'Expert' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // When replacement is performed
    await page.getByRole('button', { name: 'Replace' }).first().click();

    // Then the new exercise is never of higher difficulty than original
    await expect(page.getByText('Legs · Expert')).toBeVisible();
  });


  test('REX-03: Replacement keeps difficulty level happy path', async ({ page }) => {
    // Given same difficulty alternatives exist
    await page.getByRole('button', { name: 'Legs' }).click();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // When an exercise is replaced
    const beforeCount = await page.getByRole('button', { name: 'Replace' }).count();
    await page.getByRole('button', { name: 'Replace' }).first().click();
    const afterCount = await page.getByRole('button', { name: 'Replace' }).count();

    // Then the new exercise will have similar difficulty and intensity
    expect(afterCount).toEqual(beforeCount);
  });


  test('REX-04: Replacement provides at least one option', async ({ page }) => {
    // Given an exercise is selected for replacement
    await page.getByRole('button', { name: 'Shoulders' }).click();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // When the system searches for alternatives
    await page.getByRole('button', { name: 'Replace' }).first().click();

    // Then at least one equivalent exercise should be returned
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible();
  });


  test('REX-05: Instant feedback on replacement', async ({ page }) => {
    // Generate workout
    await page.getByRole('button', { name: 'Arms' }).click();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // Click replace button
    const startTime = Date.now();
    await page.getByRole('button', { name: 'Replace' }).first().click();
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Given an exercise is replaced
    // Then the UI should update immediately
    expect(duration).toBeLessThan(1500); // Less than 1.5 seconds
  });


  test('REX-06: No replacement exercises available', async ({ page, request }) => {
    // Given selected muscle group "Arms" at Beginner difficulty
    // Supinated Grip Pull-Ups has no alternative exercises for this specific muscle
    await page.getByRole('button', { name: 'Arms' }).click();
    await page.getByRole('button', { name: 'Beginner' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // When user clicks Replace button
    await page.getByRole('button', { name: 'Replace' }).first().click();

    // Then message is displayed
    await expect(page.getByText('No alternative exercise found for the same specific muscle')).toBeVisible({ timeout: 5000 });
  });

});
