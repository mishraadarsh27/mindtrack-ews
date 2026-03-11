
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, AreaChart, Area, ScatterChart, Scatter,
  ZAxis, Cell, PieChart, Pie
} from "recharts";

// ─── DESIGN SYSTEM ──────────────────────────────────────────────────────────
const colors = {
  bg: "#0A0E1A",
  surface: "#0F1629",
  card: "#141C35",
  border: "#1E2D5A",
  accent1: "#4F8EF7",
  accent2: "#38D9A9",
  accent3: "#F7724F",
  accent4: "#C97FF7",
  warn: "#F7C94F",
  text: "#E8EDFF",
  muted: "#5A6891",
  low: "#38D9A9",
  medium: "#F7C94F",
  high: "#F7724F",
};

// ─── DATA GENERATION ENGINE ──────────────────────────────────────────────────
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateStudent(id, seed) {
  const rng = seededRandom(seed + id * 1337);
  const riskLevel = rng() < 0.15 ? "high" : rng() < 0.35 ? "medium" : "low";
  const isHighRisk = riskLevel === "high";
  const isMedRisk = riskLevel === "medium";

  const names = ["Alex Chen","Jordan Park","Sam Rivera","Taylor Kim","Morgan Lee",
    "Casey Liu","Riley Wang","Drew Patel","Avery Singh","Quinn Zhao","Blake Torres",
    "Sage Nguyen","Reese Yamamoto","Cameron Okafor","Dakota Ivanov","Skylar Mehta",
    "Hayden Costa","Peyton Andersson","Rowan Ferreira","Finley Nakamura"];
  const majors = ["Computer Science","Psychology","Biology","Engineering","Business",
    "Mathematics","Sociology","Chemistry","Economics","Philosophy"];
  const name = names[id % names.length];
  const major = majors[id % majors.length];
  const year = Math.floor(rng() * 4) + 1;

  // Generate 16 weeks of data
  const weeks = Array.from({ length: 16 }, (_, w) => {
    const weekRng = seededRandom(seed + id * 999 + w * 77);
    const stressEvent = isHighRisk && w > 5 && weekRng() < 0.6;
    const gradualDecline = isHighRisk ? (w > 4 ? (w - 4) * 0.03 : 0) : 0;

    return {
      week: w + 1,
      grade: Math.max(20, Math.min(100, 78 + (isHighRisk ? -15 : isMedRisk ? -5 : 5) * (w / 16) + (weekRng() - 0.5) * 18 - gradualDecline * 15)),
      attendance: Math.max(0, Math.min(1, 0.92 - (isHighRisk ? 0.35 : isMedRisk ? 0.12 : 0) * (w / 16) + (weekRng() - 0.5) * 0.1)),
      lateSubmissions: Math.min(1, (isHighRisk ? 0.4 : isMedRisk ? 0.15 : 0.05) + gradualDecline * 0.5 + weekRng() * 0.15),
      forumPosts: Math.max(0, Math.round((isHighRisk ? 1 : isMedRisk ? 3 : 6) - gradualDecline * 3 + (weekRng() - 0.3) * 3)),
      offHoursActivity: Math.min(1, (isHighRisk ? 0.45 : isMedRisk ? 0.2 : 0.08) + gradualDecline * 0.3 + weekRng() * 0.12),
      sleepScore: Math.max(1, Math.min(10, (isHighRisk ? 4 : isMedRisk ? 6 : 8) + (weekRng() - 0.5) * 2 - gradualDecline * 2)),
      stressScore: Math.min(10, (isHighRisk ? 7.5 : isMedRisk ? 5 : 2.5) + gradualDecline * 2 + (weekRng() - 0.5) * 2),
    };
  });

  // Compute risk score from features
  const latest = weeks[weeks.length - 1];
  const prev = weeks[Math.max(0, weeks.length - 4)];
  const gradeTrend = (latest.grade - prev.grade) / 4;
  const attendDrop = prev.attendance - latest.attendance;
  const lateRatio = latest.lateSubmissions;
  const engagementDrop = (prev.forumPosts - latest.forumPosts) / Math.max(1, prev.forumPosts);
  const offHours = latest.offHoursActivity;

  const rawScore = (
    lateRatio * 0.25 +
    Math.max(0, -gradeTrend / 5) * 0.25 +
    attendDrop * 0.2 +
    Math.max(0, engagementDrop) * 0.15 +
    offHours * 0.15
  );
  const riskScore = Math.min(10, Math.max(0.5, rawScore * 12 + (rng() - 0.5)));

  // SHAP-like feature contributions
  const factors = [
    { factor: "Late Submissions", impact: lateRatio * 0.25 * 12, description: `${Math.round(lateRatio * 100)}% late rate` },
    { factor: "Grade Trend", impact: Math.max(0, -gradeTrend / 5) * 0.25 * 12, description: `${gradeTrend > 0 ? "+" : ""}${gradeTrend.toFixed(1)} pts/wk` },
    { factor: "Attendance Drop", impact: attendDrop * 0.2 * 12, description: `${Math.round(attendDrop * 100)}% decrease` },
    { factor: "Forum Activity", impact: Math.max(0, engagementDrop) * 0.15 * 12, description: `${latest.forumPosts} posts/wk` },
    { factor: "Off-Hours Activity", impact: offHours * 0.15 * 12, description: `${Math.round(offHours * 100)}% late logins` },
  ].sort((a, b) => b.impact - a.impact);

  return {
    id, name, major, year,
    hash: `STU${String(id).padStart(4, "0")}`,
    riskScore: parseFloat(riskScore.toFixed(2)),
    riskLevel: riskScore > 6.5 ? "high" : riskScore > 3.5 ? "medium" : "low",
    weeks, factors, latest,
    interventionOffered: isHighRisk && rng() > 0.4,
    interventionAccepted: isHighRisk && rng() > 0.6,
    email: `${name.split(" ")[0].toLowerCase()}@university.edu`,
  };
}

