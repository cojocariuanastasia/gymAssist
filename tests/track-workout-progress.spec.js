const { test, expect } = require('@playwright/test');

test.describe('Track Workout Progress Tests', () => {

  let testUserToken;

  test.beforeEach(async ({ page, request }) => {
    // Create fresh test user before each test
    const uniqueId = Date.now();
    const registerRes = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: `trackuser${uniqueId}`,
        email: `track${uniqueId}@email.com`,
        password: 'TestPass123!'
      }
    });
    
    if (registerRes.ok()) {
      const userData = await registerRes.json();
      testUserToken = userData.token;
    }
    
    // Login and go to muscle selection screen
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Email').fill(`track${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
  });


  test('TWP-01: Modify exercise parameters', async ({ page }) => {
    // Given a workout is in progress
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // When the user changes repetitions, sets, or weight
    const setsInput = page.getByLabel('Sets').first();
    await setsInput.fill('5');

    const repsInput = page.getByLabel('Reps').first();
    await repsInput.fill('15');

    // Check if weight input exists
    const weightInput = page.getByLabel('Weight').first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('85.5');
    }

    // Then the updated values should be saved immediately
    await expect(setsInput).toHaveValue('5');
    await expect(repsInput).toHaveValue('15');
    if (await weightInput.isVisible()) {
      await expect(weightInput).toHaveValue('85.5');
    }
  });


  test('TWP-02: Time based exercises support', async ({ page, request }) => {
    // First add a time based exercise to test
    // We will test that when workout loads, plank/lateral plank/wall sit show seconds not reps

    await page.getByRole('button', { name: 'Abdominals' }).click();
    await page.getByRole('button', { name: 'Beginner' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // Then duration in seconds is displayed instead of sets/repetitions
    // For plank exercise will have "Seconds" label
    const secondLabel = page.getByText('Seconds').first();
    await expect(secondLabel).toBeVisible();
  });


  test('TWP-03: Mark exercise as completed', async ({ page }) => {
    // Given a workout is in progress
    await page.getByRole('button', { name: 'Legs' }).click();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // When user checks exercise checkbox
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeChecked();
    await firstCheckbox.uncheck();
    await expect(firstCheckbox).not.toBeChecked();

    // Then the exercise is visually marked as completed
    const exerciseCard = firstCheckbox.locator('xpath=../..');
    await expect(exerciseCard).toHaveCSS('opacity', '0.45');
  });


  test('TWP-04: Complete entire workout', async ({ page, request }) => {
    // Generate workout
    await page.getByRole('button', { name: 'Chest' }).click();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // Given the user clicks "Complete workout"
    await page.getByRole('button', { name: '✓ Complete Workout' }).click();

    // Then workout is saved to history
    // And user is redirected back to profile page
    await expect(page.getByText('🔥 Streak')).toBeVisible({ timeout: 8000 });
  });


  test('TWP-05: Discard workout', async ({ page }) => {
    // Generate workout
    await page.getByRole('button', { name: 'Arms' }).click();
    await page.getByRole('button', { name: 'Beginner' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // Given user clicks "Discard Workout"
    await page.getByRole('button', { name: 'Back' }).click();

    // Then workout progress is lost
    // And user returns to muscle group selection
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 5000 });
  });

});
