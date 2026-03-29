import { useState, useRef, useEffect } from "react";
import { analyzeFile, analyzeText } from "./api";

// ─── Circular Score Ring ─────────────────────────────────────
function CircleScore({ score, size = 110, label, color }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const dash = (animated / 100) * circ;
  const c = color || (score >= 75 ? "#00E5A0" : score >= 50 ? "#FFB800" : "#FF4D6D");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1A1A2E" strokeWidth={10} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={c} strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: size > 90 ? 22 : 16, fontWeight: 700, color: c, lineHeight: 1 }}>{score}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#555", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>/100</div>
        </div>
      </div>
      {label && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#666", letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</div>}
    </div>
  );
}

// ─── Severity Badge ──────────────────────────────────────────
function SeverityBadge({ s }) {
  const map = {
    high: ["#FF4D6D", "rgba(255,77,109,0.1)"],
    medium: ["#FFB800", "rgba(255,184,0,0.1)"],
    low: ["#00E5A0", "rgba(0,229,160,0.1)"],
  };
  const [col, bg] = map[s] || map.low;
  return (
    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, padding: "3px 8px", borderRadius: 3, background: bg, color: col, border: `1px solid ${col}33`, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>
      {s}
    </span>
  );
}

// ─── Tag ─────────────────────────────────────────────────────
function Tag({ children, variant = "default" }) {
  const variants = {
    default: { bg: "rgba(255,255,255,0.04)", color: "#888", border: "rgba(255,255,255,0.08)" },
    green:   { bg: "rgba(0,229,160,0.08)",   color: "#00E5A0", border: "rgba(0,229,160,0.2)" },
    red:     { bg: "rgba(255,77,109,0.08)",  color: "#FF6B85", border: "rgba(255,77,109,0.2)" },
    yellow:  { bg: "rgba(255,184,0,0.08)",   color: "#FFB800", border: "rgba(255,184,0,0.2)" },
    blue:    { bg: "rgba(99,179,237,0.08)",  color: "#90CDF4", border: "rgba(99,179,237,0.2)" },
    purple:  { bg: "rgba(167,139,250,0.08)", color: "#C4B5FD", border: "rgba(167,139,250,0.2)" },
  };
  const v = variants[variant];
  return (
    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "4px 11px", borderRadius: 4, background: v.bg, color: v.color, border: `1px solid ${v.border}`, lineHeight: 1.4, display: "inline-block" }}>
      {children}
    </span>
  );
}

