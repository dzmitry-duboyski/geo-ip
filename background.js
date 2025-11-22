const API_URL = "https://ipinfo.io/json?token=xxxxxxxxx";
const DEFAULT_INTERVAL_SEC = 3;

let lastCountry = null;
let updateTimer = null;
let extensionEnabled = true;

/* Play alert sound */
function playAlertSound() {
  // Check if audio alert is enabled
  chrome.storage.local.get(["audioAlert"], (res) => {
    const audioAlertEnabled = res.audioAlert !== false;
    
    if (!audioAlertEnabled) {
      console.log("Audio alert is disabled");
      return;
    }

    chrome.tts.speak(
      "Info. Country has changed",
      {
        lang: "en-US",
        rate: 1.0
      },
      () => {
        if (chrome.runtime.lastError) {
          console.warn("TTS error:", chrome.runtime.lastError.message);
        }
      }
    );
  });
}

/* Main IP update + icon */
async function updateIPInfo() {
  // If extension is disabled, skip update
  if (!extensionEnabled) {
    console.log("Extension is disabled, skipping update");
    return;
  }

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("HTTP error");

    const data = await res.json();
    const country = data.country;
    const ip = data.ip;

    console.log("Country received:", country);

    /* Check for country change */
    if (lastCountry && lastCountry !== country) {
      console.log(`Country changed: ${lastCountry} → ${country}`);
      playAlertSound();
    }

    /* Update lastCountry */
    lastCountry = country;
    chrome.storage.local.set({ 
      lastCountry: country,
      currentIP: ip,
      currentCountry: country
    });

    const iconPath = `icons/${country.toLowerCase()}.png`;
    console.log("Setting icon:", iconPath);

    chrome.action.setIcon({ path: iconPath });
    chrome.action.setTitle({
      title: `Country: ${country}\nIP: ${ip}`
    });

    // Update popup if it's open
    chrome.runtime.sendMessage({ 
      action: "updatePopup", 
      ip: ip, 
      country: country 
    }).catch(() => {
      // Popup may be closed, ignore error
    });

  } catch (e) {
    console.warn("Error:", e);
    chrome.action.setIcon({ path: "icons/error.png" });
    chrome.action.setTitle({ title: "Error fetching IP" });
  }
}

/* Start timer */
function startTimer() {
  chrome.storage.local.get(["interval", "extensionEnabled"], (res) => {
    const intervalSec = res.interval || DEFAULT_INTERVAL_SEC;
    extensionEnabled = res.extensionEnabled !== false;

    console.log("Starting timer with interval:", intervalSec, "seconds");
    console.log("Extension enabled:", extensionEnabled);

    if (updateTimer) clearInterval(updateTimer);
    
    if (extensionEnabled) {
      updateTimer = setInterval(updateIPInfo, intervalSec * 1000);
      updateIPInfo(); // Update immediately
    }
  });
}

/* Stop timer */
function stopTimer() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
    console.log("Timer stopped");
  }
}

/* Restore last country helper */
function restoreLastCountry() {
  chrome.storage.local.get(["lastCountry"], (res) => {
    lastCountry = res.lastCountry || null;
    console.log("Restored lastCountry:", lastCountry);
  });
}

/* Initialization */
chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled");
  restoreLastCountry();
  chrome.storage.local.set({ 
    interval: DEFAULT_INTERVAL_SEC,
    extensionEnabled: true,
    audioAlert: true
  });
  startTimer();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("onStartup");
  restoreLastCountry();
  startTimer();
});

/* Handle messages from popup */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "restartTimer") {
    console.log("Restarting timer from popup");
    startTimer();
  } else if (msg.action === "enableExtension") {
    console.log("Enabling extension");
    extensionEnabled = true;
    chrome.storage.local.set({ extensionEnabled: true });
    startTimer();
  } else if (msg.action === "disableExtension") {
    console.log("Disabling extension");
    extensionEnabled = false;
    chrome.storage.local.set({ extensionEnabled: false });
    stopTimer();
    // Set default icon
    chrome.action.setIcon({ path: "icons/error.png" });
    chrome.action.setTitle({ title: "IP Country Flag (Disabled)" });
  }
});