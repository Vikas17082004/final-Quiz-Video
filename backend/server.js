const express = require("express");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const multer = require("multer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= CONFIG ================= */
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "PUT_YOUR_KEY_HERE";
const QUESTIONS_FILE = path.join(__dirname, "questions.json");

/* ================= MIDDLEWARE ================= */
app.use(express.json());

// frontend folder is INSIDE backend folder
const FRONTEND_DIR = path.join(__dirname, "frontend");
app.use(express.static(FRONTEND_DIR));

/* ================= FILE HELPERS ================= */
function readQuestions() {
  try {
    if (!fs.existsSync(QUESTIONS_FILE)) {
      fs.writeFileSync(QUESTIONS_FILE, "[]");
    }
    const data = fs.readFileSync(QUESTIONS_FILE, "utf8");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("❌ Error reading questions.json:", err.message);
    return [];
  }
}

function saveQuestions(data) {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Error saving questions.json:", err.message);
  }
}

/* ================= MULTER (BG MUSIC UPLOAD) ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FRONTEND_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, "bg-music.mp3");
  }
});
const upload = multer({ storage });

/* ================= PEXELS IMAGE FETCH (SAFE) ================= */
async function getPexelsImage(query) {
  if (!query) return "";

  try {
    const response = await axios.get(
      "https://api.pexels.com/v1/search",
      {
        headers: { Authorization: PEXELS_API_KEY },
        params: { query, per_page: 1 },
        timeout: 5000
      }
    );

    return response.data?.photos?.[0]?.src?.large || "";
  } catch (err) {
    console.error("❌ Pexels error:", err.message);
    return ""; // image may fail, API must not fail
  }
}

/* ================= QUIZ API (FULL QUIZ) ================= */
app.get("/api/quiz", async (req, res) => {
  const questions = readQuestions();

  if (!questions.length) {
    return res.status(404).json({ error: "No questions found" });
  }

  const result = [];

  for (const q of questions) {
    try {
      const img = await getPexelsImage(q.imageQuery);
      result.push({ ...q, answerImage: img });
    } catch {
      result.push({ ...q, answerImage: "" });
    }
  }

  res.json(result);
});

/* ================= SHORT QUIZ API (3 QUESTIONS) ================= */
app.get("/api/quiz/short", async (req, res) => {
  const questions = readQuestions();

  if (!questions.length) {
    return res.status(404).json({ error: "No questions found" });
  }

  const shortSet = questions.slice(0, 3);
  const result = [];

  for (const q of shortSet) {
    try {
      const img = await getPexelsImage(q.imageQuery);
      result.push({ ...q, answerImage: img });
    } catch {
      result.push({ ...q, answerImage: "" });
    }
  }

  res.json(result);
});

/* ================= ADMIN APIs ================= */
app.post("/api/admin/add", (req, res) => {
  const { question, options, correct, imageQuery } = req.body;

  if (!question || !options || correct === undefined || !imageQuery) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const questions = readQuestions();
  questions.push({ question, options, correct, imageQuery });
  saveQuestions(questions);

  res.json({ message: "Question added successfully" });
});

app.post("/api/admin/bulk-add", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No data provided" });

  const blocks = text.split("\n\n");
  const questions = readQuestions();

  try {
    blocks.forEach(block => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 7) return;

      const question = lines[0];
      const options = [
        lines[1].slice(3),
        lines[2].slice(3),
        lines[3].slice(3),
        lines[4].slice(3)
      ];

      const answerLine = lines.find(l => l.startsWith("Answer:"));
      const imageLine = lines.find(l => l.startsWith("Image:"));
      if (!answerLine || !imageLine) return;

      const correct =
        answerLine.replace("Answer:", "").trim().charCodeAt(0) - 65;

      const imageQuery = imageLine.replace("Image:", "").trim();

      questions.push({ question, options, correct, imageQuery });
    });

    saveQuestions(questions);
    res.json({ message: "Bulk questions added successfully" });
  } catch (err) {
    console.error("❌ Bulk add error:", err.message);
    res.status(500).json({ error: "Invalid format" });
  }
});

app.get("/api/admin/questions", (req, res) => {
  res.json(readQuestions());
});

app.put("/api/admin/edit/:index", (req, res) => {
  const index = parseInt(req.params.index);
  const { question, options, correct, imageQuery } = req.body;

  const questions = readQuestions();

  if (
    isNaN(index) ||
    index < 0 ||
    index >= questions.length ||
    !question ||
    !options ||
    correct === undefined ||
    !imageQuery
  ) {
    return res.status(400).json({ error: "Invalid data" });
  }

  questions[index] = { question, options, correct, imageQuery };
  saveQuestions(questions);

  res.json({ message: "Question updated successfully" });
});

app.delete("/api/admin/delete-all", (req, res) => {
  saveQuestions([]);
  res.json({ message: "All questions deleted successfully" });
});

/* ================= BG MUSIC UPLOAD ================= */
app.post("/api/admin/upload-bgmusic", upload.single("music"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({ message: "Music uploaded successfully" });
});

/* ================= FRONTEND ROUTES ================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "admin.html"));
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🛠 Admin panel at http://localhost:${PORT}/admin`);
});
