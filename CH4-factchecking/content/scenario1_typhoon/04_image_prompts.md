# 情境 1：颱風停課事件 — AI 圖片提示詞

## 需要生成的圖片清單

### 圖片 1：主圖（第二關使用）
**描述**：一張假的「颱風停課通知」手機截圖

#### Midjourney 提示詞（英文）
```
A fake mobile news screenshot showing emergency typhoon school 
closure announcement, red warning colors, exaggerated alert text, 
poor typography with inconsistent fonts, missing official logos, 
suspicious timestamp showing "2025/13/45", news app interface 
style, Traditional Chinese text "超級颱風來襲！教育部已決定全臺停課三天！", 
amateur quality intentional design flaws, 9:16 vertical format, 
photorealistic mobile screen --ar 9:16 --v 6
```

#### DALL-E 3 提示詞（中文，較直觀）
```
請生成一張看起來像是手機新聞 App 的假截圖：
- 標題：「超級颱風來襲！教育部已決定全臺停課三天！」
- 文字內容凌亂、字體大小不一致
- 缺少教育部或氣象署的官方徽章
- 發布時間顯示為錯誤格式：「2025/13/45 25:99」
- 整體用紅色警示色調
- 模仿 LINE TODAY 或 Yahoo 新聞 App 的介面
- 9:16 直式手機螢幕比例
```

#### Stable Diffusion 提示詞
```
fake news mobile screenshot, typhoon warning, taiwan, 
chinese text, red alert, sloppy typography, no official logo, 
phone interface, ui screenshot, vertical format
```

#### 後製處理（用 Photoshop / Figma）
生成圖片後，請手動：
1. 用紅框標註 3 個破綻位置（記錄座標）
2. 確保破綻足夠明顯（兒童能看出）但又不會太明顯（要有思考空間）

---

### 圖片 2：訊息 1 配圖（真實氣象報告）
**描述**：氣象署官方截圖

#### 取得方式
- **方法 A**：直接到中央氣象署官網截圖
- **方法 B**：用 AI 生成（請勿包含「政府機關」字樣，可寫「氣象局」）

#### 提示詞
```
台灣中央氣象署官方網站樣式的截圖，
顯示「明日北部低溫 15°C，陰天有雨」，
有清楚的氣象署徽章、整齊的版面、
官方時間戳記，9:16 手機螢幕比例
```

---

### 圖片 3：訊息 2 配圖（氣象主播）
**描述**：氣象主播播報截圖

#### 提示詞
```
電視氣象播報畫面，主播在播報「東北季風南下，
沿海風力 3-4 級」，背景有氣象圖，
專業新聞台風格，16:9 橫式比例
```

---

### 圖片 4：訊息 3 配圖（假警報，主圖的縮小版）
**描述**：誇張的紅色警報

直接用主圖（圖片 1）的縮小版即可。

---

### 圖片 5：訊息 4 配圖（假公告）
**描述**：假的學校停課公告 LINE 截圖

#### 提示詞
```
手機 LINE 群組對話截圖，
顯示一張「校長公告」圖片，
但圖片沒有學校徽章、文字排版凌亂，
傳送者頭像是預設的灰色圓圈，9:16 手機螢幕比例
```

---

### 圖片 6：訊息 5 配圖（真實豪雨特報）
**描述**：氣象署官方豪雨特報

#### 取得方式
- 從中央氣象署官網下載真實的特報範例
- 或 AI 生成（含完整官方標誌）

---

### 圖片 7-9：3 個角色立繪

#### 班導師（正確角色）
```
卡通風格的台灣國小女老師，穿著白襯衫，
戴眼鏡，溫和微笑，胸前掛著名牌，
親切專業的氣質，半身像，
透明背景或淺色背景，兒童繪本插畫風格
```

#### LINE 群組同學
```
卡通風格的台灣國小男學生，手拿手機，
表情驚慌好奇，穿著校服，半身像，
透明背景，兒童繪本插畫風格
```

#### 神秘網友
```
卡通風格的不明人物，戴著棒球帽和口罩，
看不清臉部，神秘感，半身像，
透明背景或暗灰色背景，兒童繪本插畫風格
```

---

## 開發者操作建議

### 工具推薦
- **Midjourney**：付費，品質最高（$10/月起）
- **DALL-E 3**：付費，與 ChatGPT Plus 一起（$20/月）
- **Bing Image Creator**：免費，基於 DALL-E 3
- **Stable Diffusion**：免費，但需自己架設

### 預算考量
- 如果只生成 3 張主圖：免費的 Bing Image Creator 已足夠
- 如果需要 10+ 張圖片：建議訂閱 Midjourney 一個月

### 圖片後製
1. 使用 **Figma**（免費）標註破綻位置
2. 使用 **TinyPNG**（免費）壓縮圖片
3. 統一尺寸：主圖 1080x1920、配圖 800x600

### 命名規則
```
images/
├── scenarios/
│   ├── scenario2/
│   │   ├── main.png           ← 主圖（第二關使用）
│   │   ├── message1.png       ← 訊息 1
│   │   ├── message2.png
│   │   ├── message3.png       ← 訊息 3（同主圖）
│   │   ├── message4.png
│   │   ├── message5.png
│   │   └── breakpoints/
│   │       ├── b201_zoom.png  ← 破綻 1 放大圖
│   │       ├── b202_zoom.png
│   │       └── b203_zoom.png
│   ├── scenario4/
│   └── scenario5/
└── characters/
    ├── teacher.png
    ├── classmate.png
    └── netizen.png
```
