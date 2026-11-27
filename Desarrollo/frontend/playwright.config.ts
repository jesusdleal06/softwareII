import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineConfig, devices, webkit } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4291';

/** The cross-browser compatibility spec runs in every project; the RF suite and the a11y suite stay in the default project. */
const COMPAT_SPECS = ['**/rnf01-compatibility.spec.ts'];

/**
 * WebKit's bundled Linux build links against ICU 74. On a host that only ships a
 * newer ICU the browser cannot start (`libicui18n.so.74: cannot open shared object
 * file`), which would fail every WebKit test before a single assertion runs. Detect
 * that up front so the suite stays green, and say so loudly instead of silently
 * dropping the two WebKit projects. Set E2E_FORCE_WEBKIT=1 to always register them.
 */
function webkitRunnable(): boolean {
  if (process.env.E2E_FORCE_WEBKIT === '1') return true;
  try {
    const binary = join(dirname(webkit.executablePath()), 'minibrowser-wpe', 'bin', 'MiniBrowser');
    if (!existsSync(binary)) return true; // let Playwright surface its own error
    const ldd = execFileSync('ldd', [binary], { encoding: 'utf8' });
    return !ldd.includes('not found');
  } catch {
    return true; // unknown: let Playwright try and fail loudly
  }
}

const webkitAvailable = webkitRunnable();
if (!webkitAvailable) {
  console.warn(
    '[playwright] WebKit projects skipped: the bundled build needs ICU 74 (libicui18n.so.74), ' +
      'which this host does not provide. Install it (Ubuntu: libicu74) or set E2E_FORCE_WEBKIT=1 to force them.',
  );
}

const mobile = { viewport: { width: 360, height: 640 } } as const;
const desktop = { viewport: { width: 1366, height: 768 } } as const;

const webkitProjects = webkitAvailable
  ? [
      {
        name: 'webkit-desktop',
        use: { ...devices['Desktop Safari'], ...desktop },
        testMatch: COMPAT_SPECS,
      },
      {
        name: 'webkit-mobile',
        use: { ...devices['Desktop Safari'], ...mobile },
        testMatch: COMPAT_SPECS,
      },
    ]
  : [];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 90_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    // Default project: runs the whole suite (RF + RNF) on desktop Chromium.
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], ...desktop },
    },
    // The remaining projects only run the cross-browser compatibility spec.
    {
      name: 'chromium-mobile',
      use: { ...devices['Desktop Chrome'], ...mobile },
      testMatch: COMPAT_SPECS,
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'], ...desktop },
      testMatch: COMPAT_SPECS,
    },
    {
      name: 'firefox-mobile',
      use: { ...devices['Desktop Firefox'], ...mobile },
      testMatch: COMPAT_SPECS,
    },
    ...webkitProjects,
  ],
});
