# 圖片需求清單

這份文件列出整個遊戲所需的全部圖片資源、規格、提示詞與生成順序建議。

所有圖片提示詞同時記錄在 `game/data/image_prompts.csv`，方便程式檢查 / 你批次生成。

---

## 總覽

| 類別 | 數量 | 規格 | 用途 |
|---|---|---|---|
| 吱吱立繪 | 4（核心）+ 3（建議）+ 1 placeholder | 800×1000 WebP 透明 | 說明頁、前導、各場景 |
| 開場 flipbook | 18 | 1600×900 WebP | 前導動畫 |
| 訊息配圖 | 14（s1×5 + s2×5 + s3×4，s3_msg3 純文字無圖） | 800×600 WebP | 第一關訊息（兩張假圖在第二關當主圖） |
| 角色立繪 | 9（每情境 3） | 800×1000 WebP 透明 | 第三關 |
| 破綻放大圖 | 18（每情境 6 ＝ 2 張假圖 × 3 破綻） | 400×400 WebP | 第二關說明卡 |
| UI 徽章 | 1 | image_logo.webp | 圖片右下浮層 |
| **總計** | **72 張** | | 全部已完成 |

---

## 1. 吱吱立繪（最優先，最常出現）

吱吱是遊戲主角，貫穿全部畫面。共需 4 張核心立繪 + 3 張建議備用。

**共通設定**：
- 尺寸：800 × 1000 px（3:4 直式）
- 格式：PNG 透明背景
- 風格：手繪繪本風、Q 版圓潤、棕色描邊（類似 LINE 貼圖風格）
- 角色：**奶黃色小雞**，戴著棕色耳機式麥克風（如 podcaster 造型），脖子有橘色蝴蝶結領結，雙頰有橘色圓形腮紅，肚子部位略偏深

**已有的預設立繪**：`吱吱260427.png`（在 CH4-factchecking 資料夾根目錄）是現成的中性站姿，已被複製為 5 個檔名給程式預設使用。新生成的圖只要做出對應姿勢即可，**保持外型一致**。

**保持角色一致的關鍵字**（每次生成請帶上）：
```
same chick character design as previous, chubby cartoon chick mascot,
pastel pale yellow body, brown studio headphones with microphone,
orange bow tie, round orange cheek blushes, brown outline,
hand drawn storybook style, transparent background, 3:4 vertical portrait
```

**建議生成順序**：先把 **jiji_stop** 生出來，後面 3 張用它當 reference 圖（Midjourney `--cref`，或在 DALL-E 用同一段對話延續），可保持外觀一致。

---

### 1-1. jiji_stop（核心）— 說明頁第 1 步「停」

**Midjourney**：
```
cute chubby cartoon chick mascot, pastel pale yellow body, wearing brown
studio headphones with microphone, orange bow tie, round orange cheek
blushes, brown outline, hand drawn storybook style, making a stop hand
gesture palm facing forward, alert serious expression, slight frown,
transparent background, 3:4 vertical portrait, soft warm palette --ar 3:4 --v 6
```

**DALL-E 3**（中文）：
```
請畫一隻可愛圓潤的卡通小雞角色，奶黃色身體，戴著棕色耳機式麥克風，
橘色蝴蝶結領結，雙頰有橘色圓形腮紅，棕色描邊手繪繪本風格，
做出停止手勢（手掌朝前），表情認真警覺，
透明背景，直式 3:4 比例
```

---

### 1-2. jiji_check（核心）— 說明頁第 2 步「查」

**Midjourney**：
```
same character design as previous, chubby cartoon chick mascot, pastel
pale yellow body, brown studio headphones with microphone, orange bow
tie, blush cheeks, brown outline, holding a large round magnifying glass
close to face, curious focused expression eyes slightly enlarged through
the lens, leaning forward, transparent background, 3:4 vertical portrait,
hand drawn storybook style --ar 3:4 --v 6
```

**DALL-E 3**：
```
同一隻奶黃色卡通小雞角色，戴棕色耳機麥克風、橘色蝴蝶結領結、
橘色圓腮紅、棕色描邊手繪風，這次拿著一個圓形大放大鏡靠近臉部，
眼睛透過鏡片放大，表情好奇專注、身體略向前傾，
透明背景，直式 3:4 比例
```

---

### 1-3. jiji_ask（核心）— 說明頁第 3 步「問」

**Midjourney**：
```
same character design as previous, chubby cartoon chick mascot, brown
studio headphones with microphone, orange bow tie, blush cheeks, brown
outline, raising microphone toward upper side as if interviewing someone,
other wing pointing into the distance, determined confident expression,
beak slightly open like speaking, energetic forward pose, transparent
background, 3:4 vertical portrait, hand drawn storybook style --ar 3:4 --v 6
```

