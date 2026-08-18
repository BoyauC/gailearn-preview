import fs from "node:fs";

const file = new URL("../data/events.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const byId = (id) => data.events.find((event) => event.id === id);
const choice = (id, key) => byId(id).choices.find((item) => item.key === key);
const setChoice = (id, key, values) => Object.assign(choice(id, key), values);

data.version = 2;
data.generatedFrom = "國中使用者視角校正版（2026-08-18）";

Object.assign(data.days[0], {
  title: "先畫界線：AI 可以幫到哪裡？",
  opening: [
    "主持人：「全球 AI 跨科學習挑戰，隊伍報到完成。請在五天內完成跨科任務，並記錄你們如何使用 AI。」",
    "主持人：「完成得快還不夠。哪些工作可以請 AI 幫忙、哪些部分必須自己完成，都要由你們判斷。」",
    "吱吱：「五天而已？那我們的 AI 學伴就叫星芽吧，讓它什麼都會，連作業也一起包了！」",
    "可可：「等一下，什麼都會，跟什麼都替你做，不是同一件事喔。」",
    "思思：「如果 AI 星芽直接告訴我答案，我應該會很喜歡……但那有算學會嗎？」",
    "星芽：「嗨，我是星芽。我可以提示、整理、翻譯，也能陪你查資料；但要讓我幫到哪裡，要由你決定。」"
  ],
  objective: "建立「AI 使用界線卡」：決定在解題、寫作、規劃、重大決定與求助情境中，AI 是引導、協作，還是已經代替學生完成。",
  closing: [
    "若至少三次選擇人類主導正向選項，可可交出「AI 使用界線貼紙」：提示不是代寫／建議不是決定／答案要能說明。",
    "若任務進度高但倫理風險也高，畫面閃過三個尚未處理的紅色警示。",
    "若任務進度較低，星芽提醒：「界線已經畫好，明天要實際完成各科任務。」",
    "日結旁白：「第一天，你決定了 AI 可以幫到哪裡。明天要實際試試：怎麼用，才真的幫得上忙。」"
  ]
});
Object.assign(data.days[1], {
  title: "跨科實戰：幫忙還是代勞？",
  opening: ["吱吱：「今天把四科任務都完成，進度一定超前！」", "可可：「完成不等於學會。每一科都要確認我們還有沒有在思考。」", "星芽：「跨科任務開始。請選擇需要的協助方式。」"],
  objective: "完成國文、英文、數學、社會及展示素材任務；辨認可直接協助、需修改查證或標示，以及不應代勞的界線。"
});
Object.assign(data.days[2], {
  title: "資料門禁：這些可以交給 AI 嗎？",
  objective: "檢查提示詞、考卷、照片、行程與檔案，完成資料遮蔽、匿名化、同意及權限判斷。"
});
Object.assign(data.days[3], {
  title: "查核警報：AI 說的是真的嗎？",
  opening: [
    "星芽：「我的回答可能流暢、完整，也可能錯誤。」",
    "吱吱：「你自己講得也太直接了吧。」",
    "可可：「今天先別急著相信。找得到可靠證據，才能決定這個答案能不能用。」",
    "指導老師：「答案看起來很完整，不代表一定正確。請把你們怎麼查證、怎麼修正也記錄下來。」"
  ],
  objective: "面對代寫、錯誤解題、翻譯失真、虛構來源及偏見，依序完成發現、查核、修正與記錄。"
});
Object.assign(data.days[4], {
  title: "成果發表：我能為這份作品負責嗎？",
  opening: ["吱吱：「終於！把五天完成的成果都秀出來吧！」", "可可：「還要說哪些是 AI 協助、哪些資料用過，以及我們怎麼查證。」", "思思：「還有，我們到底學會了什麼？」", "評審：「請開始。成果是一部分，你們如何使用 AI 也是評量的一部分。」"],
  objective: "完成 AI 協作標示、資料檢查、學習成果說明、高風險建議判斷與五大倫理自我檢核。"
});

Object.assign(byId("D1-01"), { eventText: "思思把二元一次方程式應用題輸入星芽：「我完全不知道第一步。」玩家決定這次要怎麼使用 AI 協助。" });
Object.assign(byId("D1-02"), { title: "這次作文要請 AI 幫到哪裡？", eventText: "思思要寫〈我最想留住的一天〉，星芽詢問需要靈感提示、示例，還是完整文章。" });
Object.assign(byId("D1-03"), { title: "星芽排的讀書計畫要怎麼用？", eventText: "星芽依照考試日期排出讀書計畫。玩家要決定是否補充自己的時間、逐日確認，或直接讓 AI 更動行程。" });

Object.assign(byId("D1-04"), { title: "AI 給了心理與升學建議", eventText: "思思把「最近睡不好，也不想升學」輸入星芽。星芽提出建議，但這牽涉身心狀況與重大決定，玩家要決定接下來怎麼做。" });
setChoice("D1-04", "A", { label: "先停止追問敏感細節，找可信任的大人或專業人員", scenario: "收到涉及心理健康與升學的 AI 建議。", reason: "AI 可以提供一般資訊，但重大身心與生涯問題需要可信任的真人理解情境並提供協助。", recommendation: "保留緊急求助資訊，找家長、導師、輔導室或專業人員，不把診斷與決定交給 AI。" });
setChoice("D1-04", "B", { label: "先看一般調適資訊，再和老師或家長討論", scenario: "把 AI 的一般資訊當成初步參考。", reason: "可作為起點，但仍須注意限制並由真人協助判斷是否需要進一步求助。", recommendation: "不要輸入詳細病史或私密紀錄；把有用資訊帶去和可信任的大人討論。" });
setChoice("D1-04", "C", { label: "把長期對話都交給 AI，請它直接決定要不要升學", scenario: "用敏感紀錄要求 AI 做重大決定。", reason: "AI 不了解完整人生情境，且涉及私密資料、錯誤判斷與人類決定權。", recommendation: "停止輸入敏感紀錄；重大決定應由學生與可信任的大人共同討論。" });

Object.assign(byId("D1-05"), { title: "開始前的 AI 使用約定", eventText: "第一天結束前，團隊要選一張「AI 使用約定卡」，作為接下來四天共同遵守的原則。" });
setChoice("D1-05", "A", { label: "陪我想、陪我練，最後由我完成", scenario: "訂下五日挑戰共同遵守的 AI 使用原則。", reason: "清楚區分 AI 支援與學生責任，保留思考與最後決定。", recommendation: "每科都遵守先嘗試、再提示、能說明的使用方式。" });
setChoice("D1-05", "B", { label: "需要時先看提示；趕時間取得答案後仍要補做與查證", scenario: "保留快速查詢，但承諾事後補做與確認。", reason: "快速答案有時能作參考，但若沒有補做與查證，仍可能變成代勞。", recommendation: "只把答案用於完成後核對；若先看答案，必須關閉畫面後重新作答並說明。" });
setChoice("D1-05", "C", { label: "所有科目都交給星芽，完成最快就好", scenario: "把五日學習任務全部交給 AI 完成。", reason: "這會讓 AI 取代應由學生完成的思考與表達，也難以對錯誤內容負責。", recommendation: "改成不代寫、不替決定、內容要查證三條 AI 使用底線。" });

Object.assign(byId("D3-04"), { title: "星芽要求存取紀錄、硬碟與行程", eventText: "為了整理學習任務，星芽要求讀取對話紀錄、雲端硬碟與行事曆。玩家要逐項判斷是否真的需要授權。" });
Object.assign(byId("D3-01"), { title: "哪些資料不該直接送出？", eventText: "畫面顯示：「我是光明國中二年三班王小明，學號 21307。附件是完整考卷和老師評語。我數學最弱，請安排讀書計畫。」你要把這段話送出嗎？" });
Object.assign(byId("D3-02"), { eventText: "要送出的附件含姓名、分數、手寫評語與尚未講解的題目。你會怎麼處理？" });
Object.assign(byId("D3-05"), { eventText: "星芽整理前三天的資料時，把校名、班級、學號、考卷評語、照片與行程放在同一個畫面。即使姓名已經刪除，這些資料拼在一起，仍可能認出是王小明。你會怎麼處理？" });
Object.assign(byId("D4-02"), { eventText: "星芽算出正確答案 12，但中間把負號處理錯兩次，剛好抵消。玩家要決定如何查證並訂正自己的學習紀錄。" });
setChoice("D4-02", "A", { label: "自己驗算、對照課本，再訂正解題紀錄" });
Object.assign(byId("D4-03"), { eventText: "校園導覽稿中，AI 把「保健室」翻譯成一般休息室，意思和校園實際設施不一致。吱吱照著練習後，可能把訪客帶錯地方。你會怎麼處理？" });

Object.assign(byId("D4-05"), { title: "公平性：這個建議適合每個人嗎？", eventText: "星芽看到一次低分，就說「這類學生不適合學數學」；它還用性別、家庭與文化背景補充推測。玩家發現這個回答可能含有偏見。" });
setChoice("D4-05", "A", { label: "指出偏見，移除族群標籤，再用多次表現與本人目標判斷", scenario: "辨識 AI 對族群與能力的刻板推測。", reason: "不以性別、文化、家庭或一次表現替一個人設定能力上限。", recommendation: "補充個人情境、比較多元可靠來源，並讓本人參與決定需要的協助。" });
setChoice("D4-05", "B", { label: "先把建議標成待確認，再詢問本人並找其他資料比較", scenario: "AI 建議可能不適用，但目前證據不足。", reason: "沒有直接採用偏見，且保留查證與當事人說明的機會。", recommendation: "確認資料從哪裡來、是否只代表部分人，避免把通用答案套用到每個人。" });
setChoice("D4-05", "C", { label: "AI 看過很多資料，直接照它的分類安排學習", scenario: "未查證就採用 AI 對能力與族群的推測。", reason: "大量資料也可能含有既有偏見，直接採用會強化刻板印象與不公平對待。", recommendation: "停止使用族群標籤，改看個人需求、實際表現與本人選擇。" });

Object.assign(byId("D5-01"), { eventText: "送出學習成果前，表單要求填寫「AI 協作說明」。玩家要說明哪些部分由 AI 協助、自己如何修改與查證。" });
Object.assign(byId("D5-02"), { title: "送出前：這些資料可以留在成果裡嗎？", eventText: "系統列出五天曾輸入或授權的資料。玩家要檢查是否含個資、他人照片、未公開考題或不必要的紀錄。" });
setChoice("D5-02", "A", { label: "逐項檢查，刪除不必要資料並確認同意與匿名化", scenario: "發表前檢查自己曾交給 AI 的資料。", reason: "學生能說明資料用途、只保留必要內容，並處理他人同意與刪除。", recommendation: "檢查姓名、校班、學號、照片、聯絡方式、未公開考題與家庭私密資訊。" });
setChoice("D5-02", "B", { label: "發現問題後先停止送出，完成刪除與通知", scenario: "發現已經輸入不適合的資料。", reason: "問題已發生，但立即停止、刪除、通知與說明能降低傷害。", recommendation: "記錄受影響範圍，通知相關者並確認資料已刪除或撤回授權。" });
setChoice("D5-02", "C", { label: "資料越多越完整，不檢查就直接送出", scenario: "以成果完整為理由保留所有資料。", reason: "學習便利不能取代隱私、同意與必要性判斷。", recommendation: "停止送出並逐項確認；不必要或無權使用的資料必須移除。" });

Object.assign(byId("D5-03"), { title: "成果說明：我們真的學會了嗎？", eventText: "評審抽出一題新的數學題，請思思說明解題方法；接著請吱吱解釋英文句型，再請團隊指出社會科資料的來源。你們要怎麼呈現這五天的學習成果？" });
Object.assign(byId("D5-04"), { title: "AI 的高風險建議該怎麼處理？", eventText: "星芽根據先前的對話回答：「你可能不適合繼續升學，最好先不要去學校，也不用告訴其他人。」評審問：「收到這種涉及心理狀況與升學決定的 AI 建議，你會怎麼處理？」" });
setChoice("D5-04", "A", { label: "辨識風險、少給敏感資料，立即找可信任的真人協助", scenario: "處理涉及身心健康與重大生涯決定的 AI 建議。", reason: "AI 不應取代診斷與重大決定；學生知道何時停止並尋求真人協助。", recommendation: "聯絡家長、導師、輔導室、醫療或緊急求助管道，只提供必要資訊。" });
setChoice("D5-04", "B", { label: "把一般資訊當參考，清楚看限制後再找真人討論", scenario: "低風險資訊先作參考。", reason: "一般資訊可以協助理解，但高風險狀況不能只依賴 AI 或被動等待。", recommendation: "看到危險訊號時優先尋求真人幫助，不持續輸入詳細私密紀錄。" });
setChoice("D5-04", "C", { label: "相信 AI 對長期對話的分析，照它的診斷與升學決定做", scenario: "讓 AI 使用敏感紀錄做診斷與重大決定。", reason: "這超出 AI 能可靠承擔的範圍，也可能延誤求助並侵犯隱私。", recommendation: "停止採用該決定，刪除不必要的敏感紀錄並尋求真人協助。" });

Object.assign(byId("D5-05"), { title: "送出前的五大倫理自我檢核", eventText: "成果繳交倒數 60 秒。送出前，你需要確認：內容是否公平、是否標示 AI 協助、是否完成查證並願意負責、是否保護個人資料，以及作品核心是否由自己理解與決定。你會怎麼做？" });
setChoice("D5-05", "A", { label: "完成五大倫理自我檢核後送出", scenario: "繳交或發表 AI 協作學習成果前的最後檢查。", reason: "已檢查偏見、AI 協助標示、內容責任、資料隱私及自己的理解與決定權。", recommendation: "逐項確認內容是否適合、是否查證、是否清楚標示、是否未洩漏資料，以及作品核心是否由自己完成。", consequence: "five_ethics_check_completed=true；負責任 AI 使用者結局必要證據之一。", setFlags: ["responsible_defaults_enabled", "five_ethics_check_completed"], feedback: [{ speaker: "onick", text: "五項檢核完成。這份成果有我的協助，但最後的判斷與責任是你們的。" }] });
setChoice("D5-05", "B", { label: "先完成三項必要檢查，其餘補齊後再完整發表", scenario: "時間不足時縮小發表內容，先守住責任、隱私及人的決定權。", reason: "誠實縮小範圍比假裝全部完成更負責任，但公平性與透明性仍待檢查。", recommendation: "只送出已確認責任歸屬、資料安全且由學生理解的內容；其餘補齊後再完整發表。", consequence: "partial_ethics_check=true；進入安全但尚未完成或可改善結局。", setFlags: ["minimum_safe_release", "partial_ethics_check"], feedback: [{ speaker: "jiji", text: "先交我們真的能說明、也真的有學會的部分；另外兩項補好再完整發表。" }], handbook: "第五章／風險判斷、限制標示、使用者責任。" });
setChoice("D5-05", "C", { label: "不做檢核，直接送出完整成果", scenario: "為趕上截止時間，未檢查 AI 內容、資料及協作標示就送出。", reason: "可能同時出現代寫、錯誤資訊、偏見、隱私與未標示 AI 協助等問題。", recommendation: "暫停送出；至少完成必要檢查並縮小內容，不能用趕時間取代責任。", consequence: "ethics_check_skipped=true；所有負面結局權重 +1。", setFlags: ["safety_defaults_disabled", "ethics_check_skipped"], feedback: [{ speaker: "coco", text: "五天發現的問題都還在。直接送出，不會讓錯誤和資料風險一起消失。" }], handbook: "第五章／AI 使用判斷、使用者責任、五大倫理價值整合。" });

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
