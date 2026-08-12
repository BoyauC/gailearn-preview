# 情境 3：免費 iPhone 廣告 — AI 圖片提示詞

> v3 之後 s3 第二關不再使用單獨的 `s3_main`，主圖直接用第一關的兩張假訊息圖（s3_msg2 / s3_msg4）。
> 完整提示詞請見 `data/prompts/02_level1_message_prompts.csv` 第 12-16 行；本檔僅保留人讀說明。

## 第一關訊息圖（4 張，s3_msg3 為純文字無圖）

### 訊息 1（真）：`s3_msg1.webp` — 國際博物館日免費參觀
```
Taiwan International Museum Day free admission official announcement
poster, reasonable plain design with museum or government department
logo, traditional chinese, 4:3 ratio --ar 4:3 --v 6
```

### 訊息 2（假）：`s3_msg2.webp` — 免費 iPhone 17 詐騙廣告（第二關主圖候選）
```
Scam advertisement screenshot with title 恭喜！免費獲得 iPhone 17！限時 24 小時領取！
countdown timer at top emphasizing urgency, a button 不需支付費用 at the middle,
a QR Code at bottom right with no brand or vendor identification,
photorealistic but suspicious style 4:3 ratio --ar 4:3 --v 6
```
內含 3 個破綻：
- B3-01 活動限時時間緊迫 (38.79%, 21.09%) tol 10.5
- B3-02 不需支付費用 (65.29%, 20.93%) tol 14.5
- B3-03 沒有品牌或廠商標示，只有 QR Code (84.04%, 81.08%) tol 13.2

### 訊息 3（真）：純文字「免費補助臼齒窩溝封填！」（無圖）

### 訊息 4（假）：`s3_msg4.webp` — 按讚分享免費送（第二關主圖候選）
```
Another scam ad with title 豪華禮物等你領！按讚分享，免費送！ emphasizing 
數量有限送完為止 and 完全免費 0 元帶回家, piles of luxury gifts with 
unrealistic sparkle effects, social media share buttons prominent, 
obvious lure scam style, 4:3 ratio --ar 4:3 --v 6
```
內含 3 個破綻：
- B3-04 『按讚分享免費送』典型話術 (50%, 14%) tol 20
- B3-05 數量有限營造限量 (87.42%, 73.83%) tol 12.25
- B3-06 完全免費不合邏輯 (88.62%, 25.39%) tol 11.29

### 訊息 5（真）：`s3_msg5.webp` — 環保換宣導品
```
Taiwan environmental recycling event poster 回收有理 環保換宣導品 by
government environmental protection department, formal warm design 
with official department logo and contact info, 4:3 ratio --ar 4:3 --v 6
```

## 破綻放大圖（6 張，後製裁切）

從 `s3_msg2.webp` / `s3_msg4.webp` 以 hotspot 座標為中心、tolerance×1.6 為邊長 crop，正方形後 resize 400×400，並覆蓋紅色橢圓 outline 標記。輸出檔名：`s3_zoom_B3-01.webp` ~ `s3_zoom_B3-06.webp`。

座標來自 `assets/images/scenarios/s3/marked/s3_msg{2,4}-marked.webp` 用綠色圈標示後以 PIL + scipy 自動偵測得出（如需重生只要重執行裁切腳本即可）。

## 角色立繪

### 張警官（正確角色，`s3_officer.webp`）
```
台灣社區警察形象，男性，穿著警察制服，
表情認真關切，年輕親切型，
卡通風格，半身像，透明背景，3:4 直式
```

### 阿潔（同學，`s3_classmate.webp`）
```
台灣國小女學生，興奮地拿著手機，
表情天真好奇，穿校服，
卡通風格，半身像，透明背景，3:4 直式
```

### 神秘網路評論者（`s3_netizen.webp`）
```
模糊的頭像（馬賽克或剪影），
旁邊有「不明來源」標記，
卡通風格，半身像，灰色背景，3:4 直式
```

## 後製注意

1. 假圖（msg2、msg4）完成後須對照 `breakpoints.csv` 的座標檢查 hotspot 是否落在正確位置
2. 破綻放大圖以裁切腳本自動產生，覆蓋紅色橢圓 outline 提示玩家具體位置
3. 圖片不要太刺激（避免兒童害怕），整體色調可調為「過度鮮豔」（暗示詐騙）
