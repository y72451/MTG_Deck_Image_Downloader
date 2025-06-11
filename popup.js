// popup.js
import { getZipBlob } from './lib/indexeddb.js';

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
      await downloadZip(deckName);
    }
    else if (status === "ZIP_BUILDING") {
      console.log("Get ZIP_BUILDING");
      const progressContainer = document.getElementById("progress-container");
      const progressText = document.getElementById("progress-text");
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