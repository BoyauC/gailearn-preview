# AI Hallucination Bug Catcher

這是一個給國中生使用的 AI 幻覺辨識互動遊戲。

## 檔案結構

```
index.html              遊戲程式（GitHub Pages 首頁）
questions/level-01.csv  第 1 題題庫
questions/level-02.csv  第 2 題題庫
questions/level-03.csv  第 3 題題庫
questions/level-04.csv  第 4 題題庫
questions/level-05.csv  第 5 題題庫
```

## 修改題庫

使用 Excel 或 Google 試算表開啟 `questions` 資料夾中的 CSV 檔。每個檔案對應一題；請保留第一列欄位名稱，完成後存回 CSV 格式。重新整理遊戲頁面後，程式會讀取更新內容。

## 本機預覽

請在此資料夾啟動本機伺服器，再開啟 `http://localhost:8000/`：

```powershell
cd 'D:\Codex_Run\Github Processing\ai-bug-catcher'
python -m http.server 8000
```

## GitHub Pages

將本資料夾作為儲存庫根目錄部署即可，GitHub Pages 會自動載入根目錄的 `index.html`。