# 情境 2：校園捐款溫馨騙局 — AI 圖片提示詞

## 主圖（第二關使用）

### 描述
一張看起來溫馨的「企業捐贈平板給學生」新聞照片，但細看有 AI 破綻

### Midjourney 提示詞
```
A heartwarming fake news photo showing schoolchildren receiving 
tablets from a fake corporate donation event, Asian elementary 
students smiling holding iPads, classroom setting, corporate 
banner in background with distorted logo, AI-generated hand 
imperfections (extra fingers visible on some students), 
slight background blending artifacts, warm lighting, but with 
subtle uncanny valley effects, photorealistic but suspicious 
detail flaws --ar 16:9 --v 6
```

### DALL-E 3 提示詞（中文）
```
請生成一張看起來溫馨但實際上是 AI 偽造的捐贈新聞照片：
- 場景：教室裡，幾位台灣國小學生（5-6 個）開心地拿著平板電腦
- 背景：有一個「企業捐贈活動」的背景看板，但 LOGO 字體模糊變形
- 學生的手部細節故意有問題（如某個學生手指看起來怪）
- 教室桌椅與牆壁邊界稍微模糊融合
- 整體氛圍溫馨但有 AI 生成的痕跡
- 16:9 橫式比例
```

## 其他圖片需求

### 訊息 1（真）：紅十字會募款公告
```
紅十字會官方募款公告海報，正式徽章，
募款資訊清晰，台灣繁體中文，9:16 直式
```

### 訊息 3（真）：家扶基金會
```
家扶基金會認養計畫公告，
有清楚的基金會徽章和聯絡資訊，
台灣繁體中文，9:16 直式
```

### 訊息 4（假）：愛心大使招募
```
彩色繽紛的「愛心大使招募」廣告，
強調「填表即可領禮物」，
有可疑的個資表單，誇張色彩，9:16 直式
```

### 訊息 5（真）：學校感謝家長
```
校長頒發感謝狀給家長代表的真實照片風格，
平實、自然，台灣國小場景，9:16 直式
```

## 角色立繪

### 李主任（學務主任）
```
台灣國小女性主任，穿正式西裝外套，
和善表情，戴眼鏡，胸前掛著教師證，
卡通風格，半身像，透明背景
```

### 小華（同學）
```
台灣國小男學生，穿校服，
興奮看著手機的表情，
卡通風格，半身像，透明背景
```

### 假帳號企業代表
```
戴著面具或頭像被打問號的神秘人物，
旁邊有「企業認證？」的標誌（打叉），
卡通風格，半身像，深色背景表示「不明來源」
```

## 後製建議

1. 主圖生成後，用 Photoshop 確認 3 個破綻位置足夠明顯
2. 在開發者文件中標註 3 個 hotspot 的精確座標
3. 製作「破綻放大圖」3 張（用於提示功能）
