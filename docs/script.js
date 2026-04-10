const API = 'http://localhost:5000';
 
// ── SET DEFAULT DATES ──
const examDefault = new Date();
examDefault.setDate(examDefault.getDate() + 30);
const dateStr = examDefault.toISOString().split('T')[0];
['examDate','wExamDate','pExamDate'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.value = dateStr;
});
 
// ── HEALTH CHECK ──
async function checkHealth() {
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
    const d = await r.json();
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (d.ready) {
      dot.className = 'status-dot online';
      txt.textContent = 'Server online';
    } else {
      dot.className = 'status-dot';
      txt.textContent = 'Model not loaded';
    }
  } catch {
    document.getElementById('statusText').textContent = 'Server offline';
  }
}
checkHealth();
setInterval(checkHealth, 10000);
 
// ── TAB SWITCHING ──
function switchTab(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${tab}`).classList.add('active');
  event.target.classList.add('active');
}
 
// ── TAG INPUT SYSTEM ──
function setupTags(containerId, inputId) {
  const container = document.getElementById(containerId);
  const input = document.getElementById(inputId);
  const tags = [];
 
  input.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
      e.preventDefault();
      const val = input.value.trim().replace(/,$/, '');
      if (val && !tags.includes(val)) {
        tags.push(val);
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `${val} <span class="tag-remove" onclick="removeTag('${containerId}','${val}',${JSON.stringify(tags)})">×</span>`;
        tag.dataset.val = val;
        container.insertBefore(tag, input);
      }
      input.value = '';
    }
    if (e.key === 'Backspace' && !input.value && tags.length) {
      const last = tags.pop();
      container.querySelector(`[data-val="${last}"]`)?.remove();
    }
  });
 
  container._getTags = () => [...tags];
  container._tags = tags;
}
 
function removeTag(containerId, val, tags) {
  const container = document.getElementById(containerId);
  container.querySelector(`[data-val="${val}"]`)?.remove();
  const idx = container._tags.indexOf(val);
  if (idx > -1) container._tags.splice(idx, 1);
}
 
setupTags('weakTagsContainer', 'weakTagInput');
setupTags('wWeakTagsContainer', 'wWeakTagInput');
setupTags('wStrongTagsContainer', 'wStrongTagInput');
setupTags('pWeakTagsContainer', 'pWeakTagInput');
setupTags('pStrongTagsContainer', 'pStrongTagInput');
 
function getTagsFrom(containerId) {
  return document.getElementById(containerId)._tags || [];
}
 
function getMarks(cls) {
  return Array.from(document.querySelectorAll(`.${cls}`))
    .map(el => parseFloat(el.value) || 0);
}
 
// ── SCORE RING ANIMATION ──
function animateRing(score) {
  const circ = 2 * Math.PI * 56;
  const arc = document.getElementById('scoreArc');
  const offset = circ - (score / 100) * circ;
  arc.style.strokeDashoffset = offset;
 
  const color = score >= 75 ? '#6ee7b7' : score >= 55 ? '#fbbf24' : '#f87171';
  arc.style.stroke = color;
  document.getElementById('scoreNum').style.color = color;
 
  // Animate number
  let start = 0;
  const step = score / 40;
  const iv = setInterval(() => {
    start = Math.min(start + step, score);
    document.getElementById('scoreNum').textContent = Math.round(start);
    if (start >= score) clearInterval(iv);
  }, 20);
}
 
// ── PREDICT ──
async function runPredict() {
  const btn = document.getElementById('predictBtn');
  btn.disabled = true; btn.textContent = '⏳ Predicting...';
  document.getElementById('results').style.display = 'none';
  document.getElementById('predictLoading').style.display = 'block';
  document.getElementById('predictError').style.display = 'none';
 
  const payload = {
    past_marks: getMarks('mark-input'),
    subject: document.getElementById('subject').value,
    exam_date: document.getElementById('examDate').value,
    study_hours_per_day: parseFloat(document.getElementById('studyHours').value),
    study_consistency: parseFloat(document.getElementById('consistency').value),
    attendance_pct: parseFloat(document.getElementById('attendance').value),
    weak_topics: getTagsFrom('weakTagsContainer')
  };
 
  try {
    const r = await fetch(`${API}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
 
    document.getElementById('predictLoading').style.display = 'none';
 
    if (d.error) {
      document.getElementById('predictError').style.display = 'block';
      document.getElementById('predictError').innerHTML = `<div class="error-box">⚠️ ${d.error}</div>`;
    } else {
      // Score
      animateRing(d.predicted_score);
 
      // Status badge
      const statusEl = document.getElementById('scoreStatus');
      statusEl.textContent = d.status;
      statusEl.className = 'score-status ' +
        (d.risk_level === 'low' ? 'status-good' : d.risk_level === 'medium' ? 'status-avg' : 'status-risk');
 
      document.getElementById('confidenceTxt').textContent =
        `Confidence: ${d.confidence}  ·  Risk: ${d.risk_level}`;
 
      // Stats chips
      const f = d.features_used;
      document.getElementById('statsChips').innerHTML = [
        { v: f.avg_marks.toFixed(1), l: 'Avg Marks' },
        { v: f.marks_trend > 0 ? '+' + f.marks_trend.toFixed(2) : f.marks_trend.toFixed(2), l: 'Trend' },
        { v: f.attendance_pct + '%', l: 'Attendance' },
        { v: f.study_hours_per_day + 'h', l: 'Study / Day' },
        { v: f.num_weak_topics, l: 'Weak Topics' },
        { v: f.days_until_exam + 'd', l: 'Days Left' },
      ].map(c => `
        <div class="stat-chip">
          <div class="stat-chip-val">${c.v}</div>
          <div class="stat-chip-lbl">${c.l}</div>
        </div>`).join('');
 
      // Drivers
      const drivers = d.key_drivers || [];
      document.getElementById('driversList').innerHTML = drivers.length
        ? drivers.map(dr => `
          <div class="driver-row">
            <div class="driver-badge ${dr.impact === 'positive' ? 'pos' : 'neg'}"></div>
            <span>${dr.factor}</span>
            <span style="margin-left:auto; font-size:12px; color:var(--muted)">${dr.impact}</span>
          </div>`).join('')
        : '<div style="color:var(--muted); font-size:14px">No strong drivers detected.</div>';
 
      document.getElementById('results').style.display = 'block';
    }
  } catch (err) {
    document.getElementById('predictLoading').style.display = 'none';
    document.getElementById('predictError').style.display = 'block';
    document.getElementById('predictError').innerHTML =
      `<div class="error-box">❌ Cannot connect to server. Make sure <code>python app.py</code> is running on port 5000.</div>`;
  }
 
  btn.disabled = false; btn.textContent = '→ Predict My Score';
}
 
