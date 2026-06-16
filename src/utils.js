'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Resolve the directory where user data (config + logs) should live.
 *
 * - Inside a packaged Electron app the install directory is read-only on
 *   macOS/Linux, so we must write to the per-user app-data directory.
 * - When run as a plain Node CLI (or in development) we keep everything next
 *   to the project for convenience.
 *
 * @returns {string} absolute path to a writable data directory
 */
function resolveDataDir() {
  // Detect Electron without a hard dependency (the CLI scripts run under
  // plain Node where `electron` cannot be required as a runtime module).
  if (process.versions && process.versions.electron) {
    try {
      const { app } = require('electron');
      // Only redirect to per-user app-data for PACKAGED apps, where the install
      // dir is read-only. In dev (`npm start`) keep data in the project root so
      // the GUI and the CLI scripts share the same config.json.
      if (app && app.isPackaged) {
        const dir = app.getPath('userData');
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      }
    } catch {
      // Not in the main process (or electron unavailable) — fall through.
    }
  }
  // Project root: scripts live in src/, data sits one level up.
  return path.join(__dirname, '..');
}

const DATA_DIR = resolveDataDir();
const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const GIFT_LOG_PATH = path.join(DATA_DIR, 'gift_log.txt');
const RESULTS_LOG_PATH = path.join(DATA_DIR, 'login_test_results.txt');
const TEMP_USER_PATH = path.join(os.tmpdir(), 'filelist-getgift-user-test.json');

// Where Puppeteer's Chromium lives / will be downloaded at first run.
const BROWSER_CACHE_DIR = path.join(DATA_DIR, '.puppeteer-cache');

/**
 * Find the Chromium executable that Puppeteer downloaded into `.puppeteer-cache`.
 *
 * In a packaged Electron app the cache is shipped under `resourcesPath`; in
 * development it sits in the project root. We walk the standard
 * `<cache>/chrome/<build>/chrome-<platform>/<binary>` layout and return the
 * first matching binary for the current OS, or `null` if none is bundled
 * (in which case Puppeteer falls back to its own cache resolution).
 *
 * @param {string[]} [searchRoots] - directories that may contain `.puppeteer-cache`
 * @returns {string | null}
 */