**DALL-E 3**：
```
同一隻奶黃色卡通小雞角色，舉起麥克風朝向側上方（像在訪問人），
另一隻翅膀指向遠方，表情堅定有自信，嘴喙微張像在發問，
身體積極前傾，透明背景，直式 3:4 比例
```

---

### 1-4. jiji_cheer（核心）— 前導動畫、開始按鈕、慶祝場景

**Midjourney**：
```
same character design as previous, chubby cartoon chick mascot, brown
studio headphones with microphone, orange bow tie, blush cheeks, brown
outline, both wings raised in let's go pose, one wing pumped up, big
happy smile, sparkling eyes, energetic full of vitality stance,
transparent background, 3:4 vertical portrait, hand drawn storybook style
--ar 3:4 --v 6
```

**DALL-E 3**：
```
同一隻奶黃色卡通小雞角色，雙翅高舉呈現「準備出發」姿勢
（一翅握拳上揚），開心微笑、眼睛閃亮有光，
整體姿態充滿活力，透明背景，直式 3:4 比例
```

---

### 1-5～1-7. 備用立繪（之後生成即可，先放置佔位即可開發）

| ID | 表情 | 用途 |
|---|---|---|
| jiji_thinking | 翅膀撐臉頰眼睛上看 | 第二關開場「我們來找破綻」 |
| jiji_surprised | 嘴喙張大雙翅抱頭 | 答錯時出現的提示 |
| jiji_proud | 雙翅交叉微笑挑眉 | 過關時的祝賀 |

提示詞參考 `image_prompts.csv`。

---

## 2. 第二關主圖（用第一關的兩張假訊息圖）

> v3 之後不再單獨生 `sX_main`，第二關主圖直接從該情境的兩張假訊息圖（msg2、msg4）隨機抽 1 張當主圖；每張假圖各有 3 個破綻，因此每情境一共 6 個破綻位置。

### 2-1. s1 颱風停課事件

| Source | ID | 標題 | 位置 (x%, y%) | 容錯 |
|---|---|---|---|---|
| s1_msg3 | B1-01 | 沒有官方標誌 | (5, 20) | 4.5 |
| s1_msg3 | B1-02 | 文字排版不規則 | (38, 86) | 6.5 |
| s1_msg3 | B1-03 | 時間戳記可疑 | (90, 95) | 3.5 |
| s1_msg4 | B1-04 | 來源頭像非官方 | (10, 30) | 6.0 |
| s1_msg4 | B1-05 | 公告排版不正規 | (39, 53) | 7.5 |
| s1_msg4 | B1-06 | 日期時間前後矛盾 | (44, 81) | 3.5 |

### 2-2. s2 校園好消息新聞

| Source | ID | 標題 | 位置 (x%, y%) | 容錯 |
|---|---|---|---|---|
| s2_msg2 | B2-01 | 企業 LOGO 不對勁 | (82.49, 9.99) | 9.85 |
| s2_msg2 | B2-02 | 手部細節異常 | (38.23, 65.79) | 5.32 |
| s2_msg2 | B2-03 | 背景融合痕跡不正常 | (7.46, 46.87) | 7.49 |
| s2_msg4 | B2-04 | 不合理索取敏感個資 | (45.27, 68.78) | 21.62 |
| s2_msg4 | B2-05 | 主辦單位名稱不明 | (85.91, 5.02) | 4.88 |
| s2_msg4 | B2-06 | 沒有隱私權政策說明 | (15.68, 90.38) | 9.58 |

### 2-3. s3 免費 iPhone 廣告

| Source | ID | 標題 | 位置 (x%, y%) | 容錯 |
|---|---|---|---|---|
| s3_msg2 | B3-01 | 活動限時時間緊迫 | (38.79, 21.09) | 10.5 |
| s3_msg2 | B3-02 | 不需支付費用 | (65.29, 20.93) | 14.5 |
| s3_msg2 | B3-03 | 沒有品牌或廠商標示，只有 QR Code | (84.04, 81.08) | 13.2 |
| s3_msg4 | B3-04 | 『按讚分享免費送』典型話術 | (50.00, 14.00) | 20.0 |
| s3_msg4 | B3-05 | 數量有限營造限量 | (87.42, 73.83) | 12.25 |
| s3_msg4 | B3-06 | 完全免費不合邏輯 | (88.62, 25.39) | 11.29 |

→ s3 破綻座標來自 `assets/images/scenarios/s3/marked/s3_msg{2,4}-marked.webp` 用綠色圈標示後以 PIL + scipy 自動偵測得出。

---

## 3. 訊息配圖（第一關用）

