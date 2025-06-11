// 建立共用的 IndexedDB 工具（indexeddb.js）
export function openZipDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ZipStore", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("zips")) {
        db.createObjectStore("zips");
      }
    };
  });
}

export async function saveZipBlob(key, blob) {
  const db = await openZipDB();
  const tx = db.transaction("zips", "readwrite");
  tx.objectStore("zips").put(blob, key);
  return tx.complete;
}

export async function getZipBlob(key) {
  const db = await openZipDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("zips", "readonly");
    const store = tx.objectStore("zips");
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
