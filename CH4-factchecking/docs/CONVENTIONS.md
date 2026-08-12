# 命名與程式規範

這份文件規範整個專案的命名、檔案組織、CSS 與 JS 寫法。所有 PR / commit 都應該遵守。

目的：避免「LLM 隨手寫一個」的混亂，確保專案長期可維護。

---

## 1. 資料夾結構

```
CH4-factchecking/
├── README.md                     原始入口（未動）
├── 00-05_*.md                    原始規格（保留作為歷史）
├── ALL_CONTENT_MERGED.md         原始內容合併版
├── content/                      原始情境內容（保留）
│
├── docs/                         新版規範文件
│   ├── CONVENTIONS.md            （本檔）
│   ├── 01_GAME_SPECIFICATION_v2.md
│   └── IMAGE_REQUIREMENTS.md
│
└── game/                         可執行的遊戲
    ├── index.html
    ├── styles.css
    ├── script.js
    ├── style_demo.html           樣式範例頁
    ├── data/                     8 份 CSV
    │   ├── scenarios.csv
    │   ├── messages.csv
    │   ├── breakpoints.csv
    │   ├── characters.csv
    │   ├── image_prompts.csv
    │   ├── ui_strings.csv
    │   ├── narrator_lines.csv
    │   ├── instructions.csv
    │   └── README.md
    ├── assets/
    │   ├── images/
    │   │   ├── scenarios/
    │   │   │   ├── s1/
    │   │   │   ├── s2/
    │   │   │   └── s3/
    │   │   ├── characters/
    │   │   ├── narrator/         吱吱立繪
    │   │   ├── ui/
    │   │   └── backgrounds/
    │   └── audio/
    │       ├── voices/           角色配音
    │       │   └── narrator/     吱吱旁白
    │       ├── sfx/              音效
    │       └── music/            背景音樂
    └── lib/                      外部函式庫
        └── html2canvas.min.js
```

---

## 2. ID 命名規則

**情境 ID**：`s1`、`s2`、`s3`（與原規格書編號一致；如果之後新增第 4 個情境，用 `s7` 等下一個編號，方便和教材其他章節對齊）

**訊息 ID**：以 `(scenario_id, message_order)` 複合鍵唯一識別，不需要單獨欄位。

**破綻 ID**：`B1-01`、`B2-02`、`B3-03`，**Bx-NN**（情境號 + 兩位數流水號）

**角色 ID**：英文小寫單字，如 `teacher`、`classmate`、`netizen`、`director`、`fake_company`、`officer`。每個情境的 character_id 各自獨立、不必跨情境唯一。

**圖片資源 ID**（image_prompts.csv 的 asset_id）：
- 吱吱立繪：`jiji_<情緒>`，例如 `jiji_stop`、`jiji_check`
- 情境主圖：`s1_main`、`s2_main`、`s3_main`
- 訊息配圖：`s1_msg1` ~ `s1_msg5`
- 角色立繪：`s1_teacher`、`s2_director`、`s3_officer`…

**旁白 ID**（narrator_lines.csv 的 line_id）：snake_case，描述用途，如 `intro_01`、`clear_s2`、`cheer_correct_fake`

**UI 字串 key**：snake_case，按用途前綴分組：
- `start_*` 開始頁
- `level1_*`、`level2_*`、`level3_*` 三關
- `result_*` 結算
- `certificate_*` 證書
- `error_*` 錯誤
- 通用按鈕用簡短名：`next_button`、`back_button`

---

## 3. 檔名規則

- **全部英文小寫**，單字間用底線（snake_case），不用空格、不用中文
- **音檔**：`.mp3`，128 kbps
- **圖片**：`.png`（含透明）或 `.jpg`（不需透明、檔案要小）
- **路徑用相對路徑**，全部從 `game/` 為根

範例：
```
assets/images/scenarios/s1/main.png
assets/images/scenarios/s1/zoom_B1-01.png      ← 破綻放大圖
assets/images/characters/s1_teacher.png
assets/images/narrator/jiji_stop.webp
assets/audio/voices/s1_correct.mp3
assets/audio/voices/narrator/intro_01.mp3
assets/audio/sfx/button_click.mp3
assets/audio/sfx/celebration_fake.mp3        ← 假訊息答對的強烈慶祝音
assets/audio/sfx/celebration_true.mp3        ← 真訊息答對的輕柔音
assets/audio/sfx/countdown_tick.mp3
assets/audio/music/bgm.mp3
```

---

## 4. CSS 規則

### Class 命名：BEM-lite