**規格**：800×600 px（4:3）WebP

s1 / s2 各 5 張，s3 共 4 張（s3_msg3「免費補助臼齒窩溝封填！」為純文字無圖），合計 14 張。詳見 `data/prompts/02_level1_message_prompts.csv`，asset_id 為 `s1_msg1` ~ `s3_msg5`。

**簡化版**：
- 真訊息（msg1、3、5）：模仿真實新聞 App、政府機構公告、學校公告
- 假訊息（msg2、4）：誇張紅色 / 可疑連結 / 不對的徽章 — 同時當第二關主圖

⚠️ 訊息配圖會放在「假手機外框」插畫裡顯示，所以本身比例可以是 4:3、外框用 CSS 加。

---

## 4. 角色立繪（第三關用）

**規格**：800×1000 px PNG 透明背景，**3:4 直式**

每情境 3 個（1 正 2 錯），共 9 個。

| 情境 | 正確角色 | 錯誤角色 1 | 錯誤角色 2 |
|---|---|---|---|
| s1 颱風 | 王老師（班導） | 小明（LINE 同學） | 神秘網友 |
| s2 捐款 | 李主任（學務） | 小華（同學） | 假帳號企業 |
| s3 免費 | 張警官（社區警察） | 阿傑（同學） | ???（網路評論） |

詳細提示詞見 `image_prompts.csv`。

---

## 5. 破綻放大圖（第二關說明卡用）

**規格**：400×400 px WebP，**正方形**

每情境 6 張（2 張假圖 × 3 破綻），共 **18 張**。每張是主圖中對應破綻區域的「裁切放大」，幫助玩家看清楚問題在哪。

**生成方式（已使用 PIL 自動化）**：
1. 從 `breakpoints.csv` 讀取 `center_x_pct / center_y_pct / tolerance_pct`
2. 在原始假圖上以 hotspot 為中心、tolerance×1.6 為邊長進行 crop（避免邊緣切到）
3. 強制正方形並 resize 到 400×400
4. 覆蓋紅色橢圓 outline 標記具體位置
5. 輸出 `s{N}_zoom_B{N}-{ID}.webp`

可重複執行；s3 的 6 張即由 `assets/images/scenarios/s3/marked/s3_msg{2,4}-marked.webp` 的綠色圈座標重新生成。

---

## 6. 介面元素（UI assets）

這些不需要 AI 生成，建議用免費圖示庫：

- **Tabler Icons**（推薦，https://tabler.io/icons）：放大鏡、暫停、播放、獎盃、星星、設定齒輪、靜音、提示燈泡
- **背景**：操場、教室、新聞攝影棚（給吱吱用），可用 freepik 或 Unsplash

---

## 7. 生成優先順序建議

如果一次只能做一部分，建議這個順序：

**第 1 批（必要，做完就可開發說明頁＋骨架）**
1. jiji_stop
2. jiji_check
3. jiji_ask
4. jiji_cheer

**第 2 批（做完可玩第一關）**
5. s1_main + s1_msg1~5
6. s2_main + s2_msg1~5
7. s3_main + s3_msg1~5

**第 3 批（做完可玩第二關 + 第三關）**
8. 9 個角色立繪
9. 9 個破綻放大圖

**第 4 批（最後潤色）**
10. jiji_thinking / surprised / proud
11. 介面元素

---

## 8. 工具與費用建議

| 工具 | 費用 | 適用 |
|---|---|---|
| Midjourney | $10/月 | 品質最高，吱吱立繪首選 |
| DALL-E 3（ChatGPT Plus） | $20/月 | 中文提示直觀 |
| Bing Image Creator | 免費 | 同 DALL-E 3，先用免費試試 |
| Stable Diffusion（本機） | 免費 | 大量生成、需技術門檻 |

**估算**：
- 若只生成 40 張，用 Bing Image Creator 免費試做即可
- 若想品質統一，訂閱 Midjourney 一個月（$10）足夠

---

## 9. 後製建議

1. **壓縮**：用 TinyPNG（https://tinypng.com/）壓縮所有 PNG，每張壓到 200KB 以下
2. **裁切**：吱吱立繪統一裁切成 800×1000，主圖 1600×900
3. **去背**：Adobe Express 或 remove.bg 免費去背
4. **驗證**：每張圖在不同瀏覽器確認顏色一致

---

## 10. 命名規則（再次強調）

存檔時請嚴格依照 `image_prompts.csv` 中 `final_path` 欄的路徑命名，否則程式找不到圖。

正確：`assets/images/narrator/jiji_stop.webp`
錯誤：`吱吱-停.png`、`Jiji_Stop.PNG`、`吱吱停止.png`
