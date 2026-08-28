# 逃離過濾氣泡｜正式建築素材

## 正式採用方向

正式透明合成候選使用 `building-composite-v4.webp`，由已確認的 `filter-bubble-building-map-scale-v2.webp` 重建無人物版本；維持原本的小型地圖比例、氣泡窗、平面探索台、三個資訊節點與入口方向。

`filter-bubble-building-master-candidate-v1.webp` 是先前未採用的高細節嘗試，不接入地圖，也不作正式分層來源。

## `filter-bubble-building-master-candidate-v1.webp`

狀態：正式分層前的建築母圖候選，尚未接入遊戲。

### 已保留

- 緊湊圓角建築輪廓與局部開放屋頂。
- 深藍灰牆體、暖白色牆緣及紫色識別框。
- 大小不同的青色氣泡窗，象徵推薦資訊與過濾氣泡。
- 右前方、朝中央草地的拱形入口。
- 室內中央推薦系統核心與多類資訊節點。
- 建築底部低矮植栽。

### 與概念稿的主要差異

- 中央核心由較平面的圓形資訊盤，轉為更立體的資訊氣泡球。
- 室內增加少量學習工作區，但維持中央辨識物清楚。
- 外牆氣泡窗排列重新整理，避免縮小後過度擁擠。

以上差異需確認後才進行正式分層。

### 透明度

- 使用真正 RGBA 透明背景。
- 已清除低於 96 的背景殘留透明像素並裁切有效範圍。
- 母圖保存為無損 WebP；尚未拆成 `building-back`、`building-solid`、`building-foreground` 與 `building-shadow`。

### 生成方式

Codex 內建影像生成工具（imagegen 技能，`precise-object-edit` 類型）。以兩張已確認的第一棟概念稿作為造型、視角與入口方向參考，移除人物、地圖、道路、文字與介面。
