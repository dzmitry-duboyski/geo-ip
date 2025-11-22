document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const $extensionToggle = document.getElementById("extensionToggle");
  const $ipValue = document.getElementById("ipValue");
  const $countryValue = document.getElementById("countryValue");
  const $copyBtn = document.getElementById("copyBtn");
  const $settingsHeader = document.getElementById("settingsHeader");
  const $settingsContent = document.getElementById("settingsContent");
  const $intervalInput = document.getElementById("intervalInput");
  const $audioAlertInput = document.getElementById("audioAlertInput");
  const $saveBtn = document.getElementById("saveBtn");
  const $statusMessage = document.getElementById("statusMessage");
  const $arrow = $settingsHeader.querySelector(".arrow");

  let currentIP = "";

  // Load version from manifest
  const manifest = chrome.runtime.getManifest();
  const $footer = document.getElementById("footer");
  $footer.innerHTML = `v${manifest.version} | Made with <span style="color: #e74c3c;">❤</span> love`;

  // Initialize: load extension state
  chrome.storage.local.get(["extensionEnabled", "interval", "audioAlert", "currentIP", "currentCountry"], (res) => {
    // Extension state (enabled by default)
    const isEnabled = res.extensionEnabled !== false;
    $extensionToggle.checked = isEnabled;

    // Update interval
    $intervalInput.value = res.interval || 3;

    // Audio alert (enabled by default)
    $audioAlertInput.checked = res.audioAlert !== false;

    // IP and country
    if (res.currentIP) {
      currentIP = res.currentIP;
      $ipValue.innerHTML = `<span class="ip-clickable">${res.currentIP}</span>`;
      $copyBtn.disabled = false;
    }

    if (res.currentCountry) {
      $countryValue.innerHTML = `<span>${res.currentCountry}</span>`;
    }
  });

  // Extension toggle
  $extensionToggle.addEventListener("change", (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ extensionEnabled: isEnabled }, () => {
      // Send command to background.js for enabling/disabling
      chrome.runtime.sendMessage({ 
        action: isEnabled ? "enableExtension" : "disableExtension" 
      });
      
      showStatusMessage(isEnabled ? "Extension enabled" : "Extension disabled");
    });
  });

  // Copy IP to clipboard (button click)
  $copyBtn.addEventListener("click", async () => {
    await copyIPToClipboard();
  });

  // Copy IP to clipboard (click on IP address)
  $ipValue.addEventListener("click", async (e) => {
    if (e.target.classList.contains("ip-clickable")) {
      await copyIPToClipboard();
    }
  });

  // Function to copy IP to clipboard
  async function copyIPToClipboard() {
    if (!currentIP) return;

    try {
      await navigator.clipboard.writeText(currentIP);
      
      // Visual feedback on button
      $copyBtn.textContent = "Copied!";
      $copyBtn.classList.add("copied");
      
      setTimeout(() => {
        $copyBtn.textContent = "Copy";
        $copyBtn.classList.remove("copied");
      }, 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
      $copyBtn.textContent = "Error";
      setTimeout(() => {
        $copyBtn.textContent = "Copy";
      }, 1500);
    }
  }

  // Collapse/expand settings
  $settingsHeader.addEventListener("click", () => {
    const isOpen = $settingsContent.classList.contains("open");
    
    if (isOpen) {
      $settingsContent.classList.remove("open");
      $arrow.classList.remove("open");
    } else {
      $settingsContent.classList.add("open");
      $arrow.classList.add("open");
    }
  });

  // Save settings
  $saveBtn.addEventListener("click", () => {
    const interval = Number($intervalInput.value);
    const audioAlert = $audioAlertInput.checked;

    if (interval < 1 || interval > 3600) {
      showStatusMessage("Invalid interval value!", "error");
      return;
    }

    chrome.storage.local.set({ interval, audioAlert }, () => {
      showStatusMessage("Settings saved successfully!");

      // Send command to background.js to restart timer
      chrome.runtime.sendMessage({ action: "restartTimer" });
    });
  });

  // Show status message function
  function showStatusMessage(message, type = "success") {
    $statusMessage.textContent = message;
    $statusMessage.style.background = type === "error" ? "#f8d7da" : "#d4edda";
    $statusMessage.style.color = type === "error" ? "#721c24" : "#155724";
    $statusMessage.classList.add("show");

    setTimeout(() => {
      $statusMessage.classList.remove("show");
    }, 2000);
  }

  // Listen for updates from background.js
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "updatePopup") {
      if (msg.ip) {
        currentIP = msg.ip;
        $ipValue.innerHTML = `<span class="ip-clickable">${msg.ip}</span>`;
        $copyBtn.disabled = false;
      }
      
      if (msg.country) {
        $countryValue.innerHTML = `<span>${msg.country}</span>`;
      }
    }
  });
});