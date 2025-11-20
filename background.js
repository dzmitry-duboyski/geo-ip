const API_URL = "https://ipinfo.io/json?token=xxxxxxxxx";
const DEFAULT_INTERVAL_SEC = 3;

let lastCountry = null;
let updateTimer = null;

/*  Проигрывание звукового сигнала */
function playAlertSound() {
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
}

/*  Основное обновление IP + иконка */
async function updateIPInfo() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("HTTP error");

    const data = await res.json();
    const country = data.country;
    const ip = data.ip;

    console.log("Получена страна:", country);

    /*  Проверка изменения страны */
    if (lastCountry && lastCountry !== country) {
      console.log(`Страна изменилась: ${lastCountry} → ${country}`);
      playAlertSound();
    }

    /* обновляем lastCountry */
    lastCountry = country;
    chrome.storage.local.set({ lastCountry: country });

    const iconPath = `icons/${country.toLowerCase()}.png`;
    console.log("Ставим иконку:", iconPath);

    chrome.action.setIcon({ path: iconPath });
    chrome.action.setTitle({
      title: `Страна: ${country}\nIP: ${ip}`
    });

  } catch (e) {
    console.warn("Ошибка:", e);
    chrome.action.setIcon({ path: "icons/error.png" });
    chrome.action.setTitle({ title: "Ошибка получения IP" });
  }
}

/*  Запуск таймера */
function startTimer() {
  chrome.storage.local.get(["interval"], (res) => {
    const intervalSec = res.interval || DEFAULT_INTERVAL_SEC;

    console.log("Запуск таймера с интервалом:", intervalSec, "секунд");

    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(updateIPInfo, intervalSec * 1000);

    updateIPInfo(); // обновление сразу
  });
}

/*  Вспомогательная логика */
function restoreLastCountry() {
  chrome.storage.local.get(["lastCountry"], (res) => {
    lastCountry = res.lastCountry || null;
    console.log("Восстановлена lastCountry:", lastCountry);
  });
}

/*  Инициализация */
chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled");
  restoreLastCountry();
  chrome.storage.local.set({ interval: DEFAULT_INTERVAL_SEC });
  startTimer();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("onStartup");
  restoreLastCountry();
  startTimer();
});

/*  Перезапуск по запросу из popup */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "restartTimer") {
    console.log("Перезапуск таймера из popup");
    startTimer();
  }
});