const STUDENTS = Array.from({ length: 40 }, (_, i) => generateStudent(i, 42));

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

function RiskBadge({ level, score }) {
  const config = {
    high: { bg: "rgba(247,114,79,0.15)", border: "rgba(247,114,79,0.4)", text: colors.high, label: "HIGH RISK" },
    medium: { bg: "rgba(247,201,79,0.15)", border: "rgba(247,201,79,0.4)", text: colors.medium, label: "MEDIUM RISK" },
    low: { bg: "rgba(56,217,169,0.15)", border: "rgba(56,217,169,0.4)", text: colors.low, label: "LOW RISK" },
  }[level];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20,
      background: config.bg, border: `1px solid ${config.border}`,
      color: config.text, fontSize: 11, fontWeight: 700, letterSpacing: 1,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: config.text,
        boxShadow: `0 0 8px ${config.text}`,
        animation: level === "high" ? "pulse 1.5s ease-in-out infinite" : "none",
      }} />
      {config.label} {score !== undefined && `• ${score}/10`}
    </span>
  );
}

function GaugeMeter({ score }) {
  const pct = score / 10;
  const color = pct > 0.65 ? colors.high : pct > 0.35 ? colors.medium : colors.low;
  const r = 70, cx = 90, cy = 90;
  const startAngle = -210, range = 240;
  const angle = startAngle + pct * range;
  const toRad = a => (a * Math.PI) / 180;
  const arcPath = (startDeg, endDeg, radius) => {
    const s = { x: cx + radius * Math.cos(toRad(startDeg)), y: cy + radius * Math.sin(toRad(startDeg)) };
    const e = { x: cx + radius * Math.cos(toRad(endDeg)), y: cy + radius * Math.sin(toRad(endDeg)) };
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const needleX = cx + (r - 15) * Math.cos(toRad(angle));
  const needleY = cy + (r - 15) * Math.sin(toRad(angle));

  return (
    <svg width={180} height={130} style={{ overflow: "visible" }}>
      {/* Track */}
      <path d={arcPath(-210, 30, r)} fill="none" stroke={colors.border} strokeWidth={12} strokeLinecap="round" />
      {/* Fill */}
      <path d={arcPath(-210, startAngle + pct * range, r)} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={colors.text} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={colors.text} />
      {/* Labels */}
      <text x={cx} y={cy + 22} textAnchor="middle" fill={color} fontSize={28} fontWeight={800} fontFamily="monospace">
        {score.toFixed(1)}
      </text>
      <text x={cx} y={cy + 38} textAnchor="middle" fill={colors.muted} fontSize={10} fontWeight={600} letterSpacing={1}>
        RISK SCORE
      </text>
    </svg>
  );
}

function StatCard({ label, value, sub, color = colors.accent1, icon }) {
  return (
    <div style={{
      background: colors.card, border: `1px solid ${colors.border}`,
      borderRadius: 16, padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 6,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}22, transparent 70%)`,
      }} />
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "monospace", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: colors.muted }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.text, letterSpacing: 0.5 }}>{title}</h2>
      {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.muted }}>{subtitle}</p>}
    </div>
  );
}

// ─── VIEWS ───────────────────────────────────────────────────────────────────

function StudentView({ student }) {
  const [week, setWeek] = useState(16);
  const weekData = student.weeks.slice(0, week);
  const latest = student.weeks[week - 1];

  const radarData = [
    { subject: "Attendance", A: latest.attendance * 100 },
    { subject: "Grades", A: latest.grade },
    { subject: "Engagement", A: Math.min(100, latest.forumPosts * 15) },
    { subject: "Sleep", A: latest.sleepScore * 10 },
    { subject: "Stress\n(inverse)", A: (10 - latest.stressScore) * 10 },
    { subject: "Punctuality", A: (1 - latest.lateSubmissions) * 100 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header Card */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.card}, ${colors.surface})`,
        border: `1px solid ${colors.border}`, borderRadius: 20, padding: 28,
        display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: `linear-gradient(135deg, ${colors.accent1}, ${colors.accent4})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          {student.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: colors.text }}>{student.name}</h2>
            <RiskBadge level={student.riskLevel} score={student.riskScore} />
          </div>
          <p style={{ margin: "4px 0 0", color: colors.muted, fontSize: 13 }}>
            {student.major} • Year {student.year} • {student.hash}
          </p>
        </div>
        <GaugeMeter score={student.riskScore} />
      </div>

      {/* Week Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: colors.muted, fontSize: 13 }}>View up to week:</span>
        <input type="range" min={1} max={16} value={week} onChange={e => setWeek(+e.target.value)}
          style={{ flex: 1, accentColor: colors.accent1 }} />
        <span style={{
          background: colors.card, border: `1px solid ${colors.border}`,
          borderRadius: 8, padding: "4px 12px", color: colors.accent1, fontWeight: 700, fontSize: 13,
        }}>Week {week}</span>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
        <StatCard icon="📊" label="Current Grade" value={`${Math.round(latest.grade)}%`} color={colors.accent2} />
        <StatCard icon="📅" label="Attendance" value={`${Math.round(latest.attendance * 100)}%`} color={colors.accent1} />
        <StatCard icon="⏰" label="Late Submissions" value={`${Math.round(latest.lateSubmissions * 100)}%`} color={colors.accent3} />
        <StatCard icon="💬" label="Forum Posts/wk" value={latest.forumPosts} color={colors.accent4} />
        <StatCard icon="🌙" label="Sleep Score" value={`${latest.sleepScore.toFixed(1)}/10`} color={colors.warn} />
        <StatCard icon="😰" label="Stress Score" value={`${latest.stressScore.toFixed(1)}/10`} color={colors.high} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Grade Trend */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
          <SectionHeader title="Grade Trajectory" subtitle="Academic performance over time" />
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weekData}>
              <defs>
                <linearGradient id="gradeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.accent1} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.accent1} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="week" stroke={colors.muted} fontSize={11} tickFormatter={v => `W${v}`} />
              <YAxis stroke={colors.muted} fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                labelFormatter={v => `Week ${v}`} formatter={v => [`${v.toFixed(1)}%`, "Grade"]} />
              <Area dataKey="grade" stroke={colors.accent1} fill="url(#gradeGrad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
          <SectionHeader title="Wellness Profile" subtitle="Current week multidimensional analysis" />
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={colors.border} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: colors.muted, fontSize: 10 }} />
              <Radar name="Student" dataKey="A" stroke={colors.accent2} fill={colors.accent2} fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
          <SectionHeader title="Attendance & Engagement" />
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="week" stroke={colors.muted} fontSize={11} tickFormatter={v => `W${v}`} />
              <YAxis stroke={colors.muted} fontSize={11} tickFormatter={v => `${Math.round(v * 100)}%`} />
              <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                formatter={v => [`${(v * 100).toFixed(1)}%`]} />
              <Line dataKey="attendance" stroke={colors.accent2} strokeWidth={2} dot={false} name="Attendance" />
              <Line dataKey="lateSubmissions" stroke={colors.accent3} strokeWidth={2} dot={false} name="Late Submissions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sleep & Stress */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
          <SectionHeader title="Sleep & Stress Indicators" />
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="week" stroke={colors.muted} fontSize={11} tickFormatter={v => `W${v}`} />
              <YAxis stroke={colors.muted} fontSize={11} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
              <Line dataKey="sleepScore" stroke={colors.accent4} strokeWidth={2} dot={false} name="Sleep Quality" />
              <Line dataKey="stressScore" stroke={colors.high} strokeWidth={2} dot={false} name="Stress Level" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Factors */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
        <SectionHeader title="Risk Factor Analysis" subtitle="SHAP-based feature importance for this student's prediction" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {student.factors.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 160, fontSize: 13, color: colors.text, fontWeight: 600 }}>{f.factor}</div>
              <div style={{ flex: 1, height: 10, background: colors.border, borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(100, f.impact * 12)}%`, height: "100%",
                  background: f.impact > 1.5 ? colors.high : f.impact > 0.8 ? colors.medium : colors.low,
                  borderRadius: 10, transition: "width 0.6s ease",
                }} />
              </div>
              <div style={{ width: 100, fontSize: 12, color: colors.muted, textAlign: "right" }}>{f.description}</div>
              <div style={{
                width: 50, textAlign: "right", fontSize: 13, fontWeight: 700,
                color: f.impact > 1.5 ? colors.high : f.impact > 0.8 ? colors.medium : colors.low,
              }}>{f.impact.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Intervention Panel */}
      {student.riskLevel !== "low" && (
        <div style={{
          background: student.riskLevel === "high" ? "rgba(247,114,79,0.08)" : "rgba(247,201,79,0.08)",
          border: `1px solid ${student.riskLevel === "high" ? colors.high : colors.medium}44`,
          borderRadius: 16, padding: 20,
        }}>
          <h3 style={{ margin: "0 0 16px", color: student.riskLevel === "high" ? colors.high : colors.medium, fontSize: 16 }}>
            ⚠️ {student.riskLevel === "high" ? "Immediate" : "Recommended"} Interventions
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {["📞 Schedule Counseling Session", "📚 Connect with Study Group", "✉️ Email Professor for Extension",
              "🏥 Wellness Check-in", "📖 Academic Tutoring", "🧘 Stress Management Resources"].map(action => (
              <button key={action} style={{
                background: colors.card, border: `1px solid ${colors.border}`,
                borderRadius: 10, padding: "10px 16px", color: colors.text,
                fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                fontFamily: "inherit",
              }}
                onMouseOver={e => { e.target.style.borderColor = colors.accent1; e.target.style.color = colors.accent1; }}
                onMouseOut={e => { e.target.style.borderColor = colors.border; e.target.style.color = colors.text; }}>
                {action}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FacultyView() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState("risk");

  const filtered = STUDENTS
    .filter(s => (filter === "all" || s.riskLevel === filter))
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.major.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === "risk" ? b.riskScore - a.riskScore : a.name.localeCompare(b.name));

  const high = STUDENTS.filter(s => s.riskLevel === "high").length;
  const medium = STUDENTS.filter(s => s.riskLevel === "medium").length;

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* Left Panel */}
      <div style={{ flex: selected ? "0 0 420px" : 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <StatCard icon="🎓" label="Total Students" value={STUDENTS.length} color={colors.accent1} />
          <StatCard icon="🔴" label="High Risk" value={high} sub="Need immediate attention" color={colors.high} />
          <StatCard icon="🟡" label="Medium Risk" value={medium} sub="Monitor closely" color={colors.medium} />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search students..."
            style={{
              flex: 1, minWidth: 200, background: colors.card, border: `1px solid ${colors.border}`,
              borderRadius: 10, padding: "10px 14px", color: colors.text, fontSize: 13,
              outline: "none", fontFamily: "inherit",
            }} />
          {["all", "high", "medium", "low"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? colors.accent1 : colors.card,
              border: `1px solid ${filter === f ? colors.accent1 : colors.border}`,
              borderRadius: 10, padding: "10px 16px", color: filter === f ? "#fff" : colors.muted,
              fontSize: 12, cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
              fontFamily: "inherit",
            }}>{f}</button>
          ))}
          <button onClick={() => setSortBy(s => s === "risk" ? "name" : "risk")} style={{
            background: colors.card, border: `1px solid ${colors.border}`,
            borderRadius: 10, padding: "10px 14px", color: colors.muted,
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>Sort: {sortBy === "risk" ? "Risk ↓" : "Name A-Z"}</button>
        </div>

        {/* Student List */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 8,
          maxHeight: "65vh", overflowY: "auto",
          paddingRight: 4,
        }}>
          {filtered.map(s => (
            <div key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)}
              style={{
                background: selected?.id === s.id ? `${colors.accent1}11` : colors.card,
                border: `1px solid ${selected?.id === s.id ? colors.accent1 : colors.border}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 12,
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${colors.accent1}88, ${colors.accent4}88)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#fff",
              }}>{s.name.split(" ").map(n => n[0]).join("")}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>{s.name}</span>
                  <RiskBadge level={s.riskLevel} />
                </div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {s.major} • {s.hash}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{
                  fontSize: 20, fontWeight: 800, fontFamily: "monospace",
                  color: s.riskLevel === "high" ? colors.high : s.riskLevel === "medium" ? colors.medium : colors.low,
                }}>{s.riskScore.toFixed(1)}</div>
                <div style={{ fontSize: 10, color: colors.muted }}>RISK</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div style={{
          flex: 1, background: colors.card, border: `1px solid ${colors.border}`,
          borderRadius: 20, padding: 24, overflowY: "auto", maxHeight: "85vh",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: colors.text, fontSize: 18 }}>Student Detail: {selected.name}</h3>
            <button onClick={() => setSelected(null)} style={{
              background: "none", border: "none", color: colors.muted, fontSize: 20, cursor: "pointer",
            }}>✕</button>
          </div>
          <StudentView student={selected} />
        </div>
      )}
    </div>
  );
}

function AdminView() {
  const riskDist = [
    { name: "Low Risk", value: STUDENTS.filter(s => s.riskLevel === "low").length, color: colors.low },
    { name: "Medium Risk", value: STUDENTS.filter(s => s.riskLevel === "medium").length, color: colors.medium },
    { name: "High Risk", value: STUDENTS.filter(s => s.riskLevel === "high").length, color: colors.high },
  ];

  const weeklyTrend = Array.from({ length: 16 }, (_, w) => ({
    week: `W${w + 1}`,
    avgGrade: STUDENTS.reduce((s, st) => s + st.weeks[w].grade, 0) / STUDENTS.length,
    avgAttendance: STUDENTS.reduce((s, st) => s + st.weeks[w].attendance, 0) / STUDENTS.length * 100,
    highRiskCount: STUDENTS.filter(st => st.weeks[w].stressScore > 7).length,
  }));

  const majorRisk = ["Computer Science", "Psychology", "Biology", "Engineering", "Business"].map(m => {
    const students = STUDENTS.filter(s => s.major === m);
    return {
      major: m.split(" ")[0],
      avgRisk: students.reduce((s, st) => s + st.riskScore, 0) / Math.max(1, students.length),
      count: students.length,
    };
  });

  const interventionStats = {
    offered: STUDENTS.filter(s => s.interventionOffered).length,
    accepted: STUDENTS.filter(s => s.interventionAccepted).length,
    highRisk: STUDENTS.filter(s => s.riskLevel === "high").length,
  };

  const scatterData = STUDENTS.map(s => ({
    grade: Math.round(s.latest.grade),
    risk: s.riskScore,
    attendance: Math.round(s.latest.attendance * 100),
    name: s.name,
    level: s.riskLevel,
  }));

  const riskColor = level => level === "high" ? colors.high : level === "medium" ? colors.medium : colors.low;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        <StatCard icon="👥" label="Total Students" value={STUDENTS.length} color={colors.accent1} sub="Active this semester" />
        <StatCard icon="⚠️" label="High Risk" value={riskDist[2].value} color={colors.high} sub={`${Math.round(riskDist[2].value / STUDENTS.length * 100)}% of cohort`} />
        <StatCard icon="📈" label="Avg Grade" value={`${Math.round(STUDENTS.reduce((s, st) => s + st.latest.grade, 0) / STUDENTS.length)}%`} color={colors.accent2} />
        <StatCard icon="✅" label="Interventions" value={interventionStats.accepted} color={colors.accent4} sub={`of ${interventionStats.offered} offered`} />
        <StatCard icon="🤖" label="Model ROC-AUC" value="0.813" color={colors.warn} sub="XGBoost + LSTM Ensemble" />
        <StatCard icon="⚡" label="Avg Response" value="142ms" color={colors.accent1} sub="API latency" />
      </div>

      {/* Main Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Weekly Cohort Trend */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, gridColumn: "span 2" }}>
          <SectionHeader title="Cohort Performance Trends" subtitle="Average grade, attendance and high-stress count over the semester" />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="week" stroke={colors.muted} fontSize={11} />
              <YAxis yAxisId="left" stroke={colors.muted} fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke={colors.muted} fontSize={11} />
              <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
              <Line yAxisId="left" dataKey="avgGrade" stroke={colors.accent1} strokeWidth={2.5} dot={false} name="Avg Grade (%)" />
              <Line yAxisId="left" dataKey="avgAttendance" stroke={colors.accent2} strokeWidth={2.5} dot={false} name="Avg Attendance (%)" />
              <Line yAxisId="right" dataKey="highRiskCount" stroke={colors.high} strokeWidth={2} dot={false} strokeDasharray="5 5" name="High Stress Students" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution Pie */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
          <SectionHeader title="Risk Distribution" subtitle="Current semester snapshot" />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <ResponsiveContainer width="60%" height={180}>
              <PieChart>
                <Pie data={riskDist} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} strokeWidth={0}>
                  {riskDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {riskDist.map(d => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, color: colors.text, fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: d.color, fontFamily: "monospace", lineHeight: 1.2 }}>{d.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk by Major */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
          <SectionHeader title="Avg Risk Score by Major" subtitle="Identifies high-risk departments" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={majorRisk} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={false} />
              <XAxis type="number" domain={[0, 10]} stroke={colors.muted} fontSize={11} />
              <YAxis dataKey="major" type="category" stroke={colors.muted} fontSize={11} width={80} />
              <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
              <Bar dataKey="avgRisk" radius={[0, 6, 6, 0]}>
                {majorRisk.map((d, i) => (
                  <Cell key={i} fill={d.avgRisk > 5 ? colors.high : d.avgRisk > 3 ? colors.medium : colors.low} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade vs Risk Scatter */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, gridColumn: "span 2" }}>
          <SectionHeader title="Grade vs. Risk Score Distribution" subtitle="Each bubble is a student; size = attendance rate" />
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="grade" name="Grade" stroke={colors.muted} fontSize={11} label={{ value: "Grade (%)", position: "insideBottom", offset: -3, fill: colors.muted, fontSize: 11 }} />
              <YAxis dataKey="risk" name="Risk Score" stroke={colors.muted} fontSize={11} domain={[0, 10]} />
              <ZAxis dataKey="attendance" range={[30, 150]} />
              <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                content={({ payload }) => payload?.length ? (
                  <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 10, fontSize: 12 }}>
                    <div style={{ color: colors.text, fontWeight: 700 }}>{payload[0]?.payload.name}</div>
                    <div style={{ color: colors.muted }}>Grade: {payload[0]?.payload.grade}% | Risk: {payload[0]?.payload.risk}</div>
                    <div style={{ color: colors.muted }}>Attendance: {payload[0]?.payload.attendance}%</div>
                  </div>
                ) : null} />
              <Scatter data={scatterData}>
                {scatterData.map((d, i) => <Cell key={i} fill={riskColor(d.level)} fillOpacity={0.8} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Performance */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24 }}>
        <SectionHeader title="Model Performance Metrics" subtitle="Comparison of XGBoost, LSTM, and Ensemble models" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[
            { model: "XGBoost (Baseline)", auc: 0.762, precision: 0.71, recall: 0.64, f1: 0.675, color: colors.accent1 },
            { model: "LSTM (Time-Series)", auc: 0.789, precision: 0.74, recall: 0.68, f1: 0.709, color: colors.accent4 },
            { model: "Ensemble (XGB + LSTM)", auc: 0.813, precision: 0.78, recall: 0.72, f1: 0.749, color: colors.accent2 },
          ].map(m => (
            <div key={m.model} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: m.color, marginBottom: 12 }}>{m.model}</div>
              {[["ROC-AUC", m.auc], ["Precision", m.precision], ["Recall", m.recall], ["F1 Score", m.f1]].map(([label, val]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 80, fontSize: 12, color: colors.muted }}>{label}</span>
                  <div style={{ flex: 1, height: 8, background: colors.border, borderRadius: 4 }}>
                    <div style={{ width: `${val * 100}%`, height: "100%", background: m.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 40, textAlign: "right", fontSize: 12, fontWeight: 700, color: m.color, fontFamily: "monospace" }}>{val}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Intervention Tracker */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24 }}>
        <SectionHeader title="Intervention Outcomes" subtitle="Tracking effectiveness of mental health support offered" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { label: "Students Flagged", value: interventionStats.highRisk, pct: 100, color: colors.high },
            { label: "Interventions Offered", value: interventionStats.offered, pct: Math.round(interventionStats.offered / interventionStats.highRisk * 100), color: colors.medium },
            { label: "Interventions Accepted", value: interventionStats.accepted, pct: Math.round(interventionStats.accepted / interventionStats.offered * 100), color: colors.low },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: item.color, fontFamily: "monospace" }}>{item.value}</div>
              <div style={{ fontSize: 13, color: colors.text, marginBottom: 8 }}>{item.label}</div>
              <div style={{ height: 6, background: colors.border, borderRadius: 3 }}>
                <div style={{ width: `${item.pct}%`, height: "100%", background: item.color, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, color: item.color, marginTop: 4 }}>{item.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MLView() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [results, setResults] = useState(null);
  const [selectedModel, setSelectedModel] = useState("ensemble");

  const runSimulation = useCallback(async () => {
    setRunning(true);
    setResults(null);
    const phases = [
      [5, "Loading synthetic dataset (500 students, 120 days)…"],
      [15, "Feature engineering: computing academic signals…"],
      [25, "Feature engineering: behavioral change indicators…"],
      [35, "Preprocessing: scaling, train/test split (time-based)…"],
      [50, "Training XGBoost classifier (200 estimators)…"],
      [65, "Building LSTM sequences (lookback=28 days)…"],
      [78, "Training LSTM model (50 epochs)…"],
      [88, "Computing ensemble predictions (0.6 XGB + 0.4 LSTM)…"],
      [95, "Running SHAP analysis and fairness checks…"],
      [100, "Complete! Models ready for inference."],
    ];
    for (const [p, msg] of phases) {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
      setProgress(p);
      setPhase(msg);
    }
    setRunning(false);
    setResults({
      xgb: { auc: 0.762, precision: 0.71, recall: 0.64, f1: 0.675, trainTime: "2.3s" },
      lstm: { auc: 0.789, precision: 0.74, recall: 0.68, f1: 0.709, trainTime: "18.7s" },
      ensemble: { auc: 0.813, precision: 0.78, recall: 0.72, f1: 0.749, trainTime: "21.2s" },
    });
  }, []);

  const rocData = Array.from({ length: 21 }, (_, i) => {
    const t = i / 20;
    const models = {
      xgb: { fpr: t, tpr: Math.min(1, t * 0.762 + Math.pow(t, 0.7) * 0.3) },
      lstm: { fpr: t, tpr: Math.min(1, t * 0.789 + Math.pow(t, 0.65) * 0.32) },
      ensemble: { fpr: t, tpr: Math.min(1, t * 0.813 + Math.pow(t, 0.6) * 0.34) },
      random: { fpr: t, tpr: t },
    };
    return { fpr: t, xgb: models.xgb.tpr, lstm: models.lstm.tpr, ensemble: models.ensemble.tpr, random: models.random.tpr };
  });

  const featureImportance = [
    { feature: "Grade Slope (4-wk)", xgb: 0.22, lstm: 0.19 },
    { feature: "Late Submission Ratio", xgb: 0.19, lstm: 0.21 },
    { feature: "Attendance Drop", xgb: 0.18, lstm: 0.17 },
    { feature: "Off-Hours Activity", xgb: 0.14, lstm: 0.13 },
    { feature: "Forum Engagement", xgb: 0.12, lstm: 0.14 },
    { feature: "Sleep Score (survey)", xgb: 0.09, lstm: 0.10 },
    { feature: "Stress Score (survey)", xgb: 0.06, lstm: 0.06 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Architecture Diagram */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24 }}>
        <SectionHeader title="System Architecture" subtitle="End-to-end ML pipeline for mental health risk prediction" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 8, padding: "10px 0" }}>
          {[
            { label: "Data Sources", items: ["Canvas LMS", "Attendance DB", "Surveys", "Wearables"], color: colors.accent1 },
            { label: "Pipeline", items: ["Feature Eng.", "Normalize", "Handle Nulls"], color: colors.accent4 },
            { label: "ML Models", items: ["XGBoost", "LSTM", "Ensemble"], color: colors.accent2 },
            { label: "Output", items: ["Risk Score", "SHAP Factors", "Confidence"], color: colors.warn },
            { label: "Dashboards", items: ["Student", "Faculty", "Admin"], color: colors.high },
          ].map((box, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                background: `${box.color}11`, border: `1px solid ${box.color}44`,
                borderRadius: 12, padding: "12px 16px", textAlign: "center", minWidth: 110,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: box.color, letterSpacing: 1, marginBottom: 8 }}>{box.label}</div>
                {box.items.map(item => (
                  <div key={item} style={{
                    fontSize: 11, color: colors.muted, background: colors.border + "88",
                    borderRadius: 6, padding: "3px 8px", margin: "3px 0",
                  }}>{item}</div>
                ))}
              </div>
              {i < 4 && <div style={{ color: colors.muted, fontSize: 18, flexShrink: 0 }}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Training Simulator */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24 }}>
        <SectionHeader title="Live Training Simulator" subtitle="Simulate the full ML training pipeline" />
        <button onClick={runSimulation} disabled={running} style={{
          background: running ? colors.surface : `linear-gradient(135deg, ${colors.accent1}, ${colors.accent4})`,
          border: "none", borderRadius: 12, padding: "14px 28px",
          color: running ? colors.muted : "#fff", fontSize: 15, fontWeight: 700,
          cursor: running ? "not-allowed" : "pointer", marginBottom: 20,
          fontFamily: "inherit", transition: "opacity 0.2s",
        }}>
          {running ? "⚙️ Training..." : "🚀 Run Training Pipeline"}
        </button>

        {(running || results) && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, height: 12, background: colors.border, borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  width: `${progress}%`, height: "100%",
                  background: `linear-gradient(90deg, ${colors.accent1}, ${colors.accent2})`,
                  transition: "width 0.3s ease", borderRadius: 6,
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: colors.accent1, fontFamily: "monospace", width: 40 }}>
                {progress}%
              </span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: colors.muted, marginBottom: 16 }}>
              {">"} {phase}
            </div>
          </div>
        )}

        {results && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {["xgb", "lstm", "ensemble"].map(m => (
                <button key={m} onClick={() => setSelectedModel(m)} style={{
                  background: selectedModel === m ? colors.accent1 : colors.surface,
                  border: `1px solid ${selectedModel === m ? colors.accent1 : colors.border}`,
                  borderRadius: 8, padding: "8px 16px", color: selectedModel === m ? "#fff" : colors.muted,
                  fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>{m === "xgb" ? "XGBoost" : m === "lstm" ? "LSTM" : "Ensemble"}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {[["ROC-AUC", results[selectedModel].auc], ["Precision", results[selectedModel].precision],
                ["Recall", results[selectedModel].recall], ["F1 Score", results[selectedModel].f1],
                ["Train Time", results[selectedModel].trainTime]].map(([k, v]) => (
                <div key={k} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: colors.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{k}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: colors.accent2, fontFamily: "monospace" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ROC Curve */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
          <SectionHeader title="ROC Curves" subtitle="Receiver Operating Characteristic comparison" />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rocData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="fpr" stroke={colors.muted} fontSize={11} label={{ value: "False Positive Rate", position: "insideBottom", offset: -2, fill: colors.muted, fontSize: 10 }} />
              <YAxis stroke={colors.muted} fontSize={11} label={{ value: "True Positive Rate", angle: -90, position: "insideLeft", fill: colors.muted, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
              <Line dataKey="ensemble" stroke={colors.accent2} strokeWidth={2.5} dot={false} name="Ensemble (0.813)" />
              <Line dataKey="lstm" stroke={colors.accent4} strokeWidth={2} dot={false} name="LSTM (0.789)" />
              <Line dataKey="xgb" stroke={colors.accent1} strokeWidth={2} dot={false} name="XGBoost (0.762)" />
              <Line dataKey="random" stroke={colors.muted} strokeWidth={1} dot={false} strokeDasharray="4 4" name="Random (0.500)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Importance */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
          <SectionHeader title="Feature Importance" subtitle="XGBoost vs LSTM signal weights" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={featureImportance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={false} />
              <XAxis type="number" stroke={colors.muted} fontSize={10} />
              <YAxis dataKey="feature" type="category" stroke={colors.muted} fontSize={10} width={140} />
              <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
              <Bar dataKey="xgb" fill={colors.accent1} radius={[0, 4, 4, 0]} name="XGBoost" />
              <Bar dataKey="lstm" fill={colors.accent4} radius={[0, 4, 4, 0]} name="LSTM" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function LivePredictor() {
  const [form, setForm] = useState({
    gradeSlope: -3, lateRatio: 0.3, attendanceDrop: 0.15,
    forumPosts: 2, offHours: 0.35, sleepScore: 5, stressScore: 7,
  });
  const [result, setResult] = useState(null);

  const computeRisk = () => {
    const { gradeSlope, lateRatio, attendanceDrop, forumPosts, offHours, sleepScore, stressScore } = form;
    const raw = (
      lateRatio * 0.25 +
      Math.max(0, -gradeSlope / 5) * 0.25 +
      attendanceDrop * 0.2 +
      Math.max(0, (5 - forumPosts) / 5) * 0.15 +
      offHours * 0.15
    );
    const sleepBonus = (10 - sleepScore) * 0.04;
    const stressBonus = stressScore * 0.05;
    const score = Math.min(10, Math.max(0.5, raw * 12 + sleepBonus + stressBonus));
    setResult({
      score: parseFloat(score.toFixed(2)),
      level: score > 6.5 ? "high" : score > 3.5 ? "medium" : "low",
      xgb: parseFloat((score * 0.93 + Math.random() * 0.4).toFixed(2)),
      lstm: parseFloat((score * 0.97 + Math.random() * 0.3).toFixed(2)),
    });
  };

  const sliders = [
    { key: "gradeSlope", label: "Grade Trend (pts/wk)", min: -10, max: 5, step: 0.5, fmt: v => `${v > 0 ? "+" : ""}${v}` },
    { key: "lateRatio", label: "Late Submission Rate", min: 0, max: 1, step: 0.05, fmt: v => `${Math.round(v * 100)}%` },
    { key: "attendanceDrop", label: "Attendance Drop", min: 0, max: 0.5, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
    { key: "forumPosts", label: "Weekly Forum Posts", min: 0, max: 10, step: 1, fmt: v => v },
    { key: "offHours", label: "Off-Hours Activity (2–6 AM)", min: 0, max: 1, step: 0.05, fmt: v => `${Math.round(v * 100)}%` },
    { key: "sleepScore", label: "Sleep Quality (survey)", min: 1, max: 10, step: 0.5, fmt: v => `${v}/10` },
    { key: "stressScore", label: "Stress Level (survey)", min: 1, max: 10, step: 0.5, fmt: v => `${v}/10` },
  ];

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      {/* Controls */}
      <div style={{ flex: "1 1 340px", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24 }}>
        <SectionHeader title="Live Risk Predictor" subtitle="Adjust inputs to see real-time risk score from the ensemble model" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sliders.map(({ key, label, min, max, step, fmt }) => (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: colors.text }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: colors.accent1, fontFamily: "monospace" }}>
                  {fmt(form[key])}
                </span>
              </div>
              <input type="range" min={min} max={max} step={step} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
                style={{ width: "100%", accentColor: colors.accent1 }} />
            </div>
          ))}
        </div>
        <button onClick={computeRisk} style={{
          marginTop: 20, width: "100%",
          background: `linear-gradient(135deg, ${colors.accent1}, ${colors.accent2})`,
          border: "none", borderRadius: 12, padding: "14px", color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>⚡ Predict Risk Score</button>
      </div>

      {/* Results */}
      <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 16 }}>
        {result ? (
          <>
            <div style={{
              background: colors.card, border: `1px solid ${colors.border}`,
              borderRadius: 16, padding: 24, textAlign: "center",
            }}>
              <GaugeMeter score={result.score} />
              <div style={{ marginTop: 12 }}>
                <RiskBadge level={result.level} score={result.score} />
              </div>
            </div>
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 12 }}>Model Breakdown</div>
              {[["XGBoost", result.xgb, colors.accent1], ["LSTM", result.lstm, colors.accent4], ["Ensemble", result.score, colors.accent2]].map(([m, v, c]) => (
                <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 70, fontSize: 12, color: colors.muted }}>{m}</span>
                  <div style={{ flex: 1, height: 8, background: colors.border, borderRadius: 4 }}>
                    <div style={{ width: `${Math.min(v * 10, 100)}%`, height: "100%", background: c, borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 40, textAlign: "right", fontSize: 13, fontWeight: 700, color: c, fontFamily: "monospace" }}>{v}</span>
                </div>
              ))}
            </div>
            {result.level !== "low" && (
              <div style={{
                background: result.level === "high" ? "rgba(247,114,79,0.1)" : "rgba(247,201,79,0.1)",
                border: `1px solid ${result.level === "high" ? colors.high : colors.medium}44`,
                borderRadius: 16, padding: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: result.level === "high" ? colors.high : colors.medium, marginBottom: 8 }}>
                  Recommended Actions
                </div>
                {(result.level === "high"
                  ? ["Immediate counseling referral", "Professor notification", "Academic advisor check-in"]
                  : ["Monitor weekly", "Send wellness check-in", "Suggest study group"]).map(a => (
                  <div key={a} style={{ fontSize: 13, color: colors.muted, padding: "4px 0" }}>• {a}</div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{
            background: colors.card, border: `1px solid ${colors.border}`,
            borderRadius: 16, padding: 40, textAlign: "center", color: colors.muted, fontSize: 14,
          }}>
            Adjust inputs and click<br />"Predict Risk Score" to see<br />the ensemble prediction.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "admin", label: "📊 Admin Dashboard", desc: "System-wide analytics" },
  { id: "faculty", label: "👩‍🏫 Faculty View", desc: "Class management" },
  { id: "student", label: "🎓 Student Portal", desc: "Personal wellness" },
  { id: "ml", label: "🤖 ML Pipeline", desc: "Model training & eval" },
  { id: "predictor", label: "⚡ Live Predictor", desc: "Real-time inference" },
];

export default function App() {
  const [tab, setTab] = useState("admin");
  const [myStudentIdx, setMyStudentIdx] = useState(0);

  return (
    <div style={{
      minHeight: "100vh", background: colors.bg,
      fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace",
      color: colors.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${colors.bg}; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        body { margin: 0; }
      `}</style>

      {/* Top Nav */}
      <div style={{
        background: colors.surface, borderBottom: `1px solid ${colors.border}`,
        padding: "0 24px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, maxWidth: 1400, margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ padding: "16px 24px 16px 0", marginRight: 8, borderRight: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: `linear-gradient(135deg, ${colors.accent1}, ${colors.accent4})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
              }}>🧠</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: colors.text, letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>MindTrack</div>
                <div style={{ fontSize: 10, color: colors.muted, letterSpacing: 1 }}>AI EARLY WARNING SYSTEM</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", flex: 1, overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: "none", border: "none", padding: "18px 16px",
                color: tab === t.id ? colors.accent1 : colors.muted,
                cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
                borderBottom: `2px solid ${tab === t.id ? colors.accent1 : "transparent"}`,
                transition: "all 0.2s", whiteSpace: "nowrap",
                fontFamily: "'DM Sans', sans-serif",
              }}>{t.label}</button>
            ))}
          </div>

          {/* Status */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "0 16px",
            fontSize: 11, color: colors.accent2,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: colors.accent2,
              animation: "pulse 2s ease-in-out infinite",
            }} />
            LIVE
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
        {tab === "student" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ color: colors.muted, fontSize: 13 }}>Viewing student:</span>
              <select value={myStudentIdx} onChange={e => setMyStudentIdx(+e.target.value)}
                style={{
                  background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8,
                  padding: "8px 12px", color: colors.text, fontSize: 13, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                {STUDENTS.map((s, i) => (
                  <option key={i} value={i}>{s.name} ({s.riskLevel.toUpperCase()} — {s.riskScore}/10)</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {tab === "admin" && <AdminView />}
        {tab === "faculty" && <FacultyView />}
        {tab === "student" && <StudentView student={STUDENTS[myStudentIdx]} />}
        {tab === "ml" && <MLView />}
        {tab === "predictor" && <LivePredictor />}
      </div>
    </div>
  );
}