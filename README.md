# MTG Deck Image Downloader

一個 Chrome 擴充功能，可以從 Moxfield 和 Archidekt 網站下載魔法風雲會（Magic: The Gathering）的套牌圖片。

## 專案簡介

此擴充功能讓玩家能輕鬆地從他們喜愛的套牌構築網站（Moxfield 與 Archidekt）下載完整的套牌卡圖。下載的圖片會根據您的設定（例如：語言、卡圖版本）從 Scryfall 抓取，並打包成一個 ZIP 檔，方便您在本地端使用，例如用於代理卡牌製作或個人收藏。

## 主要功能

*   **支援主流套牌網站**：可於 [Moxfield](https://moxfield.com/) 和 [Archidekt](https://archidekt.com/) 的套牌頁面使用。
*   **圖片來源**：使用強大的 [Scryfall API](https://scryfall.com/docs/api) 來獲取高品質的卡牌圖片。
*   **打包下載**：將整副套牌的卡圖打包成一個 `.zip` 檔案，一次性下載。
*   **進度通知**：透過瀏覽器通知，即時顯示圖片下載與壓縮進度。

## 如何使用

1.  前往 Moxfield 或 Archidekt 上的任一套牌頁面。
2.  點擊瀏覽器右上角的擴充功能圖示。
3.  在彈出視窗中，您可以選擇卡圖語言、樣式等選項。
4.  點擊「下載」按鈕。
5.  擴充功能將開始在背景下載圖片並進行壓縮，完成後會自動觸發瀏覽器下載 ZIP 檔案。

## 安裝方式

由於此專案尚未上架至 Chrome 線上應用程式商店，您需要手動安裝。

1.  下載此專案的原始碼並解壓縮到一個您不會輕易刪除的資料夾。
2.  打開 Chrome 瀏覽器，前往 `chrome://extensions`。
3.  在頁面右上角，開啟「開發人員模式」。
4.  點擊左上角的「載入未封裝項目」。
5.  選擇您在步驟 1 中解壓縮的資料夾。
6.  安裝完成！您應該可以在瀏覽器的擴充功能列表中看到「MTG Deck Image Downloader」。

## 技術棧

*   **Manifest V3**: 使用最新的 Chrome 擴充功能規範。
*   **JavaScript (ESM)**: 採用模組化的現代 JavaScript。
*   **Scryfall API**: 用於獲取卡牌資料與圖片。
*   **JSZip**: 用於在客戶端壓縮圖片並打包成 ZIP 檔案。
*   **HTML/CSS**: 用於打造擴充功能的彈出操作介面。

---

*This is an unofficial tool and is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast, Moxfield, Archidekt, or Scryfall.*
