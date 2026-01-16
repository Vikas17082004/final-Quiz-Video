const express = require("express");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config(); // ✅ LOAD ENV VARIABLES

const app = express();

/* ✅ Railway compatible PORT */
const PORT = process.env.PORT || 5000;

/* 🔑 SECURED API KEY */
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

/* 📁 File path */
const QUESTIONS_FILE = path.join(__dirname, "questions.json");

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

/* ================= FILE HELPERS ================= */
function readQuestions() {
  if (!fs.existsSync(QUESTIONS_FILE)) {
    fs.writeFileSync(QUESTIONS_FILE, "[]");
  }
  return JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf8"));
}

function saveQuestions(data) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2));
}

/* ================= PEXELS IMAGE ================= */
async function getPexelsImage(query) {
  try {
    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: 1 }
    });
    return res.data.photos?.[0]?.src.large || "";
  } catch {
    return "";
  }
}

/* ================= QUIZ API ================= */
app.get("/api/quiz", async (req, res) => {
  const questions = readQuestions();
  const result = [];

  for (const q of questions) {
    const img = await getPexelsImage(q.imageQuery);
    result.push({ ...q, answerImage: img });
  }

  res.json(result);
});

/* ================= ADMIN APIs ================= */
app.post("/api/admin/add", (req, res) => {
  const questions = readQuestions();
  questions.push(req.body);
  saveQuestions(questions);
  res.json({ message: "Question added" });
});

app.post("/api/admin/bulk-add", (req, res) => {
  const { text } = req.body;
  const blocks = text.split("\n\n");
  const questions = readQuestions();

  blocks.forEach(block => {
    const lines = block.split("\n");
    questions.push({
      question: lines[0],
      options: [
        lines[1].slice(3),
        lines[2].slice(3),
        lines[3].slice(3),
        lines[4].slice(3)
      ],
      correct: lines[5].slice(-1).charCodeAt(0) - 65,
      imageQuery: lines[6].replace("Image:", "").trim()
    });
  });

  saveQuestions(questions);
  res.json({ message: "Bulk added" });
});

app.get("/api/admin/questions", (req, res) => {
  res.json(readQuestions());
});

app.delete("/api/admin/delete-all", (req, res) => {
  saveQuestions([]);
  res.json({ message: "All deleted" });
});

/* ================= FRONTEND ROUTES ================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin.html"));
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log("✅ Server running on port " + PORT);
});
