// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const fetchButton = document.getElementById("fetch-deck");
  const progressContainer = document.getElementById("progress-container");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

  fetchButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "progress") {
      const { completed, total } = message;
      const percent = (completed / total) * 100;
      progressContainer.style.display = "block";
      progressFill.style.width = `${percent}%`;
      progressText.textContent = `${completed} / ${total}`;
    }
  });
});


// 接收壓縮完成訊息
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === 'ZIP_READY') {
    chrome.storage.local.get(['zipData', 'zipName'], (items) => {
      const blob = dataURLToBlob(items.zipData);
      const blobUrl = URL.createObjectURL(blob);

      chrome.downloads.download({
        url: blobUrl,
        filename: items.zipName,
        saveAs: true
      });
    });
  }
});

// 工具函式：將 base64 轉回 Blob
function dataURLToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}