const { test, expect } = require('@playwright/test');

test.describe('Previous Workout Detection Tests', () => {

  let testUserToken;

  test.beforeEach(async ({ page, request }) => {
    // Create fresh test user before each test
    const uniqueId = Date.now();
    const registerRes = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: `workoutuser${uniqueId}`,
        email: `workout${uniqueId}@email.com`,
        password: 'TestPass123!'
      }
    });
    const userData = await registerRes.json();
    testUserToken = userData.token;
    
    // Login and go to muscle selection screen
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Email').fill(`workout${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
  });


  test('PWD-01: Previous workout found prompt', async ({ page, request }) => {
    // Given user has completed a "Back" workout with difficulty "Expert" in history
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: {
        muscleGroup: 'Back',
        difficulty: 'Expert',
        exercises: []
      }
    });

    // When user selects "Back" muscle group
    await page.getByRole('button', { name: 'Back' }).click();

    // Then prompt is displayed: "You already trained Back before. Last difficulty: Expert."
    await expect(page.getByText('Previous workout found')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('You already trained Back before. Last difficulty: Expert.')).toBeVisible();
  });


  test('PWD-02: Prompt shows correct options', async ({ page, request }) => {
    // Create completed back workout
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: {
        muscleGroup: 'Back',
        difficulty: 'Expert',
        exercises: []
      }
    });

    // Open prompt
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Previous workout found')).toBeVisible();

    // Then two options are available
    await expect(page.getByRole('button', { name: 'Try new difficulty' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Repeat last workout' })).toBeVisible();
  });


  test('PWD-03: No prompt for new muscle group', async ({ page }) => {
    // Given user has never trained "Chest" before

    // When user selects "Chest"
    await page.getByRole('button', { name: 'Chest' }).click();

    // Then no prompt is shown and workout generation proceeds directly
    await expect(page.getByText('Previous workout found')).toBeHidden();
    await expect(page.getByText('Select difficulty')).toBeVisible({ timeout: 5000 });
  });

});
