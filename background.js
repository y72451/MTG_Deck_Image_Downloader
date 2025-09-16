// background.js
import JSZip from './lib/jszip-esm2015.js';
import { saveZipBlob } from './lib/indexeddb.js';

let extraTextOption;
let contentTabId = null;

// 合併所有訊息監聽器
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log("Background 收到訊息:", message.action);
  
  if (message.action === "deck_ready") {
    console.log("準備開始下載");
    const { cards, deckName, uploader } = message;
    contentTabId = sender?.tab?.id || contentTabId;
    await handleDownload(cards, deckName, uploader);
  }
  else if (message.action === "start_fetch") {
    extraTextOption = message.extraTextOption || null;
    contentTabId = sender?.tab?.id || contentTabId;

    // 保險起見，也寫入 storage
    chrome.storage.local.set({ extraTextOption });

    console.log("儲存 extraTextOption:", extraTextOption);
  }
  else if (message.action === "keep_alive") {
    sendResponse({ status: "ok" });
    // 使用 storage 記錄最後一次 ping 的時間
    const currentTime = Date.now();
    chrome.storage.local.set({ 
      lastPingTime: currentTime,
      backgroundActive: true 
    });
    console.log("Background: 記錄 ping 時間", currentTime);
  }
});

async function handleDownload(cards, deckName, uploader) {
  const zip = new JSZip();
  const failedCards = [];
  let completed = 0;
  const total = cards.length;
  let safeDeckName = sanitize(deckName); 
  const stored = await chrome.storage.local.get("extraTextOption");
  let extraText = stored.extraTextOption || extraTextOption || "";
  if (extraText == "DeckName") {
    extraText = deckName
  }
  else if (extraText == "Uploader") {
    extraText = uploader
  }
  for (const card of cards) {
    try {
      const res = await fetch(`https://api.scryfall.com/cards/${card.scryfall_id}`);
      const data = await res.json();
      const images = [];

      if (data.image_uris?.png) {
        images.push({ url: data.image_uris.png, suffix: "" });
      } else if (data.card_faces) {
        data.card_faces.forEach((face, index) => {
          if (face.image_uris?.png) {
            images.push({ url: face.image_uris.png, suffix: `_face${index + 1}` });
          }
        });
      } else {
        failedCards.push(card.name);
        continue;
      }

      for (const img of images) {
        const imgResp = await fetch(img.url);
        const blob = await imgResp.blob();
        const safeName = sanitize(card.name);
        const baseFilename = extraText
          ? `${safeName}${img.suffix || ""}_${extraText}`
          : `${safeName}${img.suffix || ""}`;
        const count = Math.max(card.quantity || 1, 1);
        for (let i = 1; i <= count; i++) {
          const filename =
            count === 1
              ? `${baseFilename}.png`
              : `${baseFilename}_${i}.png`;
          zip.file(filename, blob);
        }
      }
    } catch (err) {
      console.warn("下載失敗:", card.name);
      failedCards.push(card.name);
    }

    completed++;
    chrome.runtime.sendMessage({ action: "progress", completed, total });
    await delay(100);
  }

  if (failedCards.length > 0) {
    const failText = failedCards.join("\n");
    zip.file("failures.txt", failText);
  }
  console.log("開始打包與下載 zip...");

  let content;
  try {
    //console.log("files to zip:", Object.keys(zip.files));
    chrome.runtime.sendMessage({ action: "ZIP_BUILDING" });
    if (contentTabId != null) {
      try { chrome.tabs.sendMessage(contentTabId, { action: "ZIP_BUILDING" }); } catch (e) { console.warn("tabs.sendMessage ZIP_BUILDING 失敗:", e); }
    }
    SetZipSatus("ZIP_BUILDING");
    //chrome.storage.local.get(null, console.log)
    content = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE", // 確保壓縮模式存在
      compressionOptions: { level: 6 }
    });
    console.log("zip.generateAsync 完成");
    await saveZipBlob(safeDeckName, content); // 存進 IndexedDB
    console.log("zip存入IndexedDB");
    SetZipSatus("ZIP_READY", safeDeckName);

    chrome.runtime.sendMessage({ action: 'ZIP_READY', name: safeDeckName }); // 通知 popup
    if (contentTabId != null) {
      try { chrome.tabs.sendMessage(contentTabId, { action: 'ZIP_READY', name: safeDeckName }); } catch (e) { console.warn("tabs.sendMessage ZIP_READY 失敗:", e); }
    }
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "牌組壓縮完成",
      message: "壓縮已完成，請開啟擴充功能以開始下載。",
      priority: 2
    });
  } catch (err) {
    console.error("壓縮出錯:", err);
  }
}

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*]+/g, "_");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function SetZipSatus(status, zipName) {
  chrome.storage.local.set({
    zipStatus: status,
    zipName: zipName
  })
}
