const { test, expect } = require('@playwright/test');

test('should create a 3-page survey, add logic, validate, publish, and download JSON', async ({ page }) => {
  // Login first
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'e2e-user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:text("Login")');
  await page.waitForNavigation();

  // Now we should be on the dashboard
  await page.goto('/dashboard');

  // Create a new form
  await page.click('text=Create New Form');
  await page.fill('#title', 'My 3-Page Survey');
  await page.click('button:text("Create")');

  // Add 2 more pages
  await page.click('button:text("Add Page")');
  await page.click('button:text("Add Page")');

  // Go to page 1 and add a question
  await page.click('text=Page 1');
  await page.click('button:text("Add Short Text")');

  // Go to page 2 and add a question
  await page.click('text=Page 2');
  await page.click('button:text("Add Single Choice")');

  // Go to page 3 and add a question
  await page.click('text=Page 3');
  await page.click('button:text("Add Multiple Choice")');

  // Add logic to jump to page 3 if the answer to the first question is "test"
  await page.click('text=Page 1');
  await page.click('.block');
  await page.click('text=Logic');
  await page.click('#add-rule-btn');
  await page.selectOption('[name="rule-question"]', { label: 'Short Text Question' });
  await page.selectOption('[name="rule-operator"]', 'equals');
  await page.fill('[name="rule-value"]', 'test');
  await page.selectOption('[name="rule-action"]', 'jump_to_page');
  await page.selectOption('[name="rule-target"]', 'Page 3');

  // Validate the form
  await page.click('#validateBtn');
  const validationAlert = await page.waitForSelector('.alert-success');
  expect(await validationAlert.textContent()).toContain('Validation successful!');

  // Publish the form and download the JSON
  await page.click('#publishBtn');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#downloadJsonBtn'),
  ]);
  const downloadPath = await download.path();
  const downloadContent = require('fs').readFileSync(downloadPath, 'utf-8');
  const surveyData = JSON.parse(downloadContent);
  expect(surveyData.title).toBe('My 3-Page Survey');
  expect(surveyData.pages.length).toBe(3);
});
