'use strict';

const { join } = require('path');

/**
 * Install Puppeteer's Chromium into a project-local folder instead of the
 * per-user OS cache. This lets electron-builder bundle the browser into the
 * packaged app (via `extraResources`), so it works on machines that have
 * never run Puppeteer — on macOS, Windows and Linux alike.
 *
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.puppeteer-cache'),
};
