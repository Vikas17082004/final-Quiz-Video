const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

/* ===== ABSOLUTE PATH DEBUG ===== */
const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const INDEX_FILE = path.join(FRONTEND_DIR, "index.html");

console.log("🧠 __dirname =", __dirname);
console.log("🧠 ROOT_DIR =", ROOT_DIR);
console.log("🧠 FRONTEND_DIR =", FRONTEND_DIR);
console.log("🧠 index.html exists =", fs.existsSync(INDEX_FILE));

/* ===== MIDDLEWARE ===== */
app.use(cors());
app.use(express.json());

/* ===== API TEST ROUTE ===== */
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* ===== FRONTEND ROUTES (ONLY SAFE PATHS) ===== */
app.get("/", (req, res) => {
  if (!fs.existsSync(INDEX_FILE)) {
    return res.status(500).send("index.html NOT FOUND");
  }
  res.sendFile(INDEX_FILE);
});

/* ===== DO NOT SERVE ANY STATIC AUTO ===== */
/* ===== NO express.static AT ALL ===== */

/* ===== 404 HANDLER (IMPORTANT) ===== */
app.use((req, res) => {
  res.status(404).send("Not Found");
});

/* ===== START SERVER ===== */
app.listen(PORT, () => {
  console.log("✅ Server running on port " + PORT);
});
