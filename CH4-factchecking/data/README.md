# 資料檔說明（CSV）

這個資料夾的 8 份 CSV 就是整個遊戲的「題庫資料庫」。所有畫面文字、訊息、破綻、角色、圖片提示詞、UI 字串都從這裡載入，程式只負責邏輯。

> 想換題目、改錯字、補配角嗎？只要編這些 CSV，**不需要改任何程式**。

---

## 檔案清單

| 檔案 | 內容 | 列數 |
|---|---|---|
| `scenarios.csv` | 三套情境的基本資料（名稱、主圖路徑、過關條件） | 3 |
| `messages.csv` | 第一關 5 則訊息（每情境 5 則，共 15 則） | 15 |
| `breakpoints.csv` | 第二關 hotspot 座標（每情境 3 個） | 9 |
| `characters.csv` | 第三關角色對白（每情境 3 個） | 9 |
| `image_prompts.csv` | 所有 AI 圖片的提示詞（Midjourney / DALL-E / SD） | 35 |
| `ui_strings.csv` | 介面文字（按鈕、提示、稱號） | 50+ |
| `narrator_lines.csv` | 主播吱吱的旁白與配音檔對應 | 21 |
| `instructions.csv` | 遊戲說明頁的三個步驟 | 3 |

---

## 編輯規則

### 1. 換行字元用 `\n`

CSV 不容易處理多行欄位，所以**所有需要換行的地方都寫 `\n`（反斜線 + 小寫 n）**，程式載入時會自動轉成真正的換行。

範例：
```
答對啦！\n這則是真的！\n可以放心通過～
```

顯示出來是：
```
答對啦！
這則是真的！
可以放心通過～
```

### 2. 含逗號的內容請用雙引號

如果欄位內容有英文逗號，整個欄位要用雙引號包住，否則 CSV 會拆錯欄。建議用 Excel 或 Google Sheets 編輯，存檔時選「CSV（UTF-8）」格式，引號會自動處理。

### 3. UTF-8 編碼，無 BOM

請用 VS Code 或 Google Sheets 編輯，避免用 Windows 記事本（容易加 BOM 或變成 ANSI）。

### 4. `is_fake` / `is_correct` 欄位

只接受 `true` 或 `false`（全小寫英文）。

### 5. 座標系統（breakpoints.csv）

`center_x_pct`、`center_y_pct`、`tolerance_pct` 都是 **0–100 的百分比**，代表在主圖（1600×900）上的相對位置。換主圖時不用重算像素。

點擊判定：玩家點擊位置與 hotspot 中心點距離 ≤ tolerance 即算命中。

### 6. 檔案路徑

所有 `image`、`avatar`、`voice` 欄位填的是**相對於 `game/index.html` 的路徑**。建議統一用 `assets/...` 開頭。

---

## 修改範例

### 想換掉情境 2 的訊息 3（讓它變得更難）？

打開 `messages.csv`，找到 `s1,3,...` 那一列，改 `text` 欄即可。

### 想新增第 4 個情境？

1. `scenarios.csv` 加一列 `s7,...`
2. `messages.csv` 加 5 列（`s7,1` 到 `s7,5`）
3. `breakpoints.csv` 加 3 列
4. `characters.csv` 加 3 列
5. `image_prompts.csv` 補相關圖片提示詞
6. `narrator_lines.csv` 加 `level1_open_s7`、`level3_open_s7`、`clear_s7` 三行

完成。程式會自動把新情境加入隨機池。

---

## 開發階段如何讀取 CSV

直接 fetch：
```javascript
const res = await fetch('data/scenarios.csv');
const csv = await res.text();
// 解析…
```

⚠️ 直接雙擊 `index.html`（file://）時瀏覽器會擋 fetch 本地檔，所以開發時請用 VS Code Live Server 或任何本機伺服器。

部署到 GitHub Pages 時是 HTTPS，沒有此問題。
