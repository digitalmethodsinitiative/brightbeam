'use strict';

async function checkFirstRun() {

  if (await store.isFirstRun()) {
    browser.tabs.create({url: 'first-run.html'});
  }
}

checkFirstRun();

async function runBrightbeam() {
  // Checks to see if Brightbeam is already open.
  // Returns true if it is, false if not.
  async function isOpen() {
    const tabs = await browser.tabs.query({});
    const fullUrl = browser.extension.getURL('index.html');
    const brightbeamTabs = tabs.filter((tab) => {
      return (tab.url === fullUrl);
    });
    return brightbeamTabs[0] || false;
  }

  const brightbeamTab = await isOpen();
  if (!brightbeamTab) {
    // only open a new Brightbeam instance if one isn't already open.
    browser.tabs.create({ url: 'index.html' });
  } else if (!brightbeamTab.active) {
     // re-focus Brightbeam if it is already open but lost focus
    browser.tabs.update(brightbeamTab.id, {active: true});
  }
}

// When the user clicks browserAction icon in toolbar, run Brightbeam
browser.browserAction.onClicked.addListener(runBrightbeam);
