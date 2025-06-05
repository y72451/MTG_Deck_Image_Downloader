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

  chrome.runtime.onMessage.addListener(async (message) => {
    if (message.action === "deck_ready") {
      const { cards, deckName } = message;
      const zip = new JSZip();
	  const failedCards = [];
	  
      progressContainer.style.display = "block";
      let completed = 0;
      const total = cards.length;
      updateProgress(completed, total);

      for (const card of cards) {
        try {
          const res = await fetch(`https://api.scryfall.com/cards/${card.scryfall_id}`);
          const data = await res.json();
          const images = [];

        if (data.image_uris?.png) {
          images.push({ url: data.image_uris.png, suffix: "" });
        } 
		else if (data.card_faces) {
          data.card_faces.forEach((face, index) => {
            if (face.image_uris?.png) {
              images.push({ url: face.image_uris.png, suffix: `_face${index + 1}` });
            }
          });
        }
        else {
          failedCards.push(card.name);
        }

        for (const img of images) {
          const imgResp = await fetch(img.url);
          const blob = await imgResp.blob();
          const safeName = card.name.replace(/[\/\\:*?"<>|]/g, "_");
          const filename = `${safeName}${img.suffix || ""}.png`;
          zip.file(filename, blob);
        }
        } catch (err) {
          console.warn("下載失敗:", card.name);
        }
        completed++;
        updateProgress(completed, total);
        await delay(100);
      }
	      // 如果有下載失敗的卡片，加入文字檔
		if (failedCards.length > 0) {
		  const failText = failedCards.join("\n");
		  zip.file("failures.txt", failText);
		}

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${deckName || "deck"}.zip`;
      a.click();
    }
  });

  function updateProgress(done, total) {
    const percent = (done / total) * 100;
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${done} / ${total}`;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function sanitize(name) {
    return name.replace(/[<>:"/\\|?*]+/g, "_");
  }

});
