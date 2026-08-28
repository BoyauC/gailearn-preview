# 正式地圖素材與比例預覽

## `formal-map-four-building-scale-preview-v6.webp`

狀態：四棟正式透明建築第一輪實際地圖比例檢查稿。

- 地貌使用 `terrain/terrain-base-v1.webp`。
- 四棟建築沿用已確認的地圖比例簡化稿重新整理，不另採高細節建築方向。
- 已移除四張簡化稿中的尺度人物與草地背景。
- 正式阿岳測試精靈顯示高度為 165 px，腳邊加入可見橢圓光環。
- 長椅與細柱燈使用最初比例預覽尺寸的 56.25%（0.75 × 0.75）。
- 樹木、矮牆花台與左側廣場維持已確認比例。
- 建築陰影目前是柔和位置示意，尚未作最終陰影分層。
- 阿岳腳下使用貼近雙腳的小型柔和接地陰影，不再使用深黑實心橢圓；青色互動光環與接地陰影維持獨立圖層。
- 本圖只供確認建築、人物、廣場及邊界元件的相對比例，不直接接入遊戲。

## 四棟正式透明合成素材

| 房間 | 正式候選檔案 |
|---|---|
| 逃離過濾氣泡 | `../buildings/filter-bubble/formal/building-composite-v4.webp` |
| SIFT 偵探 | `../buildings/sift-detective/formal/building-composite-v4.webp` |
| AI 夥伴協作導演 | `../buildings/collaboration-director/formal/building-composite-v4.webp` |
| AI 學伴設計師 | `../buildings/companion-designer/formal/building-composite-v4.webp` |

以上均為單張透明合成圖；比例確認後再拆成後景、主體、前景與陰影層。

## 中間版本

- `formal-map-four-building-scale-preview-v1.webp` 至 `v3.webp` 是背景抽離測試，含殘邊、草地色差或誤刪牆體，不作正式使用。
- `formal-map-four-building-scale-preview-v4.webp` 保留初次完整比例比較，但阿岳腳下使用過深的暫用陰影；正式比例確認以 v5 為準。
- `formal-map-four-building-scale-preview-v5.webp` 已修正人物接地陰影，但長椅與細燈柱仍為最初比例的 75%；最新比例檢查以 v6 為準。
- 各建築 `building-composite-v1.webp` 至 `v3.webp` 同為抽離測試，不接入遊戲。

## 生成與整理方式

四棟建築使用 Codex 內建影像生成工具（imagegen 技能，`background-extraction` 類型），逐棟以已確認簡化稿為唯一造型來源，在純洋紅工作背景上重建無人物版本；再於本機抽離工作背景並保存為無損透明 WebP。
