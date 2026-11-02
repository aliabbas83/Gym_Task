(() => {
  let muscles, week, equipment, exercises, exById, eqById;
  function useCatalog(g) {
    ({ muscles, week, equipment, exercises } = g);
    exById = Object.fromEntries(exercises.map(e => [e.id, e]));
    eqById = Object.fromEntries(equipment.map(e => [e.id, e]));
  }
  useCatalog(window.GYM); // bundled copy renders instantly; Supabase replaces it once loaded
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
  };

  const LEVELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
  const GOALS = { hypertrophy: "Muscle building", strength: "Strength", endurance: "Toning & fat loss" };
  // Exercises per muscle: days with one muscle get more, days with two muscles split the work.
  const COUNTS = { 1: { beginner: 4, intermediate: 5, advanced: 6 }, 2: { beginner: 3, intermediate: 4, advanced: 5 } };
  // Reps come from each exercise (always 10–14). The goal only changes rest time and load.
  const REST = {
    hypertrophy: { Compound: 90, Isolation: 60 },
    strength:    { Compound: 150, Isolation: 90 },
    endurance:   { Compound: 45, Isolation: 30 }
  };
  const REP_MIN = 10, REP_MAX = 14;

  const state = {
    level: store.get("ih.level", "intermediate"),
    goal: store.get("ih.goal", "hypertrophy"),
    muscle: "all", type: "all", q: "", eqCat: "All"
  };

  // ---------- program logic ----------
  function scheme(ex, level, goal) {
    const base = ex.sets || (ex.type === "Compound" ? 4 : 3);
    const sets = level === "beginner" ? 3 : level === "advanced" ? Math.min(base + 1, 6) : base;
    const lo = Math.max(REP_MIN, ex.repsMin || REP_MIN), hi = Math.min(REP_MAX, ex.repsMax || REP_MAX);
    return { sets, reps: lo === hi ? `${lo}` : `${lo}–${hi}`, rest: REST[goal][ex.type], kg: kgText(ex, level) };
  }
  // Starting weight for a member level, e.g. "60 kg", "BW + 10 kg" or "Bodyweight".
  function kgText(ex, level) {
    const w = ex.weights;
    if (!w) return "";
    const n = w[level];
    if (w.basis === "added to bodyweight") return n > 0 ? `BW + ${n} kg` : "Bodyweight";
    return `${n} kg`;
  }
  const setLine = s => `${s.sets} × ${s.reps}${s.kg ? ` · ${s.kg}` : ""}`;
  function planDay(day, level, goal) {
    return day.muscles.map(m => ({
      muscle: m,
      list: exercises.filter(e => e.muscle === m).slice(0, COUNTS[day.muscles.length][level]).map(ex => ({ ex, ...scheme(ex, level, goal) }))
    }));
  }
  function minutes(groups) {
    let s = 0;
    groups.forEach(g => g.list.forEach(r => { s += r.sets * (45 + r.rest); }));
    return Math.round(s / 300) * 5 + 10; // + warm-up
  }
  const fmtRest = s => (s >= 120 ? `${s / 60} min` : `${s} s`);
  const chip = (m, extra = "") => `<span class="chip" style="--c:${muscles[m].color}">${esc(muscles[m].name)}${extra}</span>`;
  const muscleSpec = ex => ({ anim: ex.anim, color: muscles[ex.muscle].color, muscle: ex.muscle });

  // ---------- hero ----------
  function renderHero() {
    const stats = [
      [Object.keys(muscles).length, "muscle groups"],
      [exercises.length, "exercises"],
      [equipment.length, "pieces of equipment"],
      [week.filter(d => d.muscles.length).length, "training days / week"]
    ];
    $("#heroStats").innerHTML = stats.map(([n, l]) => `<div><dt>${n}</dt><dd>${l}</dd></div>`).join("");
    const picks = ["bench-press", "deadlift", "back-squat", "ohp", "barbell-curl", "pull-up"].map(id => exById[id]);
    Anim.attach($("#heroCanvas"), muscleSpec(picks[0]), { cycle: picks.map(muscleSpec) });
    const cap = $("#heroCaption");
    const tick = () => { const ex = picks[Anim.cycleIndex($("#heroCanvas"))]; cap.textContent = ex.name; cap.style.setProperty("--c", muscles[ex.muscle].color); };
    tick(); setInterval(tick, 400);
  }

  // ---------- schedule ----------
  function dayCard(d, level, goal, isToday) {
    if (!d.muscles.length) {
      return `<article class="day-card rest${isToday ? " today" : ""}">
        <header><span class="day-name">${d.day}</span>${isToday ? '<span class="badge">Today</span>' : ""}</header>
        <h3>${esc(d.title)}</h3>
        <ul class="rest-list"><li>20–30 min light walking or cycling</li><li>10 min stretching / mobility</li><li>Sleep, hydrate, eat protein</li></ul>
      </article>`;
    }
    const groups = planDay(d, level, goal);
    const total = groups.reduce((n, g) => n + g.list.length, 0);
    return `<article class="day-card${isToday ? " today" : ""}">
      <header><span class="day-name">${d.day}</span>${isToday ? '<span class="badge">Today</span>' : ""}</header>
      <h3>${esc(d.title)}</h3>
      <div class="day-muscles">${groups.map(g => chip(g.muscle, ` · ${g.list.length}`)).join("")}</div>
      ${groups.map(g => `
        ${groups.length > 1 ? `<p class="group-label" style="--c:${muscles[g.muscle].color}">${esc(muscles[g.muscle].name)}</p>` : ""}
        <ol class="day-list">${g.list.map(r => `
          <li><button data-ex="${r.ex.id}"><span>${esc(r.ex.name)}</span><small>${setLine(r)}</small></button></li>`).join("")}
        </ol>`).join("")}
      <footer>${total} exercises · ~${minutes(groups)} min</footer>
    </article>`;
  }

  function renderWeek() {
    const today = new Date().getDay();
    $("#levelTabs").innerHTML = Object.entries(LEVELS).map(([k, v]) =>
      `<button role="radio" aria-checked="${k === state.level}" data-level="${k}">${v}</button>`).join("");
    const c1 = COUNTS[1][state.level], c2 = COUNTS[2][state.level];
    $("#countLegend").innerHTML = `<strong>${LEVELS[state.level]}:</strong> ${c1} exercises on single-muscle days · ${c2} exercises per muscle on two-muscle days · every set is ${REP_MIN}–${REP_MAX} reps · rest for ${GOALS[state.goal].toLowerCase()}`;
    $("#weekGrid").innerHTML = week.map(d => dayCard(d, state.level, state.goal, d.dow === today)).join("");
  }

  // ---------- exercise library ----------
  function renderFilters() {
    const all = [["all", "All muscles", "#ff5a1f"], ...Object.entries(muscles).map(([k, m]) => [k, m.name, m.color])];
    $("#muscleFilters").innerHTML = all.map(([k, n, c]) => {
      const count = k === "all" ? exercises.length : exercises.filter(e => e.muscle === k).length;
      return `<button class="filter" style="--c:${c}" aria-pressed="${state.muscle === k}" data-muscle="${k}">${esc(n)} <small>${count}</small></button>`;
    }).join("");
  }

  function renderExercises() {
    const q = state.q.trim().toLowerCase();
    const list = exercises.filter(e =>
      (state.muscle === "all" || e.muscle === state.muscle) &&
      (state.type === "all" || e.type === state.type) &&
      (!q || `${e.name} ${e.form} ${muscles[e.muscle].name} ${e.secondary}`.toLowerCase().includes(q)));
    $("#exerciseGrid").innerHTML = list.map(e => `
      <article class="ex-card" style="--c:${muscles[e.muscle].color}">
        <button class="ex-thumb" data-ex="${e.id}" aria-label="Open ${esc(e.name)}">
          <canvas data-anim="${e.id}"></canvas><span class="play">▶ Video</span>
        </button>
        <div class="ex-body">
          ${chip(e.muscle)}
          <h3><button data-ex="${e.id}">${esc(e.name)}</button></h3>
          <div class="tags"><span class="tag sr">${setLine(scheme(e, state.level, state.goal))}</span><span class="tag type-${e.type.toLowerCase()}">${e.type}</span><span class="tag">${esc(e.form)}</span></div>
          <p class="muted small">${e.equipment.map(q => esc(eqById[q].name)).join(" · ")}</p>
        </div>
      </article>`).join("");
    $("#exEmpty").hidden = list.length > 0;
    $$("#exerciseGrid canvas").forEach(c => Anim.attach(c, muscleSpec(exById[c.dataset.anim])));
  }

  // ---------- exercises by body part ----------
  function renderRegions() {
    $("#regions").innerHTML = ["Upper body", "Lower body"].map(region => {
      const ms = Object.entries(muscles).filter(([, m]) => m.region === region);
      const total = ms.reduce((n, [k]) => n + exercises.filter(e => e.muscle === k).length, 0);
      return `<div class="region">
        <h3>${region} <span class="muted">${ms.length} muscles · ${total} exercises</span></h3>
        <div class="region-grid">${ms.map(([k, m]) => `
          <div class="card part" style="--c:${m.color}">
            <h4>${esc(m.name)}</h4>
            <ol>${exercises.filter(e => e.muscle === k).map(e => `
              <li><button class="link" data-ex="${e.id}">${esc(e.name)}</button><span class="sr-inline">${setLine(scheme(e, state.level, state.goal))}</span></li>`).join("")}
            </ol>
          </div>`).join("")}
        </div>
      </div>`;
    }).join("");
  }

  // ---------- equipment ----------
  const ICONS = {
    "Free weights": '<path d="M6 20h4M30 20h4M10 13v14M30 13v14M14 16v8M26 16v8M14 20h12" />',
    "Benches & racks": '<path d="M6 18h28M10 18v10M30 18v10M8 8v24M32 8v24M8 10h24" />',
    "Cable machines": '<path d="M10 6v28M30 6v28M10 6h20M20 6v14M16 24h8M20 20v4M8 34h24" />',
    "Machines": '<path d="M8 32h24M12 32V14l10-6M12 20h12M24 20v-6M28 14h4v12h-4" />'
  };
  function renderEquipment() {
    const cats = ["All", ...new Set(equipment.map(e => e.cat))];
    $("#eqTabs").innerHTML = cats.map(c => `<button role="radio" aria-checked="${c === state.eqCat}" data-eqcat="${esc(c)}">${esc(c)}</button>`).join("");
    $("#equipmentGrid").innerHTML = equipment.filter(e => state.eqCat === "All" || e.cat === state.eqCat).map(e => {
      const used = exercises.filter(x => x.equipment.includes(e.id));
      const ms = [...new Set(used.map(x => x.muscle))];
      return `<article class="card eq-card">
        <div class="eq-top">
          <svg class="eq-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[e.cat]}</svg>
          <div><h3>${esc(e.name)}</h3><p class="muted small">${esc(e.cat)}</p></div>
        </div>
        <p>${esc(e.desc)}</p>
        <div class="day-muscles">${ms.map(m => chip(m)).join("")}</div>
        <p class="used-label">Used for</p>
        <div class="used">${used.map(x => `<button class="link" data-ex="${x.id}">${esc(x.name)}</button>`).join("")}</div>
      </article>`;
    }).join("");
  }

  // ---------- training guide ----------
  function renderGuide() {
    const count = f => exercises.filter(f).length;
    const types = [
      ["Compound", "Multi-joint movements that move two or more joints and train several muscles at once — e.g. bench press, squat, deadlift, rows. They let you lift the most weight, so they come first in every workout."],
      ["Isolation", "Single-joint movements that focus on one muscle — e.g. curls, leg extensions, lateral raises. Use them after compounds to finish a muscle, fix weak points and shape the physique."]
    ];
    $("#typeCards").innerHTML = types.map(([t, d]) => `
      <div class="card guide-card"><div class="guide-top"><h4>${t}</h4><span class="tag type-${t.toLowerCase()}">${count(e => e.type === t)} exercises</span></div>
      <p>${d}</p><p class="muted small">Examples: ${exercises.filter(e => e.type === t).slice(0, 4).map(e => e.name).join(", ")}</p></div>`).join("");

    const forms = [
      ["Free weights", e => e.form.startsWith("Free weight"), "Barbells, dumbbells and EZ bars. They require balance and stabiliser muscles, give the most freedom of movement and build real-world strength."],
      ["Machines", e => /Machine/.test(e.form), "Guided paths with a fixed range of motion. Safe for beginners, easy to learn, and great for pushing a muscle close to failure without a spotter."],
      ["Cables", e => /Cable/.test(e.form), "Pulleys keep constant tension on the muscle through the entire rep, and the angle can be adjusted to hit a muscle from any direction."],
      ["Bodyweight", e => e.form === "Bodyweight", "Your own body is the resistance — pull-ups, dips, hyperextensions. Add a weight belt or plate once the reps get easy."]
    ];
    $("#kgExamples").innerHTML = ["bench-press", "back-squat", "deadlift", "lat-pulldown", "lateral-raise", "barbell-curl", "pull-up"]
      .map(id => exById[id]).filter(e => e && e.weights).map(e => `<tr><td><button class="link" data-ex="${e.id}">${esc(e.name)}</button></td>
        ${Object.keys(LEVELS).map(l => `<td>${kgText(e, l)}</td>`).join("")}<td class="muted">${esc(e.weights.basis)}</td></tr>`).join("");

    $("#formCards").innerHTML = forms.map(([t, f, d]) => `
      <div class="card guide-card"><div class="guide-top"><h4>${t}</h4><span class="tag">${count(f)} exercises</span></div><p>${d}</p></div>`).join("");
  }

  // ---------- modal ----------
  const modal = $("#modal"), modalBody = $("#modalBody");
  let lastFocus = null;
  function openModal(html, wide) {
    lastFocus = document.activeElement;
    modalBody.innerHTML = html;
    modal.hidden = false;
    modal.classList.toggle("wide", !!wide);
    document.body.classList.add("no-scroll");
    $(".modal-panel", modal).scrollTop = 0;
    $(".modal-close", modal).focus();
  }
  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
    document.body.classList.remove("no-scroll");
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }

  const LENGTHS = [8, 15, 30];
  state.secs = LENGTHS.includes(store.get("ih.secs", 15)) ? store.get("ih.secs", 15) : 15;
  const partOf = e => `${muscles[e.muscle].region} · ${muscles[e.muscle].name}`;

  // Anime-style prompt for AI video tools. The site overlays the exercise name itself,
  // so the prompt asks for no on-screen text (AI video models garble lettering).
  function aiPrompt(e, secs = state.secs) {
    if (e.prompt && secs === e.secs) return e.prompt; // prompt stored (and editable) in Supabase
    const eq = e.equipment.map(q => eqById[q].name).join(" and ");
    const reps = Math.max(2, Math.floor(secs / 3.5));
    return `Studio-quality anime film, Japanese 2D animation: crisp clean line art, cel shading with soft gradients, rim lighting, rich vibrant colors, cinematic composition. ` +
      `A muscular anime athlete with spiky golden hair, shirtless with well-defined muscles, dark training shorts and white sneakers, performs the ${e.name} (${partOf(e)}) ` +
      `in a premium modern bodybuilding gym with moody spotlights and a softly blurred background (shallow depth of field), using the ${eq}. ` +
      `${secs}-second seamless loop at 24 fps, locked-off side-view camera at hip height, subject centered, full body always in frame. ` +
      `Correct technique: ${e.steps.join(" ")} ` +
      `${reps} smooth repetitions with a controlled tempo (1 second lifting, a short pause at the top, 2 seconds lowering), ` +
      `the working muscle glowing softly at peak contraction, light anime speed lines on each lift, a focused determined expression. ` +
      `Accurate anatomy and joint angles so the form is clear. No on-screen text, no logos, no watermark, no music.`;
  }

  function downloadPrompts() {
    const lines = [`IronHouse Gym — anime AI video prompts (${state.secs} s each)`, `Save each video as videos/<id>.mp4`, ""];
    for (const region of ["Upper body", "Lower body"]) {
      lines.push("=".repeat(60), region.toUpperCase(), "=".repeat(60));
      Object.entries(muscles).filter(([, m]) => m.region === region).forEach(([k, m]) => {
        lines.push("", `## ${m.name}`);
        exercises.filter(e => e.muscle === k).forEach((e, i) => lines.push("", `${i + 1}. ${e.name}  →  videos/${e.id}.mp4`, aiPrompt(e)));
      });
      lines.push("");
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    a.download = "anime-video-prompts.txt";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function openExercise(id) {
    const e = exById[id];
    if (!e) return;
    const m = muscles[e.muscle];
    openModal(`
      <div class="ex-modal" style="--c:${m.color}">
        <div class="ex-media">
          <div class="video-box">
            <canvas class="ex-canvas" role="img" aria-label="Animated demonstration of ${esc(e.name)}"></canvas>
            <video class="ex-video" muted loop playsinline autoplay controls hidden></video>
            <span class="video-tag">Anime demo</span>
            <div class="video-title"><small>${esc(partOf(e))}</small><strong>${esc(e.name)}</strong></div>
          </div>
          <div class="player-bar">
            <button class="btn btn-sm btn-ghost" data-play aria-label="Pause">❚❚ Pause</button>
            <div class="segmented" role="radiogroup" aria-label="Playback speed">
              <button role="radio" aria-checked="false" data-speed="0.5">Slow-mo</button>
              <button role="radio" aria-checked="true" data-speed="1">Normal</button>
            </div>
            <span class="muted small">Tempo: 1 s lift · 2 s lower</span>
          </div>
          <p class="video-note">Built-in anime demo. Generate the AI video with the prompt below and save it as <code>videos/${e.id}.mp4</code> — it will play here automatically, with the exercise name on top.</p>
          <div class="prompt-box">
            <div class="prompt-head"><strong>Anime AI video prompt</strong><button class="btn btn-sm" data-copy>Copy prompt</button></div>
            <div class="segmented len-tabs" role="radiogroup" aria-label="Video length">${LENGTHS.map(s =>
              `<button role="radio" aria-checked="${s === state.secs}" data-secs="${s}">${s} s</button>`).join("")}</div>
            <p class="prompt-text">${esc(aiPrompt(e))}</p>
          </div>
        </div>
        <div class="ex-info">
          ${chip(e.muscle)}
          <h2 id="modalTitle">${esc(e.name)}</h2>
          <div class="tags"><span class="tag type-${e.type.toLowerCase()}">${e.type}</span><span class="tag">${esc(e.form)}</span><span class="tag">${esc(e.level)}</span></div>
          <dl class="facts">
            <div><dt>Secondary muscles</dt><dd>${esc(e.secondary)}</dd></div>
            <div><dt>Equipment</dt><dd>${e.equipment.map(q => esc(eqById[q].name)).join(", ")}</dd></div>
            <div><dt>Your sets</dt><dd>${(s => `${setLine(s)}, rest ${fmtRest(s.rest)}`)(scheme(e, state.level, state.goal))} <span class="muted">(${LEVELS[state.level]}, ${GOALS[state.goal]})</span></dd></div>
            ${e.weights ? `<div><dt>Starting weight</dt><dd>
              <div class="kg-levels">${Object.keys(LEVELS).map(l => `<span class="${l === state.level ? "on" : ""}"><small>${LEVELS[l]}</small><b>${kgText(e, l)}</b></span>`).join("")}</div>
              <span class="muted small">${esc(e.weights.basis)} · for ${e.repsMin ?? 10}–${e.repsMax ?? 14} reps</span></dd></div>` : ""}
          </dl>
          <h3>How to perform</h3>
          <ol class="steps">${e.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
          <h3>Coaching tips</h3>
          <ul class="tips good">${e.tips.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
          <h3>Common mistakes</h3>
          <ul class="tips bad">${e.mistakes.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
        </div>
      </div>`, true);

    const canvas = $(".ex-canvas", modalBody), video = $(".ex-video", modalBody);
    Anim.attach(canvas, muscleSpec(e), { always: true, hud: true });
    const play = $("[data-play]", modalBody);
    play.addEventListener("click", () => {
      const it = Anim.control(canvas, {});
      Anim.control(canvas, { paused: !it.paused });
      play.textContent = it.paused ? "▶ Play" : "❚❚ Pause";
      play.setAttribute("aria-label", it.paused ? "Play" : "Pause");
    });
    $$("[data-speed]", modalBody).forEach(b => b.addEventListener("click", () => {
      Anim.control(canvas, { speed: +b.dataset.speed });
      $$("[data-speed]", modalBody).forEach(x => x.setAttribute("aria-checked", x === b));
    }));
    video.addEventListener("loadeddata", () => {
      video.hidden = false; canvas.hidden = true;
      $(".player-bar", modalBody).hidden = true;
      $(".video-tag", modalBody).textContent = "AI anime video";
      $(".video-note", modalBody).textContent = `AI video loaded from ${e.video || `videos/${e.id}.mp4`}`;
    }, { once: true });
    video.src = e.video || `videos/${e.id}.mp4`;
    $("[data-copy]", modalBody).addEventListener("click", ev => copyText(aiPrompt(e), ev.currentTarget));
    $$("[data-secs]", modalBody).forEach(b => b.addEventListener("click", () => {
      state.secs = +b.dataset.secs; store.set("ih.secs", state.secs);
      $$("[data-secs]", modalBody).forEach(x => x.setAttribute("aria-checked", x === b));
      $(".prompt-text", modalBody).textContent = aiPrompt(e);
    }));
  }

  function copyText(text, btn) {
    const done = () => { const t = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(() => (btn.textContent = t), 1500); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch { /* ignore */ }
      ta.remove();
    }
  }

  // ---------- members ----------
  let members = [];
  const fail = err => alert("Something went wrong: " + (err && err.message ? err.message : err));
  async function reloadMembers() {
    try { members = await DB.listMembers(); } catch (err) { members = []; fail(err); }
    renderMembers();
  }

  // Which members panel to show: offline → local list; online → staff sign-in gate.
  async function refreshAccess() {
    const show = id => ["staffLogin", "notStaff", "membersApp"].forEach(x => { $("#" + x).hidden = x !== id; });
    const bar = $("#staffBar");
    if (!DB.remote) { bar.hidden = true; show("membersApp"); return reloadMembers(); }
    $("#formNote").textContent = "Saved to the gym database (Supabase). Visible to staff only.";
    const session = await DB.session();
    if (!session) { bar.hidden = true; members = []; return show("staffLogin"); }
    bar.hidden = false;
    bar.innerHTML = `<span class="muted small">Signed in as <strong>${esc(session.user.email)}</strong></span><button class="btn btn-sm btn-ghost" data-signout>Sign out</button>`;
    let staff = false;
    try { staff = await DB.isStaff(); } catch (err) { fail(err); }
    if (!staff) return show("notStaff");
    show("membersApp");
    reloadMembers();
  }

  function addMonths(iso, n) {
    const d = new Date(iso + "T00:00:00");
    const day = d.getDate();
    d.setMonth(d.getMonth() + n);
    if (d.getDate() < day) d.setDate(0); // e.g. Jan 31 + 1 month → Feb 28
    return d;
  }
  const fmtDate = d => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  function status(m) {
    const end = addMonths(m.start, +m.months);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((end - today) / 86400000);
    if (new Date(m.start + "T00:00:00") > today) return { cls: "pending", text: "Starts " + fmtDate(new Date(m.start + "T00:00:00")), end };
    if (days < 0) return { cls: "expired", text: "Expired", end };
    if (days <= 7) return { cls: "soon", text: `Expires in ${days} day${days === 1 ? "" : "s"}`, end };
    return { cls: "active", text: "Active", end };
  }

  function renderMembers() {
    const q = $("#memberSearch").value.trim().toLowerCase();
    const list = members.filter(m => !q || `${m.name} ${m.phone}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    $("#memberCount").textContent = `${members.length} member${members.length === 1 ? "" : "s"}`;
    $("#memberList").innerHTML = list.length ? list.map(m => {
      const s = status(m);
      return `<article class="card member">
        <div class="member-main">
          <div class="avatar">${esc(m.name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase())}</div>
          <div><h4>${esc(m.name)}</h4><p class="muted small">${esc(m.phone || "No phone")} · ${m.months}-month plan · until ${fmtDate(s.end)}</p></div>
          <span class="status ${s.cls}">${s.text}</span>
        </div>
        <div class="member-meta"><span class="tag">${LEVELS[m.level]}</span><span class="tag">${GOALS[m.goal]}</span></div>
        <div class="member-actions">
          <button class="btn btn-sm" data-member="${m.id}">View schedule</button>
          <button class="btn btn-sm btn-ghost" data-renew="${m.id}">Renew</button>
          <button class="btn btn-sm btn-danger" data-remove="${m.id}">Remove</button>
        </div>
      </article>`;
    }).join("") : `<div class="card empty-card"><p>${members.length ? "No members match your search." : "No members yet. Add your first member with the form."}</p></div>`;
  }

  function programHTML(level, goal) {
    return week.map(d => {
      if (!d.muscles.length) return `<div class="prog-day rest"><h4>${d.day} — Rest &amp; recovery</h4></div>`;
      const groups = planDay(d, level, goal);
      return `<div class="prog-day">
        <h4>${d.day} — ${esc(d.title)} <span class="muted">~${minutes(groups)} min</span></h4>
        <table class="table compact"><thead><tr><th>#</th><th>Exercise</th><th>Muscle</th><th>Sets</th><th>Reps</th><th>Weight</th><th>Rest</th></tr></thead><tbody>
        ${groups.flatMap(g => g.list).map((r, i) => `<tr><td>${i + 1}</td><td><button class="link" data-ex="${r.ex.id}">${esc(r.ex.name)}</button></td>
          <td><span class="dot" style="--c:${muscles[r.ex.muscle].color}"></span>${esc(muscles[r.ex.muscle].name)}</td><td>${r.sets}</td><td>${r.reps}</td><td><b>${r.kg}</b> <span class="muted small">${esc(r.ex.weights ? r.ex.weights.basis : "")}</span></td><td>${fmtRest(r.rest)}</td></tr>`).join("")}
        </tbody></table></div>`;
    }).join("");
  }

  function openMember(id) {
    const m = members.find(x => x.id === id);
    if (!m) return;
    const s = status(m);
    openModal(`<div class="member-sheet" id="sheet">
      <div class="sheet-head">
        <div><p class="eyebrow">Personal schedule</p><h2 id="modalTitle">${esc(m.name)}</h2>
        <p class="muted">${LEVELS[m.level]} · ${GOALS[m.goal]} · ${m.months}-month plan (${fmtDate(new Date(m.start + "T00:00:00"))} – ${fmtDate(s.end)}) · <span class="status ${s.cls}">${s.text}</span></p></div>
        <button class="btn btn-sm no-print" data-print-sheet>Print schedule</button>
      </div>
      ${programHTML(m.level, m.goal)}
    </div>`, true);
  }

  function printHTML(html) {
    $("#printArea").innerHTML = `<div class="print-brand">IronHouse Bodybuilding Gym</div>${html}`;
    document.body.classList.add("printing");
    window.print();
  }
  window.addEventListener("afterprint", () => { document.body.classList.remove("printing"); $("#printArea").innerHTML = ""; });

  // ---------- events ----------
  function bind() {
    document.addEventListener("click", ev => {
      const t = ev.target.closest("button, a");
      if (!t) return;
      if (t.dataset.close !== undefined || ev.target.dataset.close !== undefined) return closeModal();
      if (t.dataset.ex) return openExercise(t.dataset.ex);
      if (t.dataset.level) { state.level = t.dataset.level; store.set("ih.level", state.level); renderWeek(); renderRegions(); return renderExercises(); }
      if (t.dataset.muscle) { state.muscle = t.dataset.muscle; renderFilters(); return renderExercises(); }
      if (t.dataset.eqcat) { state.eqCat = t.dataset.eqcat; return renderEquipment(); }
      if (t.dataset.member) return openMember(t.dataset.member);
      if (t.dataset.renew) {
        const m = members.find(x => x.id === t.dataset.renew);
        const s = status(m);
        const from = s.cls === "expired" ? new Date() : s.end;
        DB.updateMember(m.id, { start: localISO(from) }).then(reloadMembers, fail);
        return;
      }
      if (t.dataset.remove) {
        const m = members.find(x => x.id === t.dataset.remove);
        if (m && confirm(`Remove ${m.name}?`)) DB.removeMember(m.id).then(reloadMembers, fail);
        return;
      }
      if (t.dataset.signout !== undefined) { DB.signOut().then(refreshAccess); return; }
      if (t.dataset.printSheet !== undefined) return printHTML($("#sheet").outerHTML);
      if (t.id === "downloadPrompts") return downloadPrompts();
      if (t.id === "printWeek") return printHTML(`<h2>Weekly schedule — ${LEVELS[state.level]}, ${GOALS[state.goal]}</h2>${programHTML(state.level, state.goal)}`);
      if (t.classList.contains("nav-toggle")) {
        const open = document.body.classList.toggle("nav-open");
        t.setAttribute("aria-expanded", open);
      }
      if (t.closest(".nav-links")) document.body.classList.remove("nav-open");
    });
    modal.addEventListener("click", ev => { if (ev.target.classList.contains("modal-backdrop")) closeModal(); });
    document.addEventListener("keydown", ev => { if (ev.key === "Escape" && !modal.hidden) closeModal(); });

    const goalOpts = Object.entries(GOALS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    const levelOpts = Object.entries(LEVELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    $("#goalSelect").innerHTML = goalOpts; $("#goalSelect").value = state.goal;
    $("#goalSelect").addEventListener("change", e => { state.goal = e.target.value; store.set("ih.goal", state.goal); renderWeek(); renderRegions(); renderExercises(); });
    $("#typeSelect").addEventListener("change", e => { state.type = e.target.value; renderExercises(); });
    $("#exSearch").addEventListener("input", e => { state.q = e.target.value; renderExercises(); });
    $("#memberSearch").addEventListener("input", renderMembers);

    const form = $("#memberForm");
    form.goal.innerHTML = goalOpts; form.level.innerHTML = levelOpts; form.level.value = "beginner";
    form.start.value = localISO(new Date());
    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      const f = new FormData(form);
      const m = {
        name: f.get("name").trim(), phone: f.get("phone").trim(), months: +f.get("months"),
        start: f.get("start"), level: f.get("level"), goal: f.get("goal")
      };
      if (!m.name) return;
      const btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const saved = await DB.addMember(m);
        form.name.value = ""; form.phone.value = "";
        await reloadMembers(); openMember(saved.id);
      } catch (err) { fail(err); } finally { btn.disabled = false; }
    });

    const login = $("#staffLogin");
    login.addEventListener("submit", async ev => {
      ev.preventDefault();
      const err = $("#loginError"), btn = login.querySelector("[type=submit]");
      err.hidden = true; btn.disabled = true;
      try { await DB.signIn(login.email.value.trim(), login.password.value); login.password.value = ""; await refreshAccess(); }
      catch (e) { err.textContent = e.message; err.hidden = false; }
      finally { btn.disabled = false; }
    });
  }

  function localISO(d) { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); }

  function renderCatalog() { renderWeek(); renderRegions(); renderFilters(); renderExercises(); renderEquipment(); renderGuide(); }

  $("#year").textContent = new Date().getFullYear();
  renderHero(); renderCatalog(); bind(); refreshAccess();
  DB.onAuth(() => setTimeout(refreshAccess, 0));
  DB.loadCatalog().then(g => {
    if (!g) return;
    useCatalog(g);
    if (state.muscle !== "all" && !muscles[state.muscle]) state.muscle = "all";
    renderCatalog();
    document.documentElement.dataset.source = "supabase";
  }).catch(err => console.warn("Supabase catalog unavailable, using bundled data.", err));
})();
