const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

function addMessage(text, sender = "bot") {
  if (!chatWindow) return;

  const div = document.createElement("div");
  div.className =
    sender === "user"
      ? "bg-emerald-200 rounded-xl p-2 max-w-[80%] ml-auto text-right"
      : "bg-white rounded-xl p-2 max-w-[80%] text-right";

  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}


function getDemoAnswer(question) {
  const q = question.toLowerCase();

  // קורסי חובה
  if (q.includes("חובה") || q.includes("קורסים")) {
    return "קורסי החובה משתנים לפי השנה והמסלול, אך כוללים קורסי בסיס בביולוגיה, כימיה ומעבדות מקצועיות.";
  }

  // מעבדות
  if (q.includes("מעב") || q.includes("מעבדות")) {
    return "לוח המעבדות כולל ימים, שעות, מדריכים וחדרים. לרוב המעבדות הן מרוכזות בתחילת או אמצע השבוע.";
  }

  // רישום לקורסים
  if (q.includes("רישום") || q.includes("נרשם") || q.includes("להירשם")) {
    return "הרישום לקורסים מתבצע לפי הנחיות המחלקה ומבוסס על חלוקה לסמסטרים. חשוב לבדוק את קבצי הרישום העדכניים.";
  }

  // שנתון
  if (q.includes("שנתון") || q.includes("תוכנית") || q.includes("תכנית")) {
    return "השנתון מציג את כל הקורסים, נקודות הזכות, דרישות הקדם ומבנה התואר במסלול הביוטכנולוגיה.";
  }

  // יועץ אקדמי
  if (q.includes("יועץ") || q.includes("אקדמי")) {
    return "ליועצים אקדמיים יש תפקיד להכווין בבחירת קורסים, התמחויות ופתרון בעיות בתהליך הלימודים.";
  }


  return "נסה לשאול על קורסים, מעבדות, רישום, שנתון או יועץ אקדמי 🙂";
}


function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  const answer = getDemoAnswer(text);
  setTimeout(() => addMessage(answer, "bot"), 300);
}

if (sendBtn && userInput) {
  sendBtn.addEventListener("click", handleSend);
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });
}
