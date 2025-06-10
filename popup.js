// popup.js
import { getZipBlob } from './lib/indexeddb.js';


document.addEventListener("DOMContentLoaded", async () => {
  const { status, zipName } = await getZipStatus();

  const deckName = zipName
  if (status)
  {
    if (status === "ZIP_READY") {
      await downloadZip(deckName);
    }
    else if (status === "ZIP_BUILDING") {
      progressContainer.style.display = "block";
      progressText.textContent = "正在壓縮牌組...";
    }
  }
  else
  {
    console.log("Status undefined : "+ status);
  }

});



document.addEventListener("DOMContentLoaded", () => {
  const fetchButton = document.getElementById("fetch-deck");
  const progressContainer = document.getElementById("progress-container");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

  fetchButton.addEventListener("click", async () => {
    console.log("clicked")
    const { status, zipName } = await getZipStatus();
    if (!status) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: "start_fetch" });
    }


  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "progress") {
      const { completed, total } = message;
      const percent = (completed / total) * 100;
      progressContainer.style.display = "block";
      progressFill.style.width = `${percent}%`;
      progressText.textContent = `${completed} / ${total}`;
    }
    else if (message.action === "ZIP_BUILDING") {
      // 顯示提示：正在壓縮中
      progressText.textContent = "正在壓縮牌組...";
    }
  });
});


// 接收壓縮完成訊息
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'ZIP_READY') {
    console.log("收到ZIP ready");
    downloadZip(message.name);
  }
});

async function getZipStatus() {
  const { status, zipName } = await chrome.storage.local.get(["zipStatus", "zipName"]);
  return { status: status || null, zipName: zipName || null };

}

async function downloadZip(deckName) {
  try {
    const blob = await getZipBlob(deckName);
    if (!blob) {
      console.warn("ZIP blob 尚未就緒");
      return;
    }
    console.log("取得zip blob");
    console.log("ZIP blob type:", blob, typeof blob);
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url,
      filename: `${deckName || 'deck'}.zip`,
      saveAs: true
    }, () => {
      URL.revokeObjectURL(url); // Optional: 清理資源
    });
    console.log("下載完成");
    clearZipStatus();
  } catch (err) {
    console.error("下載錯誤：", err);
  }
}

function clearZipStatus()
{
	chrome.storage.local.remove(["zipStatus", "zipName"]);
}