# AI 真相大搜查 — 校園主播危機

## 專案概述

15 分鐘 Web 互動教育遊戲，目標對象為國小三至六年級學生。
玩家扮演校園主播「吱吱」的助手，用「**停、查、問**」三步驟訓練識別 AI 假消息。

- **技術棧**：原生 HTML + CSS + JavaScript（無框架），CSV 資料驅動
- **部署方式**：GitHub Pages（HTTPS，免費），或本機 Live Server
- **平台支援**：桌機、平板（iPad 橫向）

---

## 快速啟動（本機開發）

```bash
# 方法一：VS Code Live Server（推薦）
# 安裝 Live Server 套件後，右鍵 index.html → Open with Live Server

# 方法二：Python
python -m http.server 8080
# 然後開啟 http://localhost:8080
```

> ⚠️ 不能直接雙擊 `index.html`，因為 CSV 以 `fetch` 載入，需要 HTTP 伺服器。

---

## 檔案結構

```
CH4-factchecking/
├── index.html                     ← 遊戲主頁（單一入口）
├── script.js                      ← 全部遊戲邏輯（CSV 驅動，無框架）
├── styles.css                     ← 樣式（含 RWD）
├── style_demo.html                ← 視覺元件範例頁（開發參考用）
├── .nojekyll                      ← GitHub Pages 跳過 Jekyll
│
├── data/                          ← 資料層（非工程師可用 Excel 編輯）
│   ├── scenarios.csv              3 個情境基本資料
│   ├── messages.csv               15 則訊息（3 情境 × 5 則）
│   ├── breakpoints.csv            18 個第二關 hotspot（3 情境 × 6 個）
│   ├── character_responses.csv    第三關角色 + 對白（含正確/錯誤分支）
│   ├── ui_strings.csv             所有 UI 文字（方便多語系／改字）
│   ├── narrator_lines.csv         吱吱旁白文字
│   ├── instructions.csv           開始頁「停查問」3 步驟說明
│   └── prompts/
│       └── image_prompts.csv      圖片 AI 生成提示詞總索引
│
├── assets/images/
│   ├── intro/                     move1.webp ~ move18.webp（開場動畫）
│   ├── narrator/                  jiji_*.webp（吱吱 8 種表情）
│   ├── characters/                s1/s2/s3 各情境的第三關角色立繪
│   ├── scenarios/
│   │   ├── s1/                    s1_msg1~5.webp + s1_zoom_B1-01~06.webp
│   │   ├── s2/                    s2_msg1~5.webp + s2_zoom_B2-01~06.webp
│   │   └── s3/                    s3_msg1~5.webp + s3_zoom_B3-01~06.webp
│   └── ui/
│       └── image_logo.webp        品牌徽章（右下角浮層）
│
├── docs/                          ← 規格文件（以 PROJECT_STATUS.md 為主）
│   ├── PROJECT_STATUS.md          ★ 單一事實來源（遊戲現況、機制、待辦）
│   ├── 01_GAME_SPECIFICATION_v2.md  歷史版本規格（供參考）
│   ├── IMAGE_REQUIREMENTS.md      圖片提示詞說明
│   ├── CONVENTIONS.md             命名與程式規範
│   └── scenario_reference_rebuilt.docx  情境腳本原稿
│
└── content/                       ← 情境原始內容（CSV 的文字來源）
    ├── scenario1_typhoon/         颱風停課事件
    ├── scenario2_donation/        校園好消息 / 愛心捐贈
    └── scenario3_freegift/        免費 iPhone / 大清倉
```

---

## 完整遊戲流程（9 個畫面）

| # | 畫面 | 說明 |
|---|---|---|
| 1 | **開始頁** | 標題 + 停/查/問 三步驟說明 + 小提醒 + 開始按鈕 |
| 2 | **前導動畫** | 18 張 flipbook + 吱吱打字機對白，結束後顯示「開始調查」按鈕 |
| 3 | **隨機抽情境** | 背景邏輯（優先抽未玩過的情境） |
| 4 | **情境揭幕** | 全螢幕顯示情境名稱 2.5 秒，自動進入第一關 |
| 5 | **第一關「停」** | 5 則訊息輪播，每則 5 秒倒數，按「✅ 通過」或「⛔ 停！」，需答對 2 則假訊息 |
| 6 | **第二關「查」** | 60 秒，從假訊息圖中點出 3 個破綻 hotspot，可使用 1 次提示 |
| 7 | **第三關「問」** | 從 3 個角色中選出「該問的人」，可重選（但影響星數） |
| 8 | **結算頁** | 故事樹：回顧三關抓到的假訊息、破綻、正確角色 |
| 9 | **證書頁** | SVG 星星評分（0~3 星）、可輸入姓名、下載 PNG 證書 |

---

## 三個情境

| ID | 名稱 | 主題 | 假訊息內容 |
|---|---|---|---|
| **s1** | 颱風停課事件 | 假新聞 / 假公告 | 「超級颱風！教育部宣布全臺停課三天」/ 假冒校長公告 |
| **s2** | 校園新聞 | 溫情詐騙 | 「企業捐 1000 臺平板給偏鄉小學，點連結申請」/ 「愛心大使招募，填表即可領禮物」 |
| **s3** | 免費、大清倉 | 利誘詐騙 | 「恭喜！免費獲得 iPhone 17！限時 24 小時」/ 「豪華禮物等你領！按讚分享免費送」 |

每個情境有 5 則訊息（其中 2 則假）、6 個破綻 hotspot（分布在 2 張假訊息圖上，每圖 3 個）、3 個第三關角色（1 個正確答案）。

---

## 評分機制

- **第一關**：答對 2/2 假訊息 → 1 星；答對 1/2 → 0.5 星；全錯 → 失敗，重抽情境
- **第二關**：60 秒內找到 3/3 破綻 → 1 星；找到 2/3 以上 → 0.5 星；超時自動進下一關
- **第三關**：第 1 次選對 → 1 星；第 2 次選對 → 0.5 星；第 3 次以上 → 0 星
- **總分**：三關合計最高 3 星，每完成 1 個情境就獲得當次情境的評等證書

---

## 圖片資產（全部完成）

| 類別 | 數量 |
|---|---|
| 開場 flipbook | 18 張（move1~18.webp） |
| 吱吱立繪 | 8 張（cheer/check/ask/stop/thinking/surprised/proud/placeholder） |
| 各情境訊息圖 | 5 × 3 = 15 張 |
| 各情境破綻放大圖 | 6 × 3 = 18 張 |
| 第三關角色立繪 | 9 張（每情境 3 個） |
| UI 徽章 | 1 張 |
| **合計** | **69 張 WebP** |

---

## 部署到 GitHub Pages

1. 在 Repo 設定 → Pages → Branch: `main`，Folder: `/ (root)`
2. 確認 `.nojekyll` 在根目錄
3. 推送後約 1 分鐘即可透過 `https://<username>.github.io/<repo>/` 開啟

---

## 更詳細資料

請參閱 `docs/PROJECT_STATUS.md`，內含：完整機制說明、各情境企畫細節、breakpoint 座標、待辦事項清單。

**注意**：本文件（README.md）只放「快速上手」資訊；所有細節以 `docs/PROJECT_STATUS.md` 為準。