```
.screen                  block
.screen--active          modifier
.screen__title           element

.btn
.btn--primary
.btn--danger
.btn--ghost

.card
.card__title
.card__body

.hotspot
.hotspot--found
.hotspot--hint
```

### 顏色變數

不要在 `.css` 中寫 hex code，全部走 CSS 變數：

```css
:root {
  /* 主色（克制使用） */
  --color-primary: #2E5C8A;        /* 深藍 */
  --color-accent: #FF8C42;         /* 橙 */
  --color-success: #4CAF50;
  --color-danger: #E74C3C;
  --color-warning: #F39C12;

  /* 中性色 */
  --color-bg: #F5F7FA;
  --color-surface: #FFFFFF;
  --color-text: #2C3E50;
  --color-text-muted: #7F8C8D;
  --color-border: #E0E6ED;

  /* 字體 */
  --font-main: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
  --font-size-base: 18px;
  --font-size-lg: 24px;
  --font-size-xl: 32px;

  /* 間距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;

  /* 圓角 */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;

  /* 陰影（克制） */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 2px 6px rgba(0,0,0,0.08);
  --shadow-press: 0 0 0 transparent;  /* 按下時 */

  /* 觸控 */
  --tap-target-min: 48px;            /* 平板觸控最小 */
}
```

### 禁止
- ❌ 大範圍 blur（`filter: blur(20px)` 之類的毛玻璃）
- ❌ 多層漸層背景（`linear-gradient(135deg, #...)`）
- ❌ 霓虹發光（`box-shadow: 0 0 30px #ff00ff`）
- ❌ 紫粉藍漸層
- ❌ 半透明卡片堆疊（`rgba(255,255,255,0.3)` + backdrop-filter）

### 鼓勵
- ✅ 實心色塊 + 1px 邊框
- ✅ 按鈕用「位移陰影」表現實體感（按下時陰影縮回去 + transform: translateY(2px)）
- ✅ 卡片用淡灰邊框 + 微陰影
- ✅ 慶祝動畫用 SVG 彩帶 / star burst，不用發光

---

## 5. JavaScript 規則

### 檔案組織

開發初期可以全部寫在 `script.js`。當 `script.js` 超過 600 行時，按模組拆分：

```
script.js              主入口、初始化
js/state.js            gameState 與 localStorage
js/csv.js              CSV 讀取與解析
js/screens.js          showScreen + 各畫面切換
js/level1.js           第一關邏輯
js/level2.js           第二關邏輯
js/level3.js           第三關邏輯
js/certificate.js      證書生成
js/audio.js            音效控制
js/utils.js            通用工具
```

各 js 檔不用 export/import（避免 type=module 的 CORS 麻煩），用全域 `window.AITruth.<module>` 命名空間。

### 命名

- **變數 / 函式**：camelCase，動詞開頭（`showScreen`、`loadScenarios`、`handleStopClick`）
- **常數**：UPPER_SNAKE_CASE（`COUNTDOWN_SEC = 5`）
- **狀態物件**：單一 `gameState` 全域，不要散在各處
- **DOM 操作**：用 `document.querySelector`，不用 jQuery

### 註解

公開函式必須有 JSDoc：
```javascript
/**
 * 顯示一則訊息，啟動 5 秒倒數
 * @param {object} message - 來自 messages.csv 的訊息物件
 * @param {number} index   - 訊息在情境中的順序（1-5）
 */
function showMessage(message, index) { ... }
```

內部邏輯用 `// ` 行內註解，繁體中文。

### 禁止
- ❌ `console.log` 留在 production（提交前移除）
- ❌ `alert()` / `confirm()`（用自訂提示卡片）
- ❌ 在 JS 中寫死中文字串（一律從 `ui_strings.csv` 取）
- ❌ inline event handler（`onclick="..."`）一律 addEventListener

---

## 6. localStorage key 命名

統一前綴 `aitruth_`：

```
aitruth_player_name          玩家姓名
aitruth_completed_scenarios  已完成的情境 ID 陣列（JSON string）
aitruth_total_stars          目前星數（0-3）
aitruth_settings_muted       是否靜音（"true" / "false"）
```

---

## 7. 提交訊息規範

```
feat: 加入第一關 5 秒倒數
fix: 修正 hotspot 點擊容錯範圍
docs: 補上 CSV 編輯說明
style: 移除按鈕發光暈
refactor: 把音效邏輯抽到 audio.js
```

---

## 8. 開發流程

每個功能：
1. 先在 `style_demo.html` 確認視覺
2. 寫進 `script.js` 對應函式
3. 開 Live Server 在 iPad 與 PC 都試一次
4. 通過後 commit

⚠️ 每完成一個「步驟」就跟開發者確認後再走下一步，不要一次塞太多。
