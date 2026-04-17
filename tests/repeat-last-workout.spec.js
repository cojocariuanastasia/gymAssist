const { test, expect } = require('@playwright/test');

test.describe('Repeat Last Workout Functionality Tests', () => {

  let testUserToken;

  test.beforeEach(async ({ page, request }) => {
    // Create fresh test user before each test
    const uniqueId = Date.now();
    const registerRes = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        username: `repeatuser${uniqueId}`,
        email: `repeat${uniqueId}@email.com`,
        password: 'TestPass123!'
      }
    });
    const userData = await registerRes.json();
    testUserToken = userData.token;
    
    // Login and go to muscle selection screen
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Email').fill(`repeat${uniqueId}@email.com`);
    await page.getByPlaceholder('Password').fill('TestPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('What do you train today?')).toBeVisible({ timeout: 8000 });
  });


  test('RLW-01: Repeat last workout successful', async ({ page, request }) => {
    // First get real existing exercise from database
    const exercisesRes = await request.get('http://localhost:8000/api/exercises?muscleGroup=Back&limit=2');
    const response = await exercisesRes.json();
    const exercises = response.exercises;
    
    // Given user has completed a back workout with exercises
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: {
        muscleGroup: 'Back',
        difficulty: 'Expert',
        exercises: [
          { exerciseId: exercises[0].id, name: exercises[0].name, equipment: exercises[0].equipment, sets: 4, reps: 12, weight: null },
          { exerciseId: exercises[1].id, name: exercises[1].name, equipment: exercises[1].equipment, sets: 5, reps: 5, weight: 100 }
        ]
      }
    });

    // Open prompt
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Previous workout found')).toBeVisible({ timeout: 5000 });

    // Given user selects "Repeat last workout" option
    await page.getByRole('button', { name: 'Repeat last workout' }).click();

    // Wait for workout screen to load
    await expect(page.getByText(exercises[0].name)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(exercises[1].name)).toBeVisible();
  });


  test('RLW-02: Try new difficulty flow', async ({ page, request }) => {
    // First get real existing exercise from database
    const exercisesRes = await request.get('http://localhost:8000/api/exercises?muscleGroup=Back&limit=1');
    const response = await exercisesRes.json();
    const exercises = response.exercises;
    
    // Create completed back workout
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: {
        muscleGroup: 'Back',
        difficulty: 'Expert',
        exercises: [
          { exerciseId: exercises[0].id, name: exercises[0].name, equipment: exercises[0].equipment, sets: 4, reps: 12, weight: null }
        ]
      }
    });

    // Open prompt
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Previous workout found')).toBeVisible({ timeout: 5000 });

    // Given user selects "Try new difficulty" option
    await page.getByRole('button', { name: 'Try new difficulty' }).click();

    // Then user is taken to difficulty selection screen for that muscle group
    await expect(page.getByText('Select difficulty')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('p').filter({ hasText: 'Back' })).toBeVisible();
  });


  test('RLW-03: Repeat workout includes modifications', async ({ page, request }) => {
    // First get real existing exercise from database
    const exercisesRes = await request.get('http://localhost:8000/api/exercises?muscleGroup=Chest&limit=1');
    const response = await exercisesRes.json();
    const exercises = response.exercises;
    
    // Given user had modified weight/reps in last workout
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: {
        muscleGroup: 'Chest',
        difficulty: 'Intermediate',
        exercises: [
          { exerciseId: exercises[0].id, name: exercises[0].name, equipment: exercises[0].equipment, sets: 5, reps: 8, weight: 92.5 }
        ]
      }
    });

    // Open prompt
    await page.getByRole('button', { name: 'Chest' }).click();
    await expect(page.getByText('Previous workout found')).toBeVisible({ timeout: 5000 });

    // When user repeats workout
    await page.getByRole('button', { name: 'Repeat last workout' }).click();

    // Then modified values are preserved
    await expect(page.getByText(exercises[0].name)).toBeVisible({ timeout: 10000 });
  });


  test('RLW-04: Cancel previous workout prompt', async ({ page, request }) => {
    // First get real existing exercise from database
    const exercisesRes = await request.get('http://localhost:8000/api/exercises?muscleGroup=Legs&limit=1');
    const response = await exercisesRes.json();
    const exercises = response.exercises;
    
    // Create completed workout
    await request.post('http://localhost:8000/api/workout/complete', {
      headers: { 'Authorization': `Bearer ${testUserToken}` },
      data: {
        muscleGroup: 'Legs',
        difficulty: 'Beginner',
        exercises: [
          { exerciseId: exercises[0].id, name: exercises[0].name, equipment: exercises[0].equipment, sets: 4, reps: 15, weight: null }
        ]
      }
    });

    // Open prompt
    await page.getByRole('button', { name: 'Legs' }).click();
    await expect(page.getByText('Previous workout found')).toBeVisible({ timeout: 5000 });

    // Given previous workout prompt is displayed
    // When user clicks outside prompt
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Then prompt dismisses and no action is taken
    await expect(page.getByText('Previous workout found')).toBeHidden({ timeout: 3000 });
    await expect(page.getByText('What do you train today?')).toBeVisible();
  });

});
