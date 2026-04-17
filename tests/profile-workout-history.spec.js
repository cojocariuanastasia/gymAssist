const { test, expect } = require('@playwright/test');

test.describe('Profile & Workout History Tests', () => {

  let testUserToken;

  test.beforeEach(async ({ page, request }) => {
    // Create fresh test user before each test
    const uniqueId = Date.now();
    const registerRes = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: `historyuser${uniqueId}`,
        email: `history${uniqueId}@email.com`,
        password: 'TestPass123!'
      }
    });
    const userData = await registerRes.json();
    testUserToken = userData.token;
    
    // Login
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Email').fill(`history${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
  });


  test('PWH-01: View past workouts', async ({ page, request }) => {
    // Given the user is logged in
    // And has completed workouts
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: {
        muscleGroup: 'Back',
        difficulty: 'Expert',
        exercises: []
      }
    });

    // When the user navigates to profile page
    await page.getByText(' ›').click();
    await expect(page.getByText('🔥 Streak')).toBeVisible();

    // Then the calendar should mark days with completed workouts
    // (one orange dot for each workout done)
    await expect(page.locator('div[style*="background: rgb(249, 115, 22)"]')).toHaveCount(1);
  });


  test('PWH-02: Workout details', async ({ page, request }) => {
    // Create completed test workout
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: {
        muscleGroup: 'Chest',
        difficulty: 'Intermediate',
        exercises: [
          { exerciseId: '1', name: 'Bench Press', equipment: 'Barbell', sets: 4, reps: 10, weight: 80 }
        ]
      }
    });

    // Navigate to profile
    await page.getByText(' ›').click();
    await expect(page.getByText('🔥 Streak')).toBeVisible();

    // Given the user selects today's day from calendar
    const today = new Date().getDate().toString();
    await page.getByText(today, { exact: true }).click();

    // Then the user should see all required details
    await expect(page.getByText('Chest · Intermediate')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Bench Press — 4 × 10 reps · 80 kg')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete workout' })).toBeVisible();
  });


  test('PWH-03: Delete workout', async ({ page, request }) => {
    // Create completed test workout
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: {
        muscleGroup: 'Legs',
        difficulty: 'Beginner',
        exercises: []
      }
    });

    // Navigate to profile
    await page.getByText(' ›').click();
    await expect(page.getByText('🔥 Streak')).toBeVisible();

    // Given the user selects today's day from calendar
    const today = new Date().getDate().toString();
    await page.getByText(today, { exact: true }).click();
    await expect(page.getByText('Legs · Beginner')).toBeVisible();

    // And the user sees the workout details and the Delete Workout button is pressed
    await page.getByRole('button', { name: 'Delete workout' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();

    // Then the workout should be deleted from that day
    await expect(page.getByText('Legs · Beginner')).toBeHidden({ timeout: 5000 });

    // Go back to selection screen
    await page.getByRole('button', { name: 'Start Training' }).click();

    // If it's the current day then the user should be able to add a new workout for that muscle group
    await expect(page.getByRole('button', { name: 'Legs' })).toBeEnabled();
  });


  test('PWH-04: Empty history', async ({ page }) => {
    // Given the user has no completed workouts
    
    // When the user opens profile page
    await page.getByText(' ›').click();
    await expect(page.getByText('🔥 Streak')).toBeVisible();

    // Then calendar shows no marked days
    await expect(page.locator('div[style*="background: rgb(249, 115, 22)"]')).toHaveCount(0);
  });


  test('PWH-05: Already completed 2 workouts', async ({ page, request }) => {
    // Given the user has completed 2 workouts
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: { muscleGroup: 'Back', difficulty: 'Expert', exercises: [] }
    });
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: { muscleGroup: 'Chest', difficulty: 'Intermediate', exercises: [] }
    });
    
    // Refresh the page to get updated daily limits
    await page.reload();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });

    // Then it should be displayed the limit message
    await expect(page.getByText('You have trained 2 muscle groups today. Come back tomorrow!')).toBeVisible();
  });

});
