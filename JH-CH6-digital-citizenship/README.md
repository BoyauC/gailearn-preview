# 國中 CH6｜我要成為善用 AI 的數位公民

副標題：數位生活挑戰營。

## 本機預覽

在本資料夾啟動靜態伺服器後開啟 `index.html`。請勿直接以 `file://` 開啟，事件資料使用 `fetch` 載入。

## 資料維護

- `data/script-source.md`：已確認的 6 天正式逐日劇本來源。
- `scripts/build-events.mjs`：由劇本表格重建 `data/events.json`。
- `scripts/validate-events.mjs`：檢查 6 天、25 題、選項唯一性與必填欄位。

修改劇本文案後執行：

```powershell
node scripts/build-events.mjs
node scripts/validate-events.mjs
node test/simulate-paths.mjs
```

## GA4

Measurement ID 沿用正式 GAILearn 教材的 `G-H0GVBHS5B6`，只放於 `index.html` 產生基本頁面瀏覽。不得新增決策、徽章、狀態、後果、公約或結局事件。
