// background.js
import JSZip from './lib/jszip-esm2015.js';

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.action === "deck_ready") {
	  	  console.log("準備開始下載");
    const { cards, deckName } = message;
    await handleDownload(cards, deckName);
  }
});

async function handleDownload(cards, deckName) {
  const zip = new JSZip();
  const failedCards = [];
  let completed = 0;
  const total = cards.length;

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
        const filename = `${safeName}${img.suffix || ""}.png`;
        zip.file(filename, blob);
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
  console.log("pako exists?", typeof Deflate, typeof Inflate); // 確保被正確載入
console.log("zip.files 內容:", Object.keys(zip.files)); // 確保不是空的
console.log("開始打包與下載 zip...");
  try {
  console.log("files to zip:", Object.keys(zip.files));
  const content = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE", // 確保壓縮模式存在
    compressionOptions: { level: 6 }
  });
  console.log("zip.generateAsync 完成");
} catch (err) {
  console.error("壓縮出錯:", err);
}
  console.log("zip.generateAsync...");
  const blobUrl = URL.createObjectURL(content);
chrome.downloads.download({
  url: blobUrl,
  filename: `${sanitize(deckName) || "deck"}.zip`,
  saveAs: true
}, (downloadId) => {
  if (chrome.runtime.lastError) {
    console.error("下載錯誤:", chrome.runtime.lastError.message);
  } else {
    console.log("下載成功，ID:", downloadId);
  }
});
}

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*]+/g, "_");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}// 保留空白，可未來擴充使用