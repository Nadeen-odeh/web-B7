import express from "express";
import { db } from "../../server.js";
const router = express.Router();

// =============================
// Helpers (match your DB)
// =============================
const MODEL = "gemini-2.5-flash";

// normalize hebrew + remove quotes/spaces
const normalizeHebrew = (s = "") =>
  String(s)
    .replace(/["׳״'`]/g, "")     // remove quotes
    .replace(/\s+/g, "")         // remove spaces
    .replace(/[-–—]/g, "")       // remove dashes
    .toLowerCase()
    .trim();

const isCourseCode = (s) => /^\d{5,6}$/.test(String(s || "").trim());

// extract first JSON object even if Gemini wraps with ```json
function safeParseJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```json|```/g, "").trim();

  // try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // fallback: find first {...}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

// match course by code OR fuzzy name variations
function matchCourse(raw, courses, nameIndex) {
  if (!raw) return null;
  const s = String(raw).trim();

  // 1) course code
  if (isCourseCode(s)) {
    return courses.find((c) => c.courseCode === s) || null;
  }

  // 2) normalize and match by name index
  const n = normalizeHebrew(s);
  if (!n) return null;

  // exact normalized match
  if (nameIndex.has(n)) return nameIndex.get(n);

  // contains match (works for "חדוא2" inside full name)
  for (const [key, course] of nameIndex.entries()) {
    if (key.includes(n) || n.includes(key)) return course;
  }
  return null;
}

// read relation type from DB structure:
// yearbooks/{yb}/requiredCourses/semester_x/courses/{A}/relations/{B}
async function getRelationType(yearbookId, courseA_code, courseB_code) {
  const semSnap = await db
    .collection("yearbooks")
    .doc(yearbookId)
    .collection("requiredCourses")
    .get();

  for (const sem of semSnap.docs) {
    const relRef = sem.ref
      .collection("courses")
      .doc(courseA_code)
      .collection("relations")
      .doc(courseB_code);

    const relSnap = await relRef.get();
    if (relSnap.exists) {
      return relSnap.data()?.type || null; // "PREREQUISITE" | "COREQUISITE"
    }
  }
  return null;
}

// =============================
// POST /api/ask
// Body: { yearbookId, question }
// =============================
router.post("/ask", async (req, res) => {
  try {
    const { yearbookId, question } = req.body || {};

    if (!yearbookId || !question) {
      return res.status(400).json({ html: "❌ חסר שנתון או שאלה" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res
        .status(500)
        .json({ html: "⚠️ חסר GEMINI_API_KEY בשרת (.env)" });
    }

    // 1) Load all courses in yearbook (your structure)
    const semSnap = await db
      .collection("yearbooks")
      .doc(yearbookId)
      .collection("requiredCourses")
      .get();

    const courses = []; // {courseCode, courseName}
    for (const sem of semSnap.docs) {
      const cs = await sem.ref.collection("courses").get();
      cs.forEach((doc) => {
        const d = doc.data();
        if (d?.courseCode && d?.courseName) {
          courses.push({ courseCode: String(d.courseCode), courseName: String(d.courseName) });
        }
      });
    }

    if (!courses.length) {
      return res.json({ html: "❌ לא נמצאו קורסים בשנתון הנבחר" });
    }

    // build normalized name index once
    const nameIndex = new Map();
    for (const c of courses) {
      nameIndex.set(normalizeHebrew(c.courseName), c);
      // also store code-as-key for convenience
      nameIndex.set(normalizeHebrew(c.courseCode), c);
    }

    // 2) Gemini: extract intent + course identifiers (RAW)
    const prompt = `
החזירי JSON בלבד (בלי הסברים) בפורמט:
{
  "intent": "before" | "parallel" | "general",
  "courseA_raw": "string",
  "courseB_raw": "string"
}

הערות:
- courseA_raw ו-courseB_raw יכולים להיות קוד קורס (11064) או שם (חדו"א 2) או כתיבה חופשית (חדוא2/חדוא 2).
- אל תמציאי קורסים. רק חלצי מהשאלה.
- אם חסר קורס, החזירי מחרוזת ריקה בשדה המתאים.

שאלה:
"${question}"
`.trim();

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 },
        }),
      }
    );

    const geminiData = await geminiResp.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    const parsed = safeParseJson(rawText);
    if (!parsed) {
      return res.json({ html: "❌ לא הצלחתי להבין את השאלה (JSON לא תקין)" });
    }

    const intent = parsed.intent || "general";
    const courseA_raw = parsed.courseA_raw || "";
    const courseB_raw = parsed.courseB_raw || "";

    // 3) Match to DB courses
    const courseA = matchCourse(courseA_raw, courses, nameIndex);
    const courseB = matchCourse(courseB_raw, courses, nameIndex);

    if (!courseA || !courseB) {
      return res.json({
        html: `
          <div class="text-sm leading-6">
            ❌ לא הצלחתי לזהות שני קורסים מתוך השאלה.<br/>
            נסי לכתוב עם <b>קוד קורס</b> (למשל 11064) או שם מדויק (למשל חדו"א 2).
          </div>
        `,
        meta: { intent, courseA_raw, courseB_raw },
      });
    }

    // 4) DB decision only (relations subcollection)
    const relType = await getRelationType(yearbookId, courseA.courseCode, courseB.courseCode);

    let answer = "";

    // intent=before: "A before B?"
    if (intent === "before") {
      if (relType === "PREREQUISITE") {
        answer = `❌ לא ניתן ללמוד <b>${courseA.courseName}</b> לפני <b>${courseB.courseName}</b> — זהו <b>קורס קדם</b>.`;
      } else if (relType === "COREQUISITE") {
        answer = `⚠️ <b>${courseA.courseName}</b> הוא <b>קורס צמוד</b> ל־<b>${courseB.courseName}</b> ולכן ניתן ללמוד אותם <b>רק במקביל</b>.`;
      } else {
        // 🔎 אין קשר ישיר – נבדוק קורסי קדם אחרים של קורס A
        const prereqs = [];

        for (const semDoc of semSnap.docs) {
          const relsSnap = await semDoc.ref
            .collection("courses")
            .doc(courseA.courseCode)
            .collection("relations")
            .get();

          relsSnap.forEach((doc) => {
            const r = doc.data();
            if (r?.type === "PREREQUISITE") {
              prereqs.push(r.courseName || r.courseCode);
            }
          });
        }


        if (prereqs.length > 0) {
          answer = `
            לפי הנתונים בשנתון,<br/><br/>
            ל־<b>${courseA.courseName}</b> יש קורסי קדם:<br/>
            ${prereqs.map(p => `• ${p}`).join("<br/>")}
            <br/><br/>
            אם סיימת קורסי הקדם – לא צפויה בעיה.
           `;

        } else {
          answer = `
          לפי הנתונים בשנתון,<br/><br/>
          ל־<b>${courseA.courseName}</b> אין קורסי קדם.<br/><br/>
          לא צפויה בעיה.
          `;

        }
      }

    }

    // intent=parallel: "A with B?"
    else if (intent === "parallel") {
      if (relType === "COREQUISITE") {
        answer = `✅ כן. <b>${courseA.courseName}</b> הוא <b>קורס צמוד</b> ל־<b>${courseB.courseName}</b> ולכן ניתן ללמוד אותם <b>במקביל</b>.`;
      } else if (relType === "PREREQUISITE") {
        answer = `⚠️ לא מומלץ/לא אפשרי במקביל: <b>${courseB.courseName}</b> הוא <b>קורס קדם</b> ל־<b>${courseA.courseName}</b>.`;
      } else {
        answer = `ℹ️ לפי הנתונים בשנתון, אין דרישה מיוחדת שמחייבת או אוסרת ללמוד את הקורסים במקביל.`;
      }
    }

    // general
    else {
      if (relType === "PREREQUISITE") {
        answer = `ℹ️ <b>${courseB.courseName}</b> הוא <b>קורס קדם</b> ל־<b>${courseA.courseName}</b>.`;
      } else if (relType === "COREQUISITE") {
        answer = `ℹ️ <b>${courseA.courseName}</b> הוא <b>קורס צמוד</b> ל־<b>${courseB.courseName}</b> (לימוד במקביל).`;
      } else {
        answer = `ℹ️ לפי הנתונים בשנתון, אין קשר רשמי (קדם/צמוד) בין הקורסים הללו.`;
      }
    }

    return res.json({
      html: `<div class="text-sm leading-6">${answer}</div>`,
      meta: {
        intent,
        courseA: courseA.courseName,
        courseB: courseB.courseName,
        relType,
      },
    });
  } catch (err) {
    console.error("ASK ERROR:", err);
    return res.status(500).json({ html: "⚠️ שגיאה בשרת" });
  }
});

export default router;
