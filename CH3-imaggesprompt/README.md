# CH3・AI 共創工作坊 — 256 張版

國小學童透過「共創工作坊」網頁互動遊戲體驗生成式 AI 輔助創作，並落實「正確標註、責任歸屬」的數位倫理觀念。本版採 **4 維直接索引**：4 主軸 × 4 角色 × 4 場景 × 4 配件 = 256 張圖片。

## 資料夾結構

```
CH3-imaggesprompt/
├── index.html                  主頁面（256 張版）
├── README.md
├── css/style.css               樣式
├── js/
│   ├── csv-parser.js
│   └── game.js                 4 維索引 + CSS 視覺濾鏡 + 暫位卡 fallback
├── assets/
│   ├── images/                 256 張命名 .webp（已預填 64 張，剩餘 192 張待產製）
│   └── sprites/onee.png        小精靈
├── data/
│   ├── image_database.csv      256 列圖庫（含中英文 prompt + 國小生敘述）
│   ├── tags.csv                標籤總表（4 主軸 + 16 角色 + 16 場景 + 16 配件）
│   ├── style_filters.csv       6 種 CSS 視覺濾鏡定義
│   └── v256/                   原始 v256 工作版本（含 README 與 Excel）
└── _old/v16/                   舊版 16 張完整備份（HTML/CSS/JS/CSV）
```

## 啟動方式

```bash
cd CH3-imaggesprompt
python -m http.server 8765
# 瀏覽器開 http://localhost:8765
```

## 六階段流程

| 階段 | 畫面 | 說明 |
|---|---|---|
| ① 啟動 | screen-welcome | 歡迎 + 倫理觀念建立 |
| ② **四步式選擇** | screen-tags | 主軸 → 角色 → 場景 → 配件（每選一步解鎖下一步）+ 小精靈詢問用途 |
| ③ 運算 | screen-processing | 從 256 張中直接索引匹配 |
| ④ 檢視 | screen-review | 霧化圖片 + **6 種 CSS 視覺濾鏡風格切換**（視覺欺騙教學） |
| ⑤ 倫理 | screen-ethics | 勾選正確倫理選項 |
| ⑥ 成果 | screen-result | 解除霧化 + Canvas 浮水印（含套用的濾鏡）+ 下載 PNG |

## 四維編碼

| 主軸 | 短碼 | 角色 (4) | 場景 (4) | 配件 (4) |
|---|---|---|---|---|
| 🪐 科幻 (scifi)   | sci | robot, astronaut, alien, scientist | spaceship, cybercity, moonbase, lab | glasses, laser, holopad, jetpack |
| 🏫 校園 (campus)  | cam | student, teacher, librarian, athlete | classroom, playground, library, cafeteria | book, whistle, brush, ball |
| 🏰 童話 (fairy)   | fai | wizard, knight, princess, dragon | castle, ruins, glade, tower | wand, crystal, spellbook, sparkles |
| 🌲 自然 (nature)  | nat | explorer, bear, deer, forest_kid | forest, snow, lake, meadow | backpack, torch, telescope, net |

檔名規則：`{theme3}_{character}_{scene}_{prop}.webp`，例如 `sci_robot_spaceship_glasses.webp`

## 圖片素材狀態

* **目前 64 張**已使用舊版 16 張影像填充（每張舊圖對應 4 個配件變體，主視覺相同）
* **剩餘 192 張**待製作，缺失時遊戲自動顯示「暫位卡」含完整中英文 prompt
* 完整 256 個 prompt 在 `data/image_database.csv` 的 `prompt_en` / `prompt_zh` 欄

### 圖片完成檢查清單

可從 `data/image_database.csv` 的 id 欄取得 256 個檔名清單，逐一比對 `assets/images/` 內檔案。

## 階段四「視覺欺騙」濾鏡（CSS Filters）

| ID | 中文 | CSS Filter | 文字後綴 |
|---|---|---|---|
| normal | 🌤️ 標準 | `none` | 畫面保持原始色調 |
| **retro** | 📷 復古風 | `sepia(0.8) contrast(1.2)` | 以復古老照片風格呈現 |
| **night** | 🌙 夜晚 | `brightness(0.6) hue-rotate(200deg) saturate(1.2)` | 在夜晚的藍色月光下 |
| **vivid** | 🌈 鮮豔 | `saturate(2.0)` | 用超鮮豔飽滿的色彩呈現 |
| **cyberpunk** | 🤖 賽博龐克 | `hue-rotate(280deg) saturate(1.5) contrast(1.1)` | 以賽博龐克霓虹紫紅風格呈現 |
| **soft** | ☁️ 柔和 | `brightness(1.05) contrast(0.85) saturate(0.85)` | 用柔和粉彩夢幻風呈現 |

濾鏡套用同步反映在：
1. 階段四檢視圖
2. 階段五倫理檢核圖
3. 階段六最終 Canvas 下載結果

## 教育意涵

> 「咦，明明只有 256 張固定的圖，怎麼套個濾鏡就變成不同風格？」
> 這正是 AI 倫理教學的好機會：**真實 AI 也常常只是把現有素材重新組合或加效果，不是真的「憑空創造」。所以更需要清楚標註 AI 參與。**

## 更換題庫 / 主軸 / 配件

* `data/image_database.csv`：每張圖一列，9 欄
* `data/tags.csv`：標籤定義（含主軸歸屬）
* `data/style_filters.csv`：6 種濾鏡可自由增減

完整工作版本與 Excel 整合表在 `data/v256/`，方便題庫維護人員一次檢視所有資料。

## 16 → 256 暫填規則

| 舊圖 | 對應四個 256 命名（每個配件 1 張） |
|---|---|
| sci_01 | sci_robot_spaceship_{glasses, laser, holopad, jetpack} |
| sci_02 | sci_robot_cybercity_* |
| ... 共 16 × 4 = 64 張 ... |

當您後續逐張產製真實圖片時，直接覆蓋對應 webp 檔即可，**不需要重啟伺服器、不需要修改程式碼**。
