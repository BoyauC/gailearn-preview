# 高中 AI 學習基地共用核心

`room-registry.js` 集中登錄四房正式 ID、網站順序、顯示名稱、資料夾、房間 GA 標題與地圖入口 GA 標題；地圖與房間頁不得各自維護另一份名稱表。

`progress-store.js` 是第一版純前端統一進度介面原型。

- localStorage key：`gailearn.hs_ai_learning_base.progress.v1`
- 僅保存四個固定 `room_id` 的完成狀態、首次完成時間、完成順序與資料更新時間。
- `completeRoom(roomId)` 具有首次完成去重；回顧已完成房間不會再次加入完成順序或增加完成數。
- `acknowledgeReward(roomId)` 只在房間已有完成紀錄時記錄一次性授章提示；`return` 參數本身不能建立完成紀錄。
- 不保存學生姓名、暱稱、自由輸入文字或證書排版姓名。
- 模組界面可在第二版改由 Firebase 實作，但目前不連線、不登入、不使用後端。
