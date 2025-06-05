async function fetchDeckData() {
  const url = window.location.href;
  let deckInfo = null;
	console.log("解析網址:"+url);
  if (url.includes("moxfield.com/decks/")) {
    deckInfo = await fetchFromMoxfield(url);
  } else if (url.includes("archidekt.com/decks/")) {
    deckInfo = await fetchFromArchidekt(url);
  } else {
    alert("不支援的網站");
    return;
  }

  if (deckInfo) {
    const { cards, deckName } = deckInfo;
    chrome.runtime.sendMessage({
      action: "deck_ready",
      deckName,
      cards,
    });
  }
}
async function fetchFromMoxfield(url) {
	console.log("讀取moxfield");
  const match = url.match(/\/decks\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    alert("無法識別 Moxfield 牌組 ID");
    return null;
  }

  const deckId = match[1];
  const apiUrl = `https://api2.moxfield.com/v2/decks/all/${deckId}`;

  const res = await fetch(apiUrl);
  const data = await res.json();

  const cards = [];
  const sections = [data.commanders, data.mainboard, data.sideboard];
  for (const section of sections) {
    for (const entry of Object.values(section || {})) {
      const card = entry.card || {};
      cards.push({
        quantity: entry.quantity,
        name: card.name,
        scryfall_id: card.scryfall_id,
      });
    }
  }

  return {
    deckName: data.name,
    cards,
  };
}

async function fetchFromArchidekt(url) {
	console.log("讀取Archidekt");
  const match = url.match(/\/decks\/(\d+)/);
  if (!match) {
    alert("無法識別 Archidekt 牌組 ID");
    return null;
  }

  const deckId = match[1];
  const apiUrl = `https://archidekt.com/api/decks/${deckId}/`;

  const res = await fetch(apiUrl);
  const data = await res.json();

  const cards = [];
  for (const cardObj of data.cards) {
    const card = cardObj.card || {};
    const name = card.oracleCard?.name || "Unknown";
    cards.push({
      quantity: cardObj.quantity,
      name: name,
      scryfall_id: card.uid,
    });
  }

  return {
    deckName: data.name,
    cards,
  };
}
fetchDeckData();