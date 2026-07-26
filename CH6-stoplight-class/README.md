# CH6 Stoplight 班級版

「AI 三色燈挑戰」的班級記錄版。首頁分成學生與教師入口；教師建立課堂後取得 4 位數代碼，學生以代碼加入並在基礎關、遊戲完成時批次送出紀錄。

## 已完成的流程

- 教師可設定 8–64 字元管理密碼、建立課堂、複製學生代碼與教師登入資訊。
- 教師可用 4 位數代碼與管理密碼重新登入；錯誤訊息不透露代碼是否存在。
- 同一組代碼連續登入失敗 5 次後鎖定 15 分鐘。
- 學生可輸入代碼與選填姓名；未填時由後端依序命名為「匿名 01」。
- 同一課堂共用 5 題基礎題與 3 題進階題，每位學生的題序不同且可重現。
- 基礎關結束保存一次 checkpoint，最終頁再以同一份文件更新完整紀錄。
- 關閉課堂後停止新學生加入，已加入者可在 10 分鐘內補交。
- 教師後台即時顯示加入數、checkpoint、完成人數、平均分數、個別進度與題目首答正確率，並可下載 CSV。
- 課堂與作答資料保留 90 天，再由每日排程一般刪除；未使用 Firestore TTL。

## 架構與資料流

```text
Firebase Hosting
├─ index.html        身分選擇
├─ student.html      加入、遊戲、兩次批次送出
└─ teacher.html      建立／登入、即時儀表板
        │
        ▼
Anonymous Firebase Auth + App Check (reCAPTCHA v3)
        │
        ▼
Callable Functions (asia-east1, min 0 / max 3)
        │
        ▼
Cloud Firestore
```

瀏覽器沒有 Firestore 寫入權限；所有建立、登入、加入、保存、關閉與改密碼都經由 Callable Functions。教師密碼只在建立或登入表單的短暫記憶體中存在，後端只保存隨機鹽值與 scrypt 雜湊，不寫入網址、localStorage、Firestore 公開文件或日誌。

教師的瀏覽器只會在 localStorage 保存 `sessionId` 與 4 位數代碼，不保存密碼。這讓原瀏覽器仍保有匿名 Auth 權限時，可以直接回到後台修改密碼。

## Firestore collections

| Collection | 用途 | 前端權限 |
|---|---|---|
| `sessions` | 課堂狀態、題目 ID、保留期限 | 該課堂教師唯讀 |
| `sessionMembers` | 教師／學生身分與進度 | 教師讀全班；學生讀自己 |
| `sessionQuestions` | 建立課堂時的題目快照 | 教師唯讀；學生由 Function 取得 |
| `submissions` | 每位學生一份可更新紀錄 | 教師讀全班；學生讀自己 |
| `sessionSecrets` | 密碼鹽值、雜湊、登入鎖定 | 前端完全禁止 |
| `activeCodes` | 4 位數代碼到 session 的安全索引 | 前端完全禁止 |
| `questionBank` | 可用題庫 | 前端完全禁止 |

## 第一次設定 Firebase

1. 建立 Firebase 專案並切換 Blaze 方案。Functions 部署需要 Blaze，但在免費用量內不會產生 Functions 運算費；仍建議設定 Google Cloud 預算通知。
2. 在 Authentication 啟用「匿名」登入。
3. 建立 Firestore Database，區域建議選 `asia-east1`，並保持與 Functions 相同區域。
4. 新增 Web App，把 Firebase Console 顯示的六個公開設定值填入 `js/firebase-config.js` 的 production 區塊。
5. 在 App Check 註冊 Web App 與 reCAPTCHA Enterprise，把 site key 填入同檔案的 `recaptchaEnterpriseSiteKey`。
6. 複製 `.firebaserc.example` 為 `.firebaserc`，將 `REPLACE_WITH_PROJECT_ID` 改為實際專案 ID。
7. 安裝相依套件：

```bash
npm install
npm --prefix functions install
```

8. 先匯入題庫，再部署：

```bash
npm run seed:questions
npm run deploy
```

> `seed:questions` 使用 Application Default Credentials。正式專案可先執行 `firebase login` 與 `gcloud auth application-default login`；在 Emulator 中則不需要正式金鑰。

Production Callable Functions 預設強制檢查 App Check；Emulator 會自動關閉強制檢查。因此正式部署前必須先完成 reCAPTCHA v3 設定。

## 本機 Emulator

`localhost` 會自動使用 `demo-stoplight-class` 假設定並連到 Emulator，不需要改動正式 Firebase 設定。

```bash
npm install
npm --prefix functions install
npm run emulators
```

Emulator 啟動後，在另一個終端執行：

```bash
npm run seed:questions
```

網站：<http://127.0.0.1:5000>  
Emulator UI：<http://127.0.0.1:4000>

## 測試

```bash
npm test
npm run test:rules
npm run test:integration
```

- Functions 純邏輯測試涵蓋密碼雜湊、題組平衡、個別題序、計分與不合理重複作答。
- Firestore Emulator 測試涵蓋教師讀取、學生只讀自己的資料、秘密文件不可讀，以及所有瀏覽器寫入都被拒絕。
- Functions 整合測試涵蓋完整課堂生命週期、匿名編號、checkpoint、重複提交、改密碼、關閉／補交、代碼唯一性、5 次登入鎖定與 90 天清理。
- `firebase.json` 同時提供 Auth、Functions、Firestore、Hosting 與 Emulator UI 設定。

## 成本控制與上線檢查

- Functions 固定 `minInstances: 0`、`maxInstances: 3`、256 MiB；每日清理排程最多 1 個 instance。
- 作答不逐題寫入，只在加入、基礎關結束、遊戲完成產生少量寫入。
- 建議安全營運值：每月 30,000 人次（約 500 場、每場 60 人），每日建議不超過 1,500 人次。
- 專案目標為單次本站靜態下載低於 250 KB；Firebase SDK 由官方 CDN 載入並可由瀏覽器快取。
- 在 Firebase Authentication 升級 Identity Platform 後，啟用「自動清除 30 天以上匿名帳號」。
- 部署 Functions 後設定 Artifact Registry 清理：

```bash
firebase functions:artifacts:setpolicy --days 7 --location asia-east1
```

- Firebase Console 建議建立 50%、80%、100% 三段預算通知。預算通知不會自動停止服務；需要硬上限時，另行建立每日使用量監控。

## 題庫與遊戲規則

來源檔為 `data/scenario_bank260423.csv`。更新 CSV 後需重新執行 `npm run seed:questions`。

- 基礎關 5 題：三色各 1–2 題；第一次答對 1 分、第二次答對 0.5 分。
- 基礎關答對至少 4 題可進入進階關。
- 進階關 3 題：每色各 1 題，每題 10 秒，計分方式相同。
- 滿分 8 分。後端會依題目正解重新計分，不採信前端自行回報的分數。

## 上線前人工驗收

- 桌機 Chrome／Edge：建立、登入、錯誤密碼、5 次鎖定、關閉及補交。
- 手機與 iPad Safari：數字鍵盤、密碼顯示／隱藏、三色燈觸控與後台橫向表格。
- DevTools：Network、URL、Application Storage 與 console 中不可出現教師密碼。
- 學生頁不得顯示任何教師密碼提示；分享給學生的內容只有 4 位數代碼。
- 關閉網路後完成 checkpoint，確認畫面出現「重試送出」，恢復網路後可成功補送且不重複計入。
