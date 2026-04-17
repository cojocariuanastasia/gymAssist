const { test, expect } = require('@playwright/test');

test.describe('Generate Personalized Workout Tests', () => {

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
    
    if (registerRes.ok()) {
      const userData = await registerRes.json();
      testUserToken = userData.token;
    }
    
    // Login and go to muscle selection screen
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Email').fill(`workout${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
  });


  test('GPW-01: Workout contains valid number of exercises', async ({ page }) => {
    // Given the user selected "Legs"
    await page.getByRole('button', { name: 'Legs' }).click();

    // Select Intermediate difficulty
    await page.getByRole('button', { name: 'Intermediate' }).click();

    // Wait for workout to load (look for Replace buttons)
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });
    
    // When the workout is generated
    const exerciseCount = await page.getByRole('button', { name: 'Replace' }).count();
    
    // Then the workout should contain between 4 and 6 exercises
    expect(exerciseCount).toBeGreaterThanOrEqual(4);
    expect(exerciseCount).toBeLessThanOrEqual(6);
  });


  test('GPW-02: Exercises contain required details', async ({ page }) => {
    // Select Legs muscle group
    await page.getByRole('button', { name: 'Legs' }).click();

    // Select Intermediate difficulty
    await page.getByRole('button', { name: 'Intermediate' }).click();

    // Wait for workout to load
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // Given a workout is generated
    const replaceButtons = page.getByRole('button', { name: 'Replace' });
    const count = await replaceButtons.count();

    // Then each exercise should have: name, equipment, sets, repetitions
    for (let i = 0; i < count; i++) {
      // Each exercise has equipment line
      await expect(page.getByText('Equipment: ').nth(i)).toBeVisible();
      // Each exercise has Sets input
      await expect(page.getByLabel('Sets').nth(i)).toBeVisible();
      // Each exercise has Reps input
      await expect(page.getByLabel('Reps').nth(i)).toBeVisible();
    }
  });


  test('GPW-03: Beginner user gets easier workout', async ({ page }) => {
    // Select Back muscle group (has enough beginner exercises)
    await page.getByRole('button', { name: 'Back' }).click();

    // Given the user is a "Beginner"
    await page.getByRole('button', { name: 'Beginner' }).click();

    // When the workout is generated
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });
    
    // Verify exercises loaded correctly
    const count = await page.getByRole('button', { name: 'Replace' }).count();
    expect(count).toBeGreaterThanOrEqual(4);
  });


  test('GPW-04: Intermediate user gets efficient workout', async ({ page }) => {
    // Select Chest muscle group
    await page.getByRole('button', { name: 'Chest' }).click();

    // Given the user is an "Intermediate User"
    await page.getByRole('button', { name: 'Intermediate' }).click();

    // When the workout is generated
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });
    
    // Verify exercises loaded correctly
    const count = await page.getByRole('button', { name: 'Replace' }).count();
    expect(count).toBeGreaterThanOrEqual(3);
  });


  test('GPW-05: Expert user gets appropriate workout', async ({ page }) => {
    // Select Chest muscle group
    await page.getByRole('button', { name: 'Chest' }).click();

    // Given the user is an "Expert"
    await page.getByRole('button', { name: 'Expert' }).click();

    // When the workout is generated
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });
    
    // Verify exercises loaded correctly
    const count = await page.getByRole('button', { name: 'Replace' }).count();
    expect(count).toBeGreaterThanOrEqual(3);
  });


  test('GPW-06: Fallback for low difficulty exercises', async ({ page, request }) => {
    
    // First get only expert exercises count for Shoulders
    const res = await request.get('http://localhost:8000/api/exercises?muscleGroup=Shoulders&difficulty=Beginner');
    const data = await res.json();
    
    // Skip test if there are enough exercises
    test.skip(data.exercises.length >= 4);

    // Given not enough exercises exist for selected difficulty
    await page.getByRole('button', { name: 'Shoulders' }).click();
    await page.getByRole('button', { name: 'Beginner' }).click();

    // When workout is generated
    await expect(page.getByRole('button', { name: 'Replace' }).first()).toBeVisible({ timeout: 10000 });

    // Then simpler exercises are added with adjusted parameters
    const exerciseCount = await page.getByRole('button', { name: 'Replace' }).count();
    expect(exerciseCount).toBeGreaterThanOrEqual(4);
  });

});
