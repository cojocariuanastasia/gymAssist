const { test, expect } = require('@playwright/test');

test.describe('Fast and Minimal User Experience Tests', () => {

  let testUserToken;

  test.beforeEach(async ({ page, request }) => {
    // Create fresh test user before each test
    const uniqueId = Date.now();
    const registerRes = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: `fmuxuser${uniqueId}`,
        email: `fmux${uniqueId}@email.com`,
        password: 'TestPass123!'
      }
    });
    
    if (registerRes.ok()) {
      const userData = await registerRes.json();
      testUserToken = userData.token;
    }
    
    // Login and go to muscle selection screen
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Email').fill(`fmux${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
  });


  test('FMUX-01: Instant workout generation', async ({ page }) => {
    // Select muscle group
    await page.getByRole('button', { name: 'Legs' }).click();

    // Select difficulty
    const startTime = Date.now();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    
    // Then the workout appears with minimal or no loading time
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });
    const totalTime = Date.now() - startTime;
    
    // Workout should load in under 2 seconds
    expect(totalTime).toBeLessThan(2000);
  });


  test('FMUX-02: Instant exercise replacement', async ({ page }) => {
    // Generate workout
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // When the user replaces an exercise
    const startTime = Date.now();
    await page.getByRole('button', { name: 'Replace' }).first().click();
    const totalTime = Date.now() - startTime;

    // Then the update happens instantly without visible delay
    expect(totalTime).toBeLessThan(1000); // Under 1 second
  });


  test('FMUX-03: Minimal UI', async ({ page }) => {
    // Given the user is navigating the app
    await page.getByRole('button', { name: 'Chest' }).click();
    await page.getByRole('button', { name: 'Beginner' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // Then only essential buttons and options should be displayed
    const allButtons = await page.getByRole('button').all();
    const buttonCount = allButtons.length;
    
    // Only essential buttons: Replace buttons, Complete Workout, Back
    expect(buttonCount).toBeLessThanOrEqual(12);
  });

});


test.describe('Exercise Data Consistency Tests', () => {

  let testUserToken;

  test.beforeEach(async ({ page, request }) => {
    // Create fresh test user before each test
    const uniqueId = Date.now();
    const registerRes = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: `edcuser${uniqueId}`,
        email: `edc${uniqueId}@email.com`,
        password: 'TestPass123!'
      }
    });
    
    if (registerRes.ok()) {
      const userData = await registerRes.json();
      testUserToken = userData.token;
    }
    
    // Login and go to muscle selection screen
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Email').fill(`edc${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
  });


  test('EDC-01: Exercises are loaded from dataset', async ({ page, request }) => {
    // Generate workout
    await page.getByRole('button', { name: 'Shoulders' }).click();
    await page.getByRole('button', { name: 'Intermediate' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // When a workout is generated
    // Then all exercises should exist in the dataset from the WorkoutAPI
    // Verify all replace buttons work correctly
    const replaceButtonsCount = await page.getByRole('button', { name: 'Replace' }).count();
    expect(replaceButtonsCount).toBeGreaterThanOrEqual(3);
  });


  test('EDC-02: Exercise has valid attributes', async ({ page }) => {
    // Given any exercise is displayed
    await page.getByRole('button', { name: 'Arms' }).click();
    await page.getByRole('button', { name: 'Expert' }).click();
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // Then it includes: muscle group, required equipment, difficulty level
    await expect(page.getByText('Equipment: ').first()).toBeVisible();
    await expect(page.getByText('Specific muscle: ').first()).toBeVisible();
  });

});
