# AI 三色燈判斷遊戲

一個純 HTML / CSS / JavaScript 的互動式教材，幫助國小學生學習「負責任地使用 AI」。

---

## 資料夾結構

```
CH6-stoplight/
├── index.html                     ← 遊戲主頁
├── README.md                      ← 本說明檔
├── css/
│   └── style.css                  ← 所有視覺樣式（Basic 溫暖色／Advanced 活潑色）
├── js/
│   ├── csv-parser.js              ← 輕量 CSV 解析器（純前端、無依賴）
│   └── game.js                    ← 主程式：狀態／計分／計時／回饋
└── data/
    └── scenario_bank260421-1.csv  ← 題庫（可直接編輯更新）
```

> 原始題庫檔 `scenario_bank260421-1.csv` 仍保留在資料夾根目錄作為備份，
> 實際遊戲讀取的是 `data/scenario_bank260421-1.csv`。

---

## 如何執行

因為瀏覽器安全限制（CORS），直接用「點兩下 `index.html`」方式開啟，會無法讀取本機 CSV。
請用任何一種方式啟動本地伺服器：

### 方法 1：Python（最推薦，多數電腦都有）

```bash
cd CH6-stoplight
python -m http.server 8000
```

然後瀏覽器開啟：<http://localhost:8000>

### 方法 2：Node.js

```bash
npx serve .
```

### 方法 3：VS Code

安裝 **Live Server** 擴充套件，於 `index.html` 按右鍵 → _Open with Live Server_。

---

## 如何更新題庫

直接用 Excel / 記事本 / VS Code 編輯 `data/scenario_bank260421-1.csv` 即可。

### CSV 欄位說明

| 欄位 | 必填 | 說明 |
|---|---|---|
| `tier` | ✅ | `basic` 或 `advanced` |
| `item_id` |  | 題目編號（可留空，僅作識別用） |
| `config` |  | 僅作人工備註（例：`🔴`），遊戲不使用 |
| `signal` | ✅ | 正確燈號：`red` / `yellow` / `green` |
| `scenario_text` | ✅ | 題目文字 |
| `answer_explanation` |  | 教師備註，遊戲不顯示 |
| `feedback_text` | ✅ | 學生回饋文字（答錯時顯示） |

題目可以自由增減，程式會根據規則自動抽題：
- **Basic**：5 題，三色皆出現 1~2 次（需每色至少各有 2 題以上題庫量才能滿足最嚴分配）。
- **Advanced**：3 題，隨機抽取，但會盡量三色皆有。

---

## 遊戲規則

### Basic 關卡
- 5 題，來自 `tier = basic`
- 每題最多作答 **2 次**
- 第一次答對：**1 分**；第二次答對：**0.5 分**
- **答對 4 題以上** 才能進入 Advanced

### Advanced 關卡
- 3 題，來自 `tier = advanced`
- 每題作答 **5 秒** 倒數，時間到視為一次答錯
- 計分方式同 Basic

### 結算畫面
- 上層：**聖杯**（進階答對題數 ⇒ 金色聖杯數量）
- 下層：**星星**（基礎答對題數 ⇒ 金色星星數量）

---

## Responsible AI 教育原則（設計依據）

這份教材嚴格遵守以下五項原則：

1. **隱私與資料保護** — 不蒐集、不上傳、不儲存任何學生資料；
   全部狀態只存在瀏覽器記憶體中，**關閉分頁即清除**。
   **沒有使用 localStorage、cookie、也沒有遠端 API。**
2. **透明性與 AI 角色界線** — 介面明確傳達：AI 是輔助工具，不是替代思考的決策者。
3. **非懲罰、非羞辱式回饋** — 所有錯誤回饋皆為鼓勵、引導、思辨語氣。
4. **公平與包容** — 不使用涉及能力、性別、族群或家庭背景的假設性語言。
5. **教學優先於競爭** — 沒有排行榜，分數與圖像僅作學習歷程回饋。

---

## 瀏覽器支援

- 任何支援 ES2017+ 與 `fetch()` 的現代瀏覽器（Chrome / Edge / Firefox / Safari / iPad Safari）。
- 觸控最佳化：三色燈按鈕最小尺寸 > 48×48 px、採用 `pointerdown` 提升反應速度。

---

## 客製化小提示

| 要改什麼 | 改哪裡 |
|---|---|
| 調整題目數量 | `js/game.js` 最上方常數 `BASIC_COUNT`、`ADVANCED_COUNT` |
| 改變作答時限 | `js/game.js` 常數 `ADVANCED_TIME_LIMIT` |
| 通關門檻 | `js/game.js` 常數 `PASS_THRESHOLD` |
| 換配色 | `css/style.css` 最上方 `:root` 與 `body[data-level="advanced"]` |
| 換題庫檔名／路徑 | `js/game.js` 常數 `CSV_PATH` |