// ─── Section ─────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: -0.3 }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)", marginLeft: 8 }} />
      </div>
      {children}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const fileRef = useRef();

  const loadingMsgs = [
    "Reading your resume...",
    "Scanning ATS compatibility...",
    "Finding keyword gaps...",
    "Evaluating impact metrics...",
    "Analyzing action verbs...",
    "Generating recommendations...",
    "Almost done...",
  ];

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    setLoadingMsg(loadingMsgs[0]);
    const iv = setInterval(() => {
      i = (i + 1) % loadingMsgs.length;
      setLoadingMsg(loadingMsgs[i]);
    }, 1800);
    return () => clearInterval(iv);
  }, [loading]);

  async function handleAnalyze() {
    if (tab === "upload" && !file) { setError("Please upload a resume file."); return; }
    if (tab === "paste" && !resumeText.trim()) { setError("Please paste your resume text."); return; }
    setError(""); setLoading(true); setResult(null);

    try {
      let analysis;
      if (tab === "upload") {
        analysis = await analyzeFile(file, jobDesc);
      } else {
        analysis = await analyzeText(resumeText, jobDesc);
      }
      setResult(analysis);
      setActiveTab("overview");
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null); setFile(null); setResumeText(""); setJobDesc(""); setError("");
  }

  const s = result?.sections;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap');

        .page { min-height:100vh; padding:0 20px 80px; position:relative; }
        .hero-glow { position:fixed; top:-40vh; left:50%; transform:translateX(-50%); width:900px; height:600px; background:radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.06) 40%, transparent 70%); pointer-events:none; z-index:0; }
        .wrap { max-width:900px; margin:0 auto; position:relative; z-index:1; }

        .nav { display:flex; align-items:center; justify-content:space-between; padding:28px 0 20px; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:56px; }
        .nav-logo { font-family:'Clash Display',sans-serif; font-size:22px; font-weight:700; color:#fff; letter-spacing:-0.5px; }
        .nav-logo span { color:#818CF8; }
        .nav-free { font-family:'DM Mono',monospace; font-size:10px; color:#00E5A0; letter-spacing:2px; padding:5px 14px; border:1px solid rgba(0,229,160,0.25); border-radius:20px; background:rgba(0,229,160,0.06); }

        .hero { text-align:center; margin-bottom:56px; }
        .hero-pill { display:inline-flex; align-items:center; gap:8px; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:2.5px; text-transform:uppercase; color:#818CF8; border:1px solid rgba(129,140,248,0.25); background:rgba(129,140,248,0.06); padding:7px 16px; border-radius:20px; margin-bottom:28px; }
        .hero-pill::before { content:'●'; font-size:7px; animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .hero h1 { font-family:'Clash Display',sans-serif; font-size:clamp(2.4rem,7vw,4rem); font-weight:700; color:#fff; line-height:1.05; letter-spacing:-2px; margin-bottom:18px; }
        .hero h1 em { font-style:normal; background:linear-gradient(135deg,#818CF8,#C084FC,#F472B6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .hero p { color:#555; font-size:16px; line-height:1.6; max-width:480px; margin:0 auto; }
        .hero-free { display:inline-flex; align-items:center; gap:6px; margin-top:16px; font-family:'DM Mono',monospace; font-size:11px; color:#00E5A0; letter-spacing:1px; }

        .card { background:linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.07); border-radius:20px; padding:36px; backdrop-filter:blur(20px); box-shadow:0 0 0 1px rgba(255,255,255,0.02),0 24px 64px rgba(0,0,0,0.5); margin-bottom:24px; }

        .inp-tabs { display:flex; gap:6px; margin-bottom:28px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:5px; }
        .inp-tab { flex:1; padding:10px; border:none; background:transparent; border-radius:9px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; color:#555; cursor:pointer; transition:all 0.2s; }
        .inp-tab.on { background:rgba(129,140,248,0.15); color:#818CF8; border:1px solid rgba(129,140,248,0.2); }

        .drop { border:1.5px dashed rgba(255,255,255,0.1); border-radius:14px; padding:52px 24px; text-align:center; cursor:pointer; transition:all 0.25s; margin-bottom:24px; }
        .drop:hover,.drop.over { border-color:rgba(129,140,248,0.4); background:rgba(129,140,248,0.03); }
        .drop.ready { border-color:rgba(0,229,160,0.4); border-style:solid; background:rgba(0,229,160,0.03); }
        .drop-icon { font-size:44px; display:block; margin-bottom:14px; }
        .drop-title { font-family:'Clash Display',sans-serif; font-size:18px; color:#fff; margin-bottom:8px; font-weight:600; }
        .drop-sub { font-family:'DM Mono',monospace; font-size:11px; color:#444; letter-spacing:1px; }

        .flbl { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#444; display:block; margin-bottom:10px; }
        .ta { width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:14px 16px; color:#B8B8CC; font-family:'DM Mono',monospace; font-size:12px; line-height:1.75; resize:vertical; outline:none; transition:border-color 0.2s; min-height:120px; }
        .ta:focus { border-color:rgba(129,140,248,0.35); }
        .ta::placeholder { color:#2A2A3E; }

        .sep { height:1px; background:rgba(255,255,255,0.05); margin:24px 0; }

        .btn-go { width:100%; padding:17px; margin-top:8px; background:linear-gradient(135deg,#6366F1,#8B5CF6); color:#fff; font-family:'Clash Display',sans-serif; font-size:15px; font-weight:600; letter-spacing:0.5px; border:none; border-radius:12px; cursor:pointer; transition:all 0.25s; box-shadow:0 8px 32px rgba(99,102,241,0.3); }
        .btn-go:hover { transform:translateY(-2px); box-shadow:0 14px 40px rgba(99,102,241,0.45); }

        .err { background:rgba(255,77,109,0.08); border:1px solid rgba(255,77,109,0.2); color:#FF6B85; border-radius:10px; padding:14px 16px; font-family:'DM Mono',monospace; font-size:12px; margin-bottom:16px; }

        .load-wrap { display:flex; flex-direction:column; align-items:center; gap:20px; padding:72px 36px; }
        .load-ring { width:56px; height:56px; border-radius:50%; border:2px solid #1E1E35; border-top-color:#818CF8; animation:spin 0.9s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .load-title { font-family:'Clash Display',sans-serif; font-size:20px; font-weight:600; color:#fff; }
        .load-msg { font-family:'DM Mono',monospace; font-size:12px; color:#555; letter-spacing:1px; min-height:20px; }
        .load-bar { width:240px; height:2px; background:#1E1E35; border-radius:2px; overflow:hidden; }
        .load-fill { height:100%; background:linear-gradient(90deg,#6366F1,#C084FC); animation:lb 2.4s ease-in-out infinite; }
        @keyframes lb { 0%{width:0;opacity:1} 60%{width:100%;opacity:1} 100%{width:100%;opacity:0} }

        .res-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:32px; flex-wrap:wrap; }
        .res-title { font-family:'Clash Display',sans-serif; font-size:26px; font-weight:700; color:#fff; letter-spacing:-0.5px; }
        .res-sub { font-family:'DM Mono',monospace; font-size:11px; color:#444; letter-spacing:1px; margin-top:6px; }
        .scores-row { display:flex; gap:28px; flex-wrap:wrap; align-items:flex-start; }

        .res-tabs { display:flex; gap:4px; margin-bottom:32px; flex-wrap:wrap; }
        .res-tab { padding:8px 18px; border-radius:8px; border:1px solid transparent; background:transparent; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; color:#555; cursor:pointer; transition:all 0.2s; }
        .res-tab.on { background:rgba(129,140,248,0.1); border-color:rgba(129,140,248,0.25); color:#818CF8; }
        .res-tab:hover:not(.on) { color:#888; border-color:rgba(255,255,255,0.08); }

        .corr-item { display:flex; gap:16px; padding:16px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; margin-bottom:10px; align-items:flex-start; }
        .corr-issue { font-size:13px; color:#FF6B85; margin-bottom:6px; font-weight:500; }
        .corr-fix { font-family:'DM Mono',monospace; font-size:11px; color:#777; line-height:1.6; }
        .corr-fix span { color:#00E5A0; }

        .kw-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        @media(max-width:600px){.kw-grid{grid-template-columns:1fr;}}
        .kw-box { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:20px; }
        .kw-box-title { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px; }
        .kw-tags { display:flex; flex-wrap:wrap; gap:7px; }

        .verb-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-family:'DM Mono',monospace; font-size:12px; }
        .verb-weak { color:#FF6B85; text-decoration:line-through; min-width:120px; }
        .verb-good { color:#00E5A0; }

        .bar-bg { height:6px; background:#1E1E35; border-radius:3px; overflow:hidden; margin:12px 0; }
        .bar-fill { height:100%; border-radius:3px; transition:width 1s ease; }

        .priority-item { display:flex; align-items:flex-start; gap:14px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
        .p-num { font-family:'Clash Display',sans-serif; font-size:28px; font-weight:700; color:#1E1E35; min-width:40px; line-height:1; }
        .p-text { font-size:14px; color:#AAA; line-height:1.5; padding-top:6px; }

        .btn-back { background:transparent; border:1px solid rgba(255,255,255,0.08); color:#555; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; padding:10px 20px; border-radius:8px; cursor:pointer; transition:all 0.2s; margin-top:8px; }
        .btn-back:hover { border-color:#333; color:#888; }

        .prose { color:#888; font-family:'DM Mono',monospace; font-size:12px; line-height:1.8; }
        .info-box { padding:14px 16px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; }

        @media(max-width:600px){ .card{padding:24px 18px;} }
      `}</style>

      <div className="page">
        <div className="hero-glow" />
        <div className="wrap">

          {/* Nav */}
          <nav className="nav">
            <div className="nav-logo">Resume<span>AI</span></div>
            <div className="nav-free">✦ AI Powered </div>
          </nav>

          {/* Hero */}
          {!result && !loading && (
            <div className="hero">
              <div className="hero-pill">AI Resume Analyzer</div>
              <h1>Get Your Resume<br /><em>Job-Ready</em></h1>
              <p>Deep ATS analysis, keyword gaps, corrections, impact scoring and career coaching — completely free.</p>
              <div className="hero-free">✅ Free · No credit card needed</div>
            </div>
          )}

          {/* Input Form */}
          {!result && !loading && (
            <div className="card">
              <div className="inp-tabs">
                <button className={`inp-tab ${tab === "upload" ? "on" : ""}`} onClick={() => setTab("upload")}>📁 Upload File</button>
                <button className={`inp-tab ${tab === "paste" ? "on" : ""}`} onClick={() => setTab("paste")}>📋 Paste Text</button>
              </div>

              {tab === "upload" && (
                <div
                  className={`drop ${dragging ? "over" : ""} ${file ? "ready" : ""}`}
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]); }}
                >
                  <span className="drop-icon">{file ? "✅" : "📄"}</span>
                  {file ? (
                    <><div className="drop-title">{file.name}</div><div className="drop-sub">{(file.size / 1024).toFixed(1)} KB · click to change</div></>
                  ) : (
                    <><div className="drop-title">Drop your resume here</div><div className="drop-sub">.PDF · .DOCX · .TXT &nbsp;|&nbsp; or click to browse</div></>
                  )}
                  <input ref={fileRef} type="file" hidden accept=".txt,.pdf,.docx" onChange={e => setFile(e.target.files[0])} />
                </div>
              )}

              {tab === "paste" && (
                <div style={{ marginBottom: 24 }}>
                  <label className="flbl">Resume Content</label>
                  <textarea className="ta" rows={11} placeholder="Paste your complete resume text here..." value={resumeText} onChange={e => setResumeText(e.target.value)} />
                </div>
              )}

              <div className="sep" />

              <div style={{ marginBottom: 8 }}>
                <label className="flbl">Job Description <span style={{ color: "#333", textTransform: "none", letterSpacing: 0 }}>(optional — for ATS match scoring)</span></label>
                <textarea className="ta" rows={5} placeholder="Paste job description to get tailored keyword recommendations and match score..." value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
              </div>

              {error && <div className="err">{error}</div>}

              <button className="btn-go" onClick={handleAnalyze}>✦ &nbsp;Analyze My Resume — Free</button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="card">
              <div className="load-wrap">
                <div className="load-ring" />
                <div className="load-title">Analyzing Your Resume</div>
                <div className="load-msg">{loadingMsg}</div>
                <div className="load-bar"><div className="load-fill" /></div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#333" }}>Powered by AI</div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && s && (
            <div className="card">
              {/* Score Header */}
              <div className="res-hdr">
                <div>
                  <div className="res-title">Analysis Report</div>
                  <div className="res-sub">AI Powered Analysis · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                </div>
                <div className="scores-row">
                  <CircleScore score={result.overallScore} label="Overall" />
                  <CircleScore score={result.atsScore} label="ATS" color="#818CF8" />
                  <CircleScore score={result.impactScore} label="Impact" color="#F472B6" size={90} />
                  <CircleScore score={result.readabilityScore} label="Clarity" color="#60A5FA" size={90} />
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.15)", borderRadius: 12, padding: "16px 20px", marginBottom: 28, color: "#9CA3AF", fontFamily: "'DM Mono',monospace", fontSize: 12, lineHeight: 1.75 }}>
                {s.summary}
              </div>

              {/* Top Priorities */}
              {s.topPriorities?.length > 0 && (
                <div style={{ background: "rgba(255,77,109,0.05)", border: "1px solid rgba(255,77,109,0.15)", borderRadius: 12, padding: "16px 20px", marginBottom: 28 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#FF6B85", marginBottom: 12 }}>🚨 Top Priorities to Fix</div>
                  {s.topPriorities.map((p, i) => (
                    <div key={i} className="priority-item">
                      <div className="p-num">{String(i + 1).padStart(2, "0")}</div>
                      <div className="p-text">{p}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Result Tabs */}
              <div className="res-tabs">
                {[["overview","📊 Overview"],["corrections","🔧 Corrections"],["keywords","🔑 Keywords"],["skills","🛠 Skills"],["verbs","✍️ Action Verbs"],["impact","📈 Impact"]].map(([id, lbl]) => (
                  <button key={id} className={`res-tab ${activeTab === id ? "on" : ""}`} onClick={() => setActiveTab(id)}>{lbl}</button>
                ))}
              </div>

              {/* Overview Tab */}
              {activeTab === "overview" && (
                <>
                  <Section icon="✅" title="Strengths">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {s.strengths?.map((st, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.12)", borderRadius: 10 }}>
                          <span style={{ color: "#00E5A0", marginTop: 2 }}>✓</span>
                          <span style={{ fontSize: 13, color: "#AAA", lineHeight: 1.5 }}>{st}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section icon="💼" title="Experience Feedback">
                    <div className="info-box prose" style={{ marginBottom: 14 }}>{s.experience?.feedback}</div>
                    {s.experience?.improvements?.map((imp, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#777", lineHeight: 1.6, padding: "6px 0" }}>
                        <span style={{ color: "#6366F1" }}>→</span> {imp}
                      </div>
                    ))}
                  </Section>
                  <Section icon="🎯" title="Job Tailoring">
                    <div className="info-box prose">{s.tailoring}</div>
                  </Section>
                </>
              )}

              {/* Corrections Tab */}
              {activeTab === "corrections" && (
                <Section icon="🔧" title="Issues & Exact Fixes">
                  {s.corrections?.map((c, i) => (
                    <div key={i} className="corr-item">
                      <SeverityBadge s={c.severity} />
                      <div style={{ flex: 1 }}>
                        <div className="corr-issue">{c.issue}</div>
                        <div className="corr-fix">Fix: <span>{c.fix}</span></div>
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Keywords Tab */}
              {activeTab === "keywords" && (
                <>
                  <Section icon="🔑" title="ATS Keyword Analysis">
                    <div className="kw-grid">
                      <div className="kw-box">
                        <div className="kw-box-title" style={{ color: "#00E5A0" }}>✓ Found in Resume</div>
                        <div className="kw-tags">{s.atsKeywords?.found?.map((k, i) => <Tag key={i} variant="green">{k}</Tag>)}</div>
                      </div>
                      <div className="kw-box">
                        <div className="kw-box-title" style={{ color: "#FF6B85" }}>✗ Missing Keywords</div>
                        <div className="kw-tags">{s.atsKeywords?.missing?.map((k, i) => <Tag key={i} variant="red">{k}</Tag>)}</div>
                      </div>
                    </div>
                  </Section>
                  <Section icon="💡" title="Recommended Keywords to Add">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {s.atsKeywords?.recommended?.map((k, i) => <Tag key={i} variant="purple">+ {k}</Tag>)}
                    </div>
                  </Section>
                  <Section icon="🖋" title="Formatting Issues">
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div className="bar-bg">
                          <div className="bar-fill" style={{ width: `${s.formatting?.score || 0}%`, background: s.formatting?.score >= 75 ? "#00E5A0" : s.formatting?.score >= 50 ? "#FFB800" : "#FF4D6D" }} />
                        </div>
                      </div>
                      <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.formatting?.score}/100</span>
                    </div>
                    {s.formatting?.issues?.map((issue, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#777", lineHeight: 1.6 }}>
                        <span style={{ color: "#FFB800" }}>⚠</span> {issue}
                      </div>
                    ))}
                  </Section>
                </>
              )}

              {/* Skills Tab */}
              {activeTab === "skills" && (
                <>
                  <Section icon="💻" title="Technical Skills Found">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{s.skills?.technical?.map((k, i) => <Tag key={i} variant="blue">{k}</Tag>)}</div>
                  </Section>
                  <Section icon="🤝" title="Soft Skills Found">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{s.skills?.soft?.map((k, i) => <Tag key={i} variant="default">{k}</Tag>)}</div>
                  </Section>
                  <Section icon="➕" title="Skills to Add">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{s.skills?.missing?.map((k, i) => <Tag key={i} variant="yellow">+ {k}</Tag>)}</div>
                  </Section>
                </>
              )}

              {/* Action Verbs Tab */}
              {activeTab === "verbs" && (
                <>
                  <Section icon="✍️" title="Weak Verbs Detected">
                    <div style={{ marginBottom: 12, fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#555" }}>Replace these weak verbs with stronger alternatives:</div>
                    {s.actionVerbs?.weak?.length > 0 ? s.actionVerbs.weak.map((v, i) => (
                      <div key={i} className="verb-row">
                        <span className="verb-weak">{v}</span>
                        <span style={{ color: "#333" }}>→</span>
                        <span className="verb-good">{s.actionVerbs?.suggested?.[i] || "use a power verb"}</span>
                      </div>
                    )) : <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#555" }}>No weak verbs detected — great job!</div>}
                  </Section>
                  <Section icon="🚀" title="Power Verbs to Use">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{s.actionVerbs?.suggested?.map((v, i) => <Tag key={i} variant="green">{v}</Tag>)}</div>
                  </Section>
                </>
              )}

              {/* Impact Tab */}
              {activeTab === "impact" && (
                <Section icon="📈" title="Quantification & Impact Score">
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div className="bar-bg">
                        <div className="bar-fill" style={{ width: `${s.quantification?.score || 0}%`, background: "linear-gradient(90deg,#6366F1,#C084FC)" }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.quantification?.score}/100</span>
                  </div>
                  <div className="info-box prose" style={{ marginBottom: 16 }}>{s.quantification?.feedback}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>How to Add Metrics</div>
                  {s.quantification?.examples?.map((ex, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#777", lineHeight: 1.6 }}>
                      <span style={{ color: "#C084FC" }}>💡</span> {ex}
                    </div>
                  ))}
                </Section>
              )}

              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "28px 0" }} />
              <button className="btn-back" onClick={reset}>← Analyze Another Resume</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
