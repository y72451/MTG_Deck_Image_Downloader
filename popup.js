// popup.js
import { getZipBlob } from './lib/indexeddb.js';

function sanitizeName(name) {
  return (name || 'deck')
    .replace(/[<>:"/\\|?*]+/g, "_")        // Windows 不允許字元
    .replace(/[\u0000-\u001F\u007F]/g, "_") // 控制字元
    .replace(/[. ]+$/g, "_")                  // 結尾是空白或點
    .slice(0, 180);                             // 預留副檔名空間，避免過長
}

// 以單一 progress-text 顯示進度與 keep-alive 秒數
let pingSeconds = 0;
let pingTimerId = null;

function startPingUI() {
  if (pingTimerId) return;
  pingSeconds = 0;
  pingTimerId = setInterval(() => {
    pingSeconds++;
    updateProgressLabel();
  }, 1000);
}

function stopPingUI() {
  if (pingTimerId) {
    clearInterval(pingTimerId);
    pingTimerId = null;
  }
}

// 動態文字更新：優先顯示 progress，沒有就顯示壓縮中 + 秒數
let lastProgress = { completed: 0, total: 0 };
function updateProgressState(completed, total) {
  lastProgress = { completed, total };
  updateProgressLabel();
}

function updateProgressLabel(statusText) {
  const progressText = document.getElementById("progress-text");
  if (!progressText) return;

  if (statusText) {
    progressText.textContent = statusText;
    return;
  }

  const { completed, total } = lastProgress || {};
  if (total && total > 0) {
    progressText.textContent = `${completed} / ${total}`;
  } else {
    progressText.textContent = `正在壓縮牌組...（${pingSeconds} 秒）`;
  }
}

document.getElementById("ExtraTextOption").addEventListener("change", (e) => {
  const selected = e.target.value;
  const customDiv = document.getElementById("CustomInput");
  customDiv.style.display = selected === "Custom" ? "block" : "none";
});

document.addEventListener("DOMContentLoaded", async () => {
  const { status, zipName } = await getZipStatus();

  const deckName = zipName
  if (status)
  {
    if (status === "ZIP_READY") {
      console.log("Get ZIP_READY");
      updateProgressLabel("壓縮完成，準備下載...");
      stopPingUI();
      await downloadZip(deckName);
    }
    else if (status === "ZIP_BUILDING") {
      console.log("Get ZIP_BUILDING");
      const progressContainer = document.getElementById("progress-container");
      const progressText = document.getElementById("progress-text");
      progressContainer.style.display = "block";
      updateProgressLabel("正在壓縮牌組...");
      startPingUI();
      lastProgress = { completed: 0, total: 0 };
      updateProgressLabel();
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
      const extraTextOption = getExtraTextOption();
      chrome.runtime.sendMessage({ action: "start_fetch", extraTextOption });
    }


  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "progress") {
      const { completed, total } = message;
      const percent = (completed / total) * 100;
      progressContainer.style.display = "block";
      progressFill.style.width = `${percent}%`;
      updateProgressState(completed, total);
    }
    else if (message.action === "ZIP_BUILDING") {
      // 顯示提示：正在壓縮中
      progressContainer.style.display = "block";
      progressText.textContent = "正在壓縮牌組...";
      startPingUI();
      lastProgress = { completed: 0, total: 0 };
      updateProgressLabel();
    }
  });
});


// 接收壓縮完成訊息
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'ZIP_READY') {
    console.log("收到ZIP ready");
    stopPingUI();
    updateProgressLabel("壓縮完成，準備下載...");
    downloadZip(message.name);
  }
});

async function getZipStatus() {
  const { zipStatus, zipName } = await chrome.storage.local.get(["zipStatus", "zipName"]);
  return { status: zipStatus || null, zipName: zipName || null };

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

    const safe = sanitizeName(deckName);
    chrome.downloads.download({
      url,
      filename: `${safe || 'deck'}.zip`,
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
  chrome.storage.local.remove("extraTextOption");
  
}

function getExtraTextOption() {
  const option = document.getElementById("ExtraTextOption").value;
  const customInput = document.getElementById("CustomInputValue").value.trim();

  switch (option) {
    case "DeckName":
    case "Uploader":
      return option;
    case "Custom":
      return customInput || "Custom";
    default:
      return "";
  }
}

document.getElementById("reset-download").addEventListener("click", async () => {
  clearZipStatus();
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
  }
  showStatus("已重設下載狀態");
});