// ── WEAKNESS ──
async function runWeakness() {
  document.getElementById('weaknessResults').style.display = 'none';
  document.getElementById('weaknessLoading').style.display = 'block';
  document.getElementById('weaknessError').style.display = 'none';
 
  const payload = {
    past_marks: getMarks('wmark-input'),
    exam_date: document.getElementById('wExamDate').value,
    study_hours_per_day: parseFloat(document.getElementById('wStudyHours').value),
    attendance_pct: parseFloat(document.getElementById('wAttendance').value),
    weak_topics: getTagsFrom('wWeakTagsContainer'),
    strong_topics: getTagsFrom('wStrongTagsContainer')
  };
 
  try {
    const r = await fetch(`${API}/weakness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
 
    document.getElementById('weaknessLoading').style.display = 'none';
 
    if (d.error) {
      document.getElementById('weaknessError').style.display = 'block';
      document.getElementById('weaknessError').innerHTML = `<div class="error-box">⚠️ ${d.error}</div>`;
      return;
    }
 
    const trendIcon = d.trend.includes('improving') ? '📈' : d.trend.includes('declining') ? '📉' : '➡️';
    const bandColor = d.score_band === 'Good' ? 'var(--accent)' : d.score_band === 'Average' ? 'var(--warn)' : 'var(--danger)';
 
    document.getElementById('wStatChips').innerHTML = [
      { v: d.average_score, l: 'Avg Score' },
      { v: `${trendIcon} ${d.trend}`, l: 'Trend' },
      { v: d.score_band, l: 'Band', color: bandColor },
    ].map(c => `
      <div class="stat-chip">
        <div class="stat-chip-val" style="color:${c.color||'var(--text)'}">${c.v}</div>
        <div class="stat-chip-lbl">${c.l}</div>
      </div>`).join('');
 
    document.getElementById('wInsights').innerHTML = d.insights.length
      ? d.insights.map(i => `<div class="insight-item">${i}</div>`).join('')
      : '<div style="color:var(--muted); font-size:14px">No critical issues detected.</div>';
 
    document.getElementById('wFocusAreas').innerHTML = d.focus_areas.length
      ? d.focus_areas.map(f => `
        <div class="focus-area">
          <span style="font-size:14px; font-weight:500">${f.topic}</span>
          <div style="display:flex; align-items:center; gap:10px">
            <span style="font-size:12px; color:var(--muted)">${f.suggested_hours}h suggested</span>
            <span class="priority-badge priority-${f.priority}">${f.priority}</span>
          </div>
        </div>`).join('')
      : '<div style="color:var(--muted); font-size:14px">No weak topics entered.</div>';
 
    document.getElementById('weaknessResults').style.display = 'block';
  } catch (err) {
    document.getElementById('weaknessLoading').style.display = 'none';
    document.getElementById('weaknessError').style.display = 'block';
    document.getElementById('weaknessError').innerHTML =
      `<div class="error-box">❌ Cannot connect to server. Make sure <code>python app.py</code> is running.</div>`;
  }
}
 
// ── STUDY PLAN ──
async function runPlan() {
  document.getElementById('planResults').style.display = 'none';
  document.getElementById('planLoading').style.display = 'block';
  document.getElementById('planError').style.display = 'none';
 
  const payload = {
    past_marks: getMarks('pmark-input'),
    exam_date: document.getElementById('pExamDate').value,
    study_hours_per_day: parseFloat(document.getElementById('pStudyHours').value),
    weak_topics: getTagsFrom('pWeakTagsContainer'),
    strong_topics: getTagsFrom('pStrongTagsContainer')
  };
 
  try {
    const r = await fetch(`${API}/study-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
 
    document.getElementById('planLoading').style.display = 'none';
 
    if (d.error) {
      document.getElementById('planError').style.display = 'block';
      document.getElementById('planError').innerHTML = `<div class="error-box">⚠️ ${d.error}</div>`;
      return;
    }
 
    document.getElementById('pStatChips').innerHTML = [
      { v: d.days_until_exam + 'd', l: 'Days Left' },
      { v: d.total_study_hours + 'h', l: 'Total Hours' },
      { v: d.allocation.weak_topics + 'h', l: 'Weak Focus' }
    ].map(c => `
      <div class="stat-chip">
        <div class="stat-chip-val">${c.v}</div>
        <div class="stat-chip-lbl">${c.l}</div>
      </div>`).join('');
 
    // Hours bars
    const total = d.total_study_hours || 1;
    document.getElementById('pHoursBars').innerHTML = [
      { label: 'Weak Topics', val: d.allocation.weak_topics, color: 'var(--accent)' },
      { label: 'Practice Tests', val: d.allocation.practice_tests, color: 'var(--accent2)' },
      { label: 'Revision', val: d.allocation.revision, color: 'var(--warn)' },
    ].map(b => `
      <div class="hours-bar-wrap">
        <div class="hours-bar-label">
          <span>${b.label}</span>
          <span>${b.val}h</span>
        </div>
        <div class="hours-bar-track">
          <div class="hours-bar-fill" style="width:${(b.val/total)*100}%; background:${b.color}"></div>
        </div>
      </div>`).join('');
 
    document.getElementById('pDailySchedule').innerHTML = d.daily_schedule.map(s => `
      <div class="sched-slot">
        <div class="sched-time">${s.slot} · ${s.duration}</div>
        <div class="sched-act">${s.activity}</div>
        <div class="sched-tip">💡 ${s.tip}</div>
      </div>`).join('');
 
    document.getElementById('pMilestones').innerHTML = d.milestones.map(m => `
      <div class="week-item">
        <div class="week-num">W${m.week}</div>
        <div>
          <div style="font-size:14px; font-weight:500; margin-bottom:4px">${m.goal}</div>
          <div style="font-size:12px; color:var(--muted)">✓ ${m.checkpoint}</div>
        </div>
      </div>`).join('');
 
    document.getElementById('pWeeklyOverview').innerHTML = d.weekly_overview.map(w => `
      <div class="focus-area">
        <div>
          <div style="font-size:14px; font-weight:500">${w.topic}</div>
          <div style="font-size:12px; color:var(--muted)">${w.type}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px; font-weight:600; color:var(--accent)">${w.allocated_hours}h</div>
          <div style="font-size:11px; color:var(--muted)">${w.urgency}</div>
        </div>
      </div>`).join('');
 
    document.getElementById('planResults').style.display = 'block';
  } catch (err) {
    document.getElementById('planLoading').style.display = 'none';
    document.getElementById('planError').style.display = 'block';
    document.getElementById('planError').innerHTML =
      `<div class="error-box">❌ Cannot connect to server. Make sure <code>python app.py</code> is running.</div>`;
  }
}

// This is for footer that i added
function showMember(name) {
    const card = document.getElementById("member-card");

    let data = {
        bidhan: {
            img: "MyImage.jpeg",
            name: "Bidhan Yadav",
        },
        sumit: {
            img: "SumitBro.jpeg",
            name: "Sumit Chandra",
        },
        priyam: {
            img: "priyamPic.jpeg",
            name: "Priyam Jha",
        },
        kshitij:{
            img:"kshitijPic.jpeg",
            name:"kshitij"
        },
        Aaryan:{
          img:"aaryan.jpeg",
          name:"Aaryan"
        }
    };

    document.getElementById("member-img").src = data[name].img;
    document.getElementById("member-name").innerText = data[name].name;

    card.style.display = "block";
}

function closeCard() {
    document.getElementById("member-card").style.display = "none";
}