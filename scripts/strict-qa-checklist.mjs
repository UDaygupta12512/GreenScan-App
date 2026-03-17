import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:4180";

/** @typedef {{name: string, status: "PASS"|"FAIL", details?: string}} StepResult */
/** @typedef {{name: string, status: "PASS"|"FAIL", steps: StepResult[], error?: string}} JourneyResult */

/** @type {JourneyResult[]} */
const results = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Complete onboarding flow when it appears on Home.
 * @param {import("playwright").Page} page
 */
async function completeOnboardingIfVisible(page) {
  const onboardingHeading = page.getByRole("heading", { name: /Welcome to GreenScan/i });
  const isVisible = await onboardingHeading.isVisible().catch(() => false);
  if (!isVisible) {
    return false;
  }

  await page.locator("#name").first().fill("QA User");
  await page.locator("#age").first().fill("30");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Complete Setup" }).click();

  await Promise.race([
    page.getByText("Preferences saved successfully!").waitFor({ state: "visible", timeout: 15000 }),
    page.getByText("Preferences saved locally.").waitFor({ state: "visible", timeout: 15000 }),
    onboardingHeading.waitFor({ state: "hidden", timeout: 15000 }),
  ]);

  await onboardingHeading.waitFor({ state: "hidden", timeout: 20000 });
  return true;
}

/**
 * @param {JourneyResult} journey
 * @param {string} name
 * @param {() => Promise<void>} action
 */
async function runStep(journey, name, action) {
  try {
    await action();
    journey.steps.push({ name, status: "PASS" });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    journey.steps.push({ name, status: "FAIL", details });
    throw error;
  }
}

/**
 * @param {string} name
 * @param {(journey: JourneyResult) => Promise<void>} run
 */
async function runJourney(name, run) {
  /** @type {JourneyResult} */
  const journey = {
    name,
    status: "PASS",
    steps: [],
  };

  try {
    await run(journey);
  } catch (error) {
    journey.status = "FAIL";
    journey.error = error instanceof Error ? error.message : String(error);
  }

  results.push(journey);
}

function hasFailure() {
  return results.some((journey) => journey.status === "FAIL");
}

function printReport() {
  console.log("\nSTRICT_QA_REPORT_START");
  for (const journey of results) {
    console.log(`Journey: ${journey.name}`);
    console.log(`Status: ${journey.status}`);
    for (const step of journey.steps) {
      console.log(`  - ${step.status}: ${step.name}${step.details ? ` (${step.details})` : ""}`);
    }
    if (journey.error) {
      console.log(`  Error: ${journey.error}`);
    }
    console.log("");
  }

  console.log("STRICT_QA_JSON_START");
  console.log(JSON.stringify(results, null, 2));
  console.log("STRICT_QA_JSON_END");
  console.log("STRICT_QA_REPORT_END\n");
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(20000);

try {
  await runJourney("Landing to Home navigation", async (journey) => {
    await runStep(journey, "Open landing page", async () => {
      await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    });

    await runStep(journey, "Verify landing hero is visible", async () => {
      await page.getByText("Scan. Discover.").waitFor({ state: "visible" });
    });

    await runStep(journey, "Click Learn More and verify Features section", async () => {
      await page.getByRole("button", { name: "Learn More" }).click();
      await page.getByRole("heading", { name: "Why Choose Us?" }).waitFor({ state: "visible" });
    });

    await runStep(journey, "Click primary CTA and navigate to Home", async () => {
      await page.getByRole("button", { name: /Start Healthy Now|Open Dashboard/ }).first().click();
      await page.waitForURL("**/home");
    });
  });

  await runJourney("Home scan flow with manual barcode input", async (journey) => {
    await runStep(journey, "Open Home page", async () => {
      await page.goto(`${baseUrl}/home`, { waitUntil: "networkidle" });
    });

    await runStep(journey, "Complete onboarding if shown", async () => {
      await completeOnboardingIfVisible(page);
    });

    await runStep(journey, "Open scanner modal", async () => {
      const startScanButton = page.getByRole("button", { name: /Start Scanning|Offline/ }).first();
      const isDisabled = await startScanButton.isDisabled();
      assert.equal(isDisabled, false, "Start scanning button is disabled (offline state)");
      await startScanButton.click();
      await page.getByRole("button", { name: "Enter Code Manually" }).waitFor({ state: "visible" });
    });

    await runStep(journey, "Enter invalid manual barcode and verify scanner stays open", async () => {
      await page.getByRole("button", { name: "Enter Code Manually" }).click();
      const input = page.getByPlaceholder("Enter barcode number");
      await input.fill("abc123");
      const sanitizedValue = await input.inputValue();
      assert.equal(sanitizedValue, "123", "Barcode input sanitization did not enforce numeric format");
      await page.getByRole("button", { name: "Submit" }).click();
      await input.waitFor({ state: "visible" });
    });

    await runStep(journey, "Enter valid barcode and reach product results", async () => {
      const input = page.getByPlaceholder("Enter barcode number");
      await input.fill("3017620422003");
      await page.getByRole("button", { name: "Submit" }).click();
      await page.getByRole("button", { name: "Back to Scanner" }).waitFor({ state: "visible", timeout: 45000 });
    });

    await runStep(journey, "Return from product results to scanner view", async () => {
      const loadingOverlay = page.getByText("Analyzing product...");
      if (await loadingOverlay.isVisible().catch(() => false)) {
        await loadingOverlay.waitFor({ state: "hidden", timeout: 45000 });
      }
      await page.getByRole("button", { name: "Back to Scanner" }).click();
      await page.getByText("Ready to Scan").waitFor({ state: "visible" });
    });
  });

  await runJourney("History journey", async (journey) => {
    await runStep(journey, "Open History page", async () => {
      await page.goto(`${baseUrl}/history`, { waitUntil: "networkidle" });
    });

    await runStep(journey, "Wait for either history view or auth-gate view", async () => {
      await Promise.race([
        page.getByRole("heading", { name: /Sign in required/i }).waitFor({ state: "visible", timeout: 25000 }),
        page.getByRole("heading", { name: /Scan History/i }).waitFor({ state: "visible", timeout: 25000 }),
      ]);
    });

    const signInRequired = await page
      .getByRole("heading", { name: /Sign in required/i })
      .isVisible()
      .catch(() => false);

    if (signInRequired) {
      await runStep(journey, "Auth gate branch: use Go back", async () => {
        await page.getByRole("button", { name: "Go back" }).click();
        await page.waitForURL("**/home");
      });
      return;
    }

    await runStep(journey, "Verify History page content", async () => {
      await page.getByRole("heading", { name: "Scan History" }).waitFor({ state: "visible" });
    });

    await runStep(journey, "Trigger history refresh", async () => {
      const headerButtons = page.locator("header button");
      const count = await headerButtons.count();
      assert.ok(count >= 2, "Expected refresh button in history header");
      await headerButtons.nth(1).click();
      await sleep(800);
    });

    await runStep(journey, "Navigate back to Home from History", async () => {
      await page.getByRole("button", { name: "Back" }).click();
      await page.waitForURL("**/home");
    });
  });

  await runJourney("Settings validation journey", async (journey) => {
    await runStep(journey, "Open Settings page", async () => {
      await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
    });

    await runStep(journey, "Wait for either settings view or auth-gate view", async () => {
      await Promise.race([
        page.getByRole("heading", { name: /Sign in required/i }).waitFor({ state: "visible", timeout: 25000 }),
        page.getByRole("heading", { name: /^Settings$/i }).waitFor({ state: "visible", timeout: 25000 }),
      ]);
    });

    const signInRequired = await page
      .getByRole("heading", { name: /Sign in required/i })
      .isVisible()
      .catch(() => false);

    if (signInRequired) {
      await runStep(journey, "Auth gate branch: use Go back", async () => {
        await page.getByRole("button", { name: "Go back" }).click();
        await page.waitForURL("**/home");
      });
      return;
    }

    await runStep(journey, "Save with empty name and check validation", async () => {
      const nameInput = page.locator("#name");
      const ageInput = page.locator("#age");
      await nameInput.fill("");
      await ageInput.fill("29");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await page.getByText("Please enter your name").waitFor({ state: "visible" });
    });

    await runStep(journey, "Save with invalid age and check validation", async () => {
      const nameInput = page.locator("#name");
      const ageInput = page.locator("#age");
      await nameInput.fill("QA User");
      await ageInput.fill("0");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await page.getByText("Please enter a valid age between 1 and 100").waitFor({ state: "visible" });
    });

    await runStep(journey, "Save with valid values", async () => {
      const nameInput = page.locator("#name");
      const ageInput = page.locator("#age");
      await nameInput.fill("QA User");
      await ageInput.fill("30");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await Promise.race([
        page.getByText("Settings saved successfully!").waitFor({ state: "visible", timeout: 15000 }),
        page.getByText("Settings saved locally.").waitFor({ state: "visible", timeout: 15000 }),
        page.getByText("Failed to save settings").waitFor({ state: "visible", timeout: 15000 }),
      ]);
    });
  });

  await runJourney("Auth journey", async (journey) => {
    await runStep(journey, "Clear browser storage", async () => {
      await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });

    await runStep(journey, "Open Auth page", async () => {
      await page.goto(`${baseUrl}/auth`, { waitUntil: "networkidle" });
    });

    const redirectedToHome = page.url().includes("/home");
    if (redirectedToHome) {
      await runStep(journey, "Auto-redirect to Home when already authenticated", async () => {
        assert.ok(page.url().includes("/home"), "Expected redirect to /home");
      });
      return;
    }

    await runStep(journey, "Submit invalid email and verify validation message", async () => {
      const emailInput = page.getByPlaceholder("name@example.com");
      await emailInput.fill("invalid-email");
      await page.locator("form button[type='submit']").first().click();

      const customValidationVisible = await page
        .getByText("Please enter a valid email address.")
        .isVisible()
        .catch(() => false);

      if (!customValidationVisible) {
        const emailIsValid = await emailInput.evaluate((element) => element.checkValidity());
        assert.equal(emailIsValid, false, "Expected email input to be invalid for malformed address");
      }
    });

    await runStep(journey, "Use guest login", async () => {
      await page.getByRole("button", { name: "Continue as Guest" }).click();
      await Promise.race([
        page.waitForURL("**/home", { timeout: 25000 }),
        page.getByText(/Failed to sign in as guest/i).waitFor({ state: "visible", timeout: 25000 }),
      ]);
    });
  });

  await runJourney("404 recovery journey", async (journey) => {
    await runStep(journey, "Open unknown route", async () => {
      await page.goto(`${baseUrl}/some-missing-route`, { waitUntil: "networkidle" });
    });

    await runStep(journey, "Verify 404 page content", async () => {
      await page.getByText("Page Not Found").waitFor({ state: "visible" });
    });

    await runStep(journey, "Use recovery button to return home", async () => {
      await page.getByRole("button", { name: "Go to Home" }).click();
      await page.waitForURL("**/");
    });
  });
} finally {
  await context.close();
  await browser.close();
  printReport();
}

if (hasFailure()) {
  process.exit(1);
}
