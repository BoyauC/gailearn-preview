# 高中 AI 學習基地

正式共通地圖入口：`HS-AI-learning-base/index.html`

## 網址

- 共通地圖：`https://boyauc.github.io/gailearn-preview/HS-AI-learning-base/`
- 指定入口：在共通地圖網址加上`?entry=<room_id>`。
- 房間完成返回：房間寫入共用進度後，回到地圖並帶入`?return=<room_id>`。

## 房間上線控制

四房資料定義集中在`shared-core/room-registry.js`。房間尚未完成時維持`available: false`，地圖會顯示「房間製作中」且不執行跳轉；房間通過測試後改為`available: true`，即可使用該房的`folder`正式路徑。

## 顯示與座標

地圖採固定`1920 × 1080`、16:9世界畫布，整體等比例縮放。建築、人物、房門、出生點及碰撞區共用`map-layout.js`定義的百分比座標。

`prototypes/`保留測試工具與往返驗證頁，不是玩家正式入口。
