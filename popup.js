document.addEventListener("DOMContentLoaded", () => {
  const $interval = document.getElementById("interval");
  const $status = document.getElementById("status");

  chrome.storage.local.get(["interval"], (res) => {
    $interval.value = res.interval || 3;
  });

  document.getElementById("saveBtn").onclick = () => {
    const interval = Number($interval.value);

    chrome.storage.local.set({ interval }, () => {
      $status.textContent = "Сохранено!";
      setTimeout(() => ($status.textContent = ""), 1500);

      // ← отправляем команду background.js
      chrome.runtime.sendMessage({ action: "restartTimer" });
    });
  };
});
