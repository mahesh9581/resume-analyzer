require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── Multer (file upload) ─────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".docx")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX, and TXT files are allowed."));
    }
  },
});

// ─── AI Client ────────────────────────────────────────────────
const client = new Groq({ apiKey: process.env.AI_API_KEY });

// ─── Extract text from file ───────────────────────────────────
async function extractText(file) {
  const mime = file.mimetype;
  const name = file.originalname.toLowerCase();
  if (mime === "text/plain") return file.buffer.toString("utf-8");
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  if (name.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  throw new Error("Unsupported file type.");
}

// ─── Build Prompt ─────────────────────────────────────────────
function buildPrompt(resumeText, jobDesc) {
  const jobSection = jobDesc?.trim()
    ? `JOB DESCRIPTION TO MATCH AGAINST:\n${jobDesc}`
    : "No specific job description provided. Give general career advice.";

  return `You are an expert ATS (Applicant Tracking System) specialist and senior career coach with 15+ years of experience. Analyze this resume with deep, accurate, real-world insight.

RESUME:
${resumeText}

${jobSection}

Return ONLY a valid JSON object (no markdown, no explanation, no code fences) in this exact structure:
{
  "overallScore": <0-100>,
  "atsScore": <0-100>,
  "readabilityScore": <0-100>,
  "impactScore": <0-100>,
  "sections": {
    "summary": "<2-3 sentence honest overall assessment>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>", "<strength 4>"],
    "corrections": [
      {"issue": "<what is wrong>", "fix": "<exactly how to fix it>", "severity": "high|medium|low"},
      {"issue": "<issue 2>", "fix": "<fix 2>", "severity": "high|medium|low"},
      {"issue": "<issue 3>", "fix": "<fix 3>", "severity": "high|medium|low"},
      {"issue": "<issue 4>", "fix": "<fix 4>", "severity": "high|medium|low"}
    ],
    "atsKeywords": {
      "found": ["<keyword found in resume>", "<keyword 2>", "<keyword 3>", "<keyword 4>", "<keyword 5>"],
      "missing": ["<missing keyword 1>", "<missing 2>", "<missing 3>", "<missing 4>", "<missing 5>"],
      "recommended": ["<keyword to add 1>", "<rec 2>", "<rec 3>", "<rec 4>", "<rec 5>", "<rec 6>", "<rec 7>"]
    },
    "formatting": {
      "issues": ["<formatting problem 1>", "<formatting problem 2>", "<formatting problem 3>"],
      "score": <0-100>
    },
    "experience": {
      "feedback": "<specific feedback on work experience section>",
      "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
    },
    "skills": {
      "technical": ["<tech skill 1>", "<tech skill 2>", "<tech skill 3>"],
      "soft": ["<soft skill 1>", "<soft skill 2>"],
      "missing": ["<missing skill 1>", "<missing skill 2>", "<missing skill 3>"]
    },
    "actionVerbs": {
      "weak": ["<weak verb 1>", "<weak verb 2>"],
      "suggested": ["<strong verb 1>", "<strong verb 2>", "<strong verb 3>", "<strong verb 4>", "<strong verb 5>"]
    },
    "quantification": {
      "score": <0-100>,
      "feedback": "<feedback on use of numbers and metrics>",
      "examples": ["<suggestion to quantify 1>", "<example 2>"]
    },
    "tailoring": "<feedback on how well resume matches the job or general advice>",
    "topPriorities": ["<most important fix #1>", "<priority 2>", "<priority 3>"]
  }
}`;
}

// ─── Call AI ──────────────────────────────────────────────────
async function callAI(prompt) {
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are an expert resume analyst. Always respond with valid JSON only. No markdown fences, no extra text, no explanation.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  let text = completion.choices[0]?.message?.content || "";
  text = text.replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

// ─── Routes ───────────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Resume Analyzer API is running ✅" });
});

// Analyze via file upload
app.post("/api/analyze/file", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const resumeText = await extractText(req.file);
    if (!resumeText.trim()) return res.status(400).json({ error: "Could not extract text from file." });
    const prompt = buildPrompt(resumeText, req.body.jobDesc || "");
    const analysis = await callAI(prompt);
    res.json({ success: true, analysis });
  } catch (err) {
    console.error("File analyze error:", err.message);
    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

// Analyze via pasted text
app.post("/api/analyze/text", async (req, res) => {
  try {
    const { resumeText, jobDesc } = req.body;
    if (!resumeText?.trim()) return res.status(400).json({ error: "Resume text is required." });
    const prompt = buildPrompt(resumeText, jobDesc || "");
    const analysis = await callAI(prompt);
    res.json({ success: true, analysis });
  } catch (err) {
    console.error("Text analyze error:", err.message);
    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Resume Analyzer API running at http://localhost:${PORT}`);
});