function findBundledChromium(searchRoots = []) {
  const roots = [
    ...searchRoots,
    // Browser downloaded on first run into the writable per-user data dir.
    BROWSER_CACHE_DIR,
    // Browser shipped inside a packaged app (if bundling was enabled).
    process.resourcesPath ? path.join(process.resourcesPath, '.puppeteer-cache') : null,
    // Development: project-local cache from `npm install`.
    path.join(__dirname, '..', '.puppeteer-cache'),
  ].filter(Boolean);

  const binaryByPlatform = {
    win32: ['chrome.exe'],
    darwin: ['Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome'],
    linux: ['chrome'],
  };
  const binaries = binaryByPlatform[process.platform] || ['chrome'];

  for (const root of roots) {
    const chromeDir = path.join(root, 'chrome');
    if (!fs.existsSync(chromeDir)) continue;

    for (const build of fs.readdirSync(chromeDir)) {
      const platformDir = path.join(chromeDir, build);
      let inner;
      try {
        inner = fs.readdirSync(platformDir);
      } catch {
        continue;
      }
      for (const sub of inner) {
        for (const binary of binaries) {
          const candidate = path.join(platformDir, sub, binary);
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    }
  }
  return null;
}

/**
 * Ensure a Chromium build is available, downloading it on first run if needed.
 *
 * Keeping Chromium out of the installer (and fetching it once into the writable
 * per-user data dir) keeps the packaged app small. If a browser is already
 * present (dev cache, bundled, or previously downloaded) this is a no-op.
 *
 * @param {(line: string) => void} [logger]
 * @returns {Promise<string>} absolute path to the Chromium executable
 */
async function ensureBrowser(logger = () => {}) {
  const existing = findBundledChromium();
  if (existing) return existing;

  // Lazily required so plain unit tests don't pull in the installer.
  const {
    install,
    resolveBuildId,
    detectBrowserPlatform,
    Browser,
  } = require('@puppeteer/browsers');
  const { PUPPETEER_REVISIONS } = require('puppeteer-core/internal/revisions.js');

  const buildId =
    PUPPETEER_REVISIONS?.chrome ||
    (await resolveBuildId(Browser.CHROME, detectBrowserPlatform(), 'stable'));

  logger(`Downloading Chromium (${buildId})… this happens only once.`);
  fs.mkdirSync(BROWSER_CACHE_DIR, { recursive: true });

  const installed = await install({
    browser: Browser.CHROME,
    buildId,
    cacheDir: BROWSER_CACHE_DIR,
    downloadProgressCallback: (downloaded, total) => {
      if (total) {
        const pct = Math.round((downloaded / total) * 100);
        if (pct % 25 === 0) logger(`Chromium download: ${pct}%`);
      }
    },
  });

  logger('Chromium ready.');
  return installed.executablePath;
}

/**
 * Pause execution for a given number of milliseconds.
 * Replacement for the deprecated/removed `page.waitForTimeout`.
 *
 * @param {number} ms - milliseconds to wait
 * @returns {Promise<void>}
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Build the Puppeteer launch options for the current platform.
 *
 * The sandbox flags differ per OS: Linux frequently needs `--no-sandbox`
 * (especially in CI/containers and AppImage), while they are harmless on
 * macOS/Windows. We also point Puppeteer at a bundled/known Chromium when a
 * cache path is provided via env, so packaged apps work without a system Chrome.
 *
 * @param {object} [options]
 * @param {string[]} [options.extraArgs] - additional Chrome flags to append
 * @param {object} [options.extra] - extra fields merged into the launch options
 * @returns {import('puppeteer').LaunchOptions}
 */
function getLaunchOptions({ extraArgs = [], extra = {} } = {}) {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ];

  // Windows occasionally needs this to avoid a blank-screen GPU bug.
  if (process.platform === 'win32') {
    args.push('--disable-features=VizDisplayCompositor');
  }

  args.push(...extraArgs);

  const options = {
    headless: 'new',
    args,
    timeout: 30000,
    ...extra,
  };

  // Resolve the Chrome binary in priority order:
  //   1. explicit env override (PUPPETEER_EXECUTABLE_PATH)
  //   2. a Chromium bundled with the packaged app (.puppeteer-cache)
  //   3. Puppeteer's own default resolution (left unset)
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const executablePath = envPath && fs.existsSync(envPath) ? envPath : findBundledChromium();
  if (executablePath) {
    options.executablePath = executablePath;
  }

  return options;
}

/**
 * Load and validate the user config from a JSON file.
 * Avoids `require()` so the file is always read fresh (no module cache)
 * and parse/shape errors surface as clear messages.
 *
 * @param {string} [configPath] - absolute path to the config file
 * @returns {Array<{username: string, password: string}>}
 * @throws {Error} when the file is missing, invalid JSON, or wrong shape
 */
function loadUsers(configPath = CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    throw new Error(`Config file is not valid JSON (${configPath}): ${err.message}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Config must be a non-empty array of { username, password } objects.');
  }

  for (const [i, user] of parsed.entries()) {
    if (!user || typeof user.username !== 'string' || typeof user.password !== 'string') {
      throw new Error(`Config entry #${i + 1} is missing a valid username/password.`);
    }
  }

  return parsed;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

module.exports = {
  sleep,
  loadUsers,
  getLaunchOptions,
  findBundledChromium,
  ensureBrowser,
  resolveDataDir,
  BROWSER_CACHE_DIR,
  USER_AGENT,
  DATA_DIR,
  PROJECT_ROOT,
  CONFIG_PATH,
  GIFT_LOG_PATH,
  RESULTS_LOG_PATH,
  TEMP_USER_PATH,
};
