# 256 張版本題庫資料

本資料夾為 CH3 AI 共創工作坊的「256 張完整版」題庫。架構為 **4 維展開**，每一個玩家選擇都直接對應到一張獨立圖片，不再需要 fallback / 強制收斂。

## 編碼結構

```
4 主軸 × 4 角色 × 4 場景 × 4 配件 = 256
```

| 主軸 (theme) | 短碼 | 角色 (4) | 場景 (4) | 配件 (4) |
|---|---|---|---|---|
| 🪐 科幻 (scifi)   | sci | robot, astronaut, alien, scientist | spaceship, cybercity, moonbase, lab | glasses, laser, holopad, jetpack |
| 🏫 校園 (campus)  | cam | student, teacher, librarian, athlete | classroom, playground, library, cafeteria | book, whistle, brush, ball |
| 🏰 童話 (fairy)   | fai | wizard, knight, princess, dragon | castle, ruins, glade, tower | wand, crystal, spellbook, sparkles |
| 🌲 自然 (nature)  | nat | explorer, bear, deer, forest_kid | forest, snow, lake, meadow | backpack, torch, telescope, net |

## 檔案命名規則

```
{theme3}_{character}_{scene}_{prop}.webp
```

範例：
* `sci_robot_spaceship_glasses.webp`
* `fai_knight_castle_wand.webp`
* `nat_bear_snow_backpack.webp`

## 資料檔案

| 檔案 | 用途 |
|---|---|
| `image_database_256.csv` | 256 列：每張圖的 id、主軸、角色、場景、配件、檔名路徑、英文 prompt、中文 prompt、適合國小生的敘述 |
| `tags_256.csv` | 玩家可選擇的所有標籤，含 4 個 theme + 16 角色 + 16 場景 + 16 配件，並標注所屬主軸與中英文片語 |
| `style_filters.csv` | 階段四「視覺欺騙」風格濾鏡：CSS filter + 文字後綴 |
| `CH3_題庫總表_256版.xlsx` | 三張表的整合 Excel，方便維護人員一次檢視 |

## image_database_256.csv 欄位說明

| 欄位 | 說明 | 範例 |
|---|---|---|
| `id` | 唯一識別碼，等於檔名（不含副檔名） | `sci_robot_spaceship_glasses` |
| `theme` | 主軸 ID | `scifi` |
| `character` | 角色 ID | `robot` |
| `scene` | 場景 ID | `spaceship` |
| `prop` | 配件 ID | `glasses` |
| `src` | 圖片相對路徑 | `./assets/images/sci_robot_spaceship_glasses.webp` |
| `prompt_en` | 英文 AI 繪圖提示詞（複製到 MJ / SDXL / DALL·E） | `a cute friendly robot inside a futuristic spaceship control room, wearing high-tech glowing glasses, sci-fi theme, vibrant 2D vector art style, flat colors, suitable for children's illustration, clean background, cute and engaging, high resolution --ar 4:3` |
| `prompt_zh` | 中文 AI 繪圖提示詞（給支援中文輸入的 AI 工具） | `請畫一張科幻風格的圖：可愛的小機器人在未來太空船的控制室裡，戴著一副會發光的高科技眼鏡…` |
| `desc_kid` | 階段四呈現給國小生的中文敘述（取代舊版三種語氣） | `📸 可愛的小機器人在未來太空船的控制室裡，戴著一副會發光的高科技眼鏡！這是一張科幻世界的快樂畫面～` |

## 階段四「視覺欺騙」設計

256 張版本取消了原本「預設/活潑/史詩」三種敘述語氣切換，改以**真正的網頁前端視覺技術**模擬風格微調：

| style_id | 中文 | CSS Filter | 文字後綴（中） |
|---|---|---|---|
| `normal` | 🌤️ 標準 | `none` | 畫面保持原始色調 |
| `retro` | 📷 復古風 | `sepia(0.8) contrast(1.2)` | 以復古老照片風格呈現，畫面變成黃褐色 |
| `night` | 🌙 夜晚 | `brightness(0.6) hue-rotate(200deg) saturate(1.2)` | 在夜晚的藍色月光下，畫面變暗且偏藍 |
| `vivid` | 🌈 鮮豔 | `saturate(2.0)` | 用超鮮豔飽滿的色彩呈現 |
| `cyberpunk` | 🤖 賽博龐克 | `hue-rotate(280deg) saturate(1.5) contrast(1.1)` | 以賽博龐克霓虹紫紅風格呈現 |
| `soft` | ☁️ 柔和 | `brightness(1.05) contrast(0.85) saturate(0.85)` | 用柔和粉彩夢幻風呈現 |

**教育意涵**：
玩家會發現「原來只是同一張圖被加了濾鏡和文字標題」——這正是 AI 倫理教學的好機會：
> 「AI 生成的圖也常常只是把已有素材重新組合或加效果，並不是真的『憑空創造』。所以才更需要清楚標註 AI 參與。」

## 圖庫產製建議

* 256 張總容量約 **38 MB**（每張 ~150 KB）。建議用 SDXL/MJ 跑批，固定 negative prompt 與相同 seed 的 LoRA 維持風格一致。
* 不要全部預載，改為按需載入（玩家發射後才載入目標大圖；階段二可載入主軸縮圖預覽）。
* 文字資料庫共 256 × 3 段（en / zh / kid），總計 768 段。可用 LLM 批次生成後人工抽檢。

## 與舊版 16 張的差異

| 項目 | 16 張版 | 256 張版 |
|---|---|---|
| 主軸權重投票 | 必要（用於決定勝出主軸） | 不需要（每組合都有圖） |
| 強制收斂 / 替換通知 | 必要 | 移除 |
| 階段二玩家選擇 | 角色 + 場景 + 配件 + 心情 | **主軸 + 角色 + 場景 + 配件** |
| 階段四微調 | 預設/活潑/史詩 三段敘述 | 6 種 CSS 濾鏡風格（視覺欺騙） |
| 教育核心 | 「AI 受限於素材，必須妥協」 | 「AI 也只是組合資料庫 + 後製濾鏡，不是憑空創造」 |
