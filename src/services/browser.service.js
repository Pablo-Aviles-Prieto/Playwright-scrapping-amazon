const { chromium } = require('playwright');

// You could use a browserless paid service in case your machine overloads with multiple simultaneous requests.
const getBrowser = () =>
  chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
    chromiumSandbox: false,
  });

module.exports = getBrowser;
