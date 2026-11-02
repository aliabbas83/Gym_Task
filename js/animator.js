// Anime-style animated exercise demos drawn on <canvas>.
// A shaded, muscular character performs each movement on a lit gym stage with a real
// lifting tempo. Poses come from poses.js. Used until an AI video exists at videos/<id>.mp4.

(function () {
  const { L, P, lerp, solve, upv, add } = window.Poses;
  const W = 260, H = 236, OY = 26, GROUND = 190;

  // One rep: pause at the stretch, 1 s lift, pause at the squeeze, 2 s lower.
  const T_HOLD0 = 450, T_CON = 1000, T_HOLD1 = 450, T_ECC = 2000;
  const PERIOD = T_HOLD0 + T_CON + T_HOLD1 + T_ECC;
  const REPS = 4;
  const PHASES = ["STRETCH", "LIFT · 1 s", "SQUEEZE", "LOWER · 2 s"];

  const C = {
    ink: "#0a0b10",
    skin: ["#f6d2b1", "#d99f78"], skinBack: ["#c78f6c", "#9f6a4c"],
    hair: ["#ffd23f", "#e2930f"],
    shorts: ["#252c3d", "#151a26"], shortsBack: ["#1a1f2c", "#10141c"], stripe: "#ff5a1f",
    shoe: ["#f4f6fa", "#b4bccb"], shoeBack: ["#b9c0cc", "#8c93a2"],
    pad: ["#a32437", "#68131f"], metal: "#b9c2d2", metalDark: "#59627a"
  };
  const LIGHT = [-0.55, -0.83]; // light comes from the top-left

  // Which part glows in the muscle colour. side: +1 front of a limb, -1 back (torso: -1 = chest side).
  const HL = {
    chest: { torso: -1 }, back: { torso: 1 }, shoulders: { delt: 1 },
    triceps: { ua: -1 }, arms: { ua: 1, fa: 1 }, quads: { th: 1 }, hamstrings: { th: -1 }
  };

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (v, s) => [v[0] * s, v[1] * s];
  const unit = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * x);

  // ---------- drawing primitives ----------
  function seg(ctx, a, b, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }

  // Tapered capsule from a (radius r1) to b (radius r2) — the basic limb shape.
  function capsule(ctx, a, b, r1, r2) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    ctx.beginPath();
    if (d < 0.01) { ctx.arc(a[0], a[1], Math.max(r1, r2), 0, Math.PI * 2); return; }
    const ang = Math.atan2(dy, dx), s = Math.asin(Math.max(-1, Math.min(1, (r1 - r2) / d)));
    ctx.arc(a[0], a[1], r1, ang + Math.PI / 2 + s, ang - Math.PI / 2 - s);
    ctx.arc(b[0], b[1], r2, ang - Math.PI / 2 - s, ang + Math.PI / 2 + s);
    ctx.closePath();
  }
  const circle = (ctx, p, r) => { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); };

  // Cel shading: shadow tone, then the lit tone shifted toward the light, then an ink outline.
  function shade(ctx, path, shift, tone, outline, inner) {
    path(); ctx.fillStyle = tone[1]; ctx.fill();
    ctx.save(); path(); ctx.clip();
    ctx.translate(LIGHT[0] * shift, LIGHT[1] * shift); path(); ctx.fillStyle = tone[0]; ctx.fill();
    ctx.translate(-LIGHT[0] * shift, -LIGHT[1] * shift);
    if (inner) inner();
    ctx.restore();
    if (outline) { path(); ctx.strokeStyle = C.ink; ctx.lineWidth = outline; ctx.lineJoin = "round"; ctx.stroke(); }
  }

  // Coloured muscle belly on one side of a limb, with a soft highlight.
  function belly(ctx, a, b, r1, r2, side, color, alpha) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, r = (r1 + r2) / 2;
    ctx.save();
    ctx.translate((a[0] + b[0]) / 2 + uy * side * r * 0.5, (a[1] + b[1]) / 2 - ux * side * r * 0.5);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.beginPath(); ctx.ellipse(0, 0, d * 0.42, r * 0.85, 0, 0, Math.PI * 2);
    ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-d * 0.1, -r * 0.15 * side, d * 0.18, r * 0.22, 0, 0, Math.PI * 2);
    ctx.globalAlpha = alpha * 0.45; ctx.fillStyle = "#fff"; ctx.fill();
    ctx.restore();
  }

  function limb(ctx, a, b, r1, r2, tone, hl) {
    const path = () => capsule(ctx, a, b, r1, r2);
    if (hl && hl.glow > 0) {
      ctx.save(); ctx.shadowColor = hl.color; ctx.shadowBlur = hl.glow; path(); ctx.fillStyle = hl.color; ctx.fill(); ctx.restore();
    }
    shade(ctx, path, Math.min(r1, r2) * 0.6, tone, 1.5, () => {
      if (hl) belly(ctx, a, b, r1, r2, hl.side, hl.color, hl.alpha);
      const u = unit(sub(b, a)); let n = [u[1], -u[0]];
      if (n[0] * LIGHT[0] + n[1] * LIGHT[1] < 0) n = mul(n, -1);
      ctx.globalAlpha = 0.3;
      seg(ctx, add(a, mul(n, r1 * 0.55)), add(b, mul(n, r2 * 0.55)), 1.1, "#fff");
      ctx.globalAlpha = 1;
    });
  }

  function ball(ctx, p, r, tone, hl) {
    const path = () => circle(ctx, p, r);
    if (hl && hl.glow > 0) { ctx.save(); ctx.shadowColor = hl.color; ctx.shadowBlur = hl.glow; path(); ctx.fillStyle = hl.color; ctx.fill(); ctx.restore(); }
    shade(ctx, path, r * 0.5, hl ? [hl.color, mix(hl.color)] : tone, 1.4, hl ? () => {
      ctx.globalAlpha = 0.45; circle(ctx, add(p, mul(LIGHT, r * 0.4)), r * 0.35); ctx.fillStyle = "#fff"; ctx.fill(); ctx.globalAlpha = 1;
    } : null);
  }
  // Darker version of a hex colour for the shadow side of a highlighted muscle.
  function mix(hex) {
    const n = parseInt(hex.slice(1), 16), f = 0.62;
    return `rgb(${(n >> 16 & 255) * f | 0},${(n >> 8 & 255) * f | 0},${(n & 255) * f | 0})`;
  }

  // ---------- character ----------
  function shoe(ctx, knee, ank, tone) {
    const f = unit([ank[1] - knee[1], -(ank[0] - knee[0])]); // perpendicular to the shin, toward the toes
    const heel = add(ank, mul(f, -2.5)), toe = add(ank, mul(f, 9));
    shade(ctx, () => capsule(ctx, heel, toe, 3.9, 3.1), 1.6, tone, 1.4, () => {
      seg(ctx, add(ank, mul(f, 1)), add(ank, mul(f, 5)), 1.6, C.stripe);
    });
  }

  function shorts(ctx, hip, knee, tone) {
    const m = add(hip, mul(sub(knee, hip), 0.55));
    shade(ctx, () => capsule(ctx, hip, m, 9.2, 7.4), 3, tone, 1.5, () => seg(ctx, hip, m, 1.4, C.stripe));
  }

  // Spiky two-tone hair over the top/back of the head. u = unit "up" of the head.
  function hair(ctx, h, u) {
    const R = L.head, up = Math.atan2(u[1], u[0]), pts = [];
    for (let i = 0; i <= 8; i++) {
      const a = up + (45 - i * 21) * Math.PI / 180, r = i % 2 ? R + 1 : R + 8.5;
      pts.push([h[0] + Math.cos(a) * r, h[1] + Math.sin(a) * r]);
    }
    for (let i = 8; i >= 0; i--) {
      const a = up + (45 - i * 21) * Math.PI / 180;
      pts.push([h[0] + Math.cos(a) * (R - 4), h[1] + Math.sin(a) * (R - 4)]);
    }
    const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
    shade(ctx, path, 2.5, C.hair, 1.4);
  }

  function face(ctx, h, u, f) {
    const e = add(h, add(mul(f, 4.8), mul(u, 0.8)));
    const ang = Math.atan2(u[1], u[0]) + Math.PI / 2;
    ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(0, 0, 1.5, 2.5, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(-0.5, -0.9, 0.7, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.restore();
    seg(ctx, add(e, add(mul(u, 3.6), mul(f, -1.8))), add(e, add(mul(u, 3.1), mul(f, 1.8))), 1.2, C.ink); // focused brow
    const m = add(h, add(mul(f, 6.6), mul(u, -4.2)));
    seg(ctx, m, add(m, mul(f, -2)), 1, C.ink);
  }

  function head(ctx, h, u) {
    const f = [-u[1], u[0]];
    shade(ctx, () => circle(ctx, h, L.head), L.head * 0.45, C.skin, 1.5, () => {
      circle(ctx, add(h, mul(f, -1.8)), 2.6); ctx.fillStyle = C.skin[1]; ctx.fill(); // ear
    });
    hair(ctx, h, u);
    face(ctx, h, u, f);
  }

  function drawFigure(ctx, j, spec, fx) {
    const map = HL[spec.muscle] || {};
    const hl = part => (map[part] !== undefined ? { side: map[part], color: spec.color, alpha: fx.alpha, glow: fx.glow } : null);
    const off = [-3, -1.6];

    // far-side limbs (darker, slightly offset) give the body depth
    const bHip = j.knee2 ? j.hip : add(j.hip, off);
    const bKnee = j.knee2 || add(j.knee, off), bAnk = j.ank2 || add(j.ank, off);
    shoe(ctx, bKnee, bAnk, C.shoeBack);
    limb(ctx, bKnee, bAnk, 5, 3.3, C.skinBack);
    limb(ctx, bHip, bKnee, 7.6, 5, C.skinBack);
    shorts(ctx, bHip, bKnee, C.shortsBack);
    const bSho = add(j.sho, off), bElb = add(j.elb, off), bHand = add(j.hand, off);
    limb(ctx, bElb, bHand, 4.1, 3, C.skinBack);
    limb(ctx, bSho, bElb, 5.6, 4.2, C.skinBack);
    ball(ctx, bHand, 3.4, C.skinBack);

    // near leg
    shoe(ctx, j.knee, j.ank, C.shoe);
    limb(ctx, j.knee, j.ank, 5.3, 3.4, C.skin);
    limb(ctx, j.hip, j.knee, 8, 5.3, C.skin, hl("th"));
    shorts(ctx, j.hip, j.knee, C.shorts);

    // torso, waistband, neck, head
    limb(ctx, j.hip, j.sho, 8.6, 11.2, C.skin, hl("torso"));
    shade(ctx, () => capsule(ctx, j.hip, add(j.hip, mul(sub(j.sho, j.hip), 0.1)), 9.4, 9.3), 3, C.shorts, 1.5);
    const u = upv(j.t, 1);
    limb(ctx, j.sho, add(j.sho, mul(u, L.neck + 2)), 4.6, 4.2, C.skin);
    head(ctx, j.head, u);

    // near arm
    limb(ctx, j.elb, j.hand, 4.4, 3.1, C.skin, hl("fa"));
    limb(ctx, j.sho, j.elb, 5.9, 4.5, C.skin, hl("ua"));
    ball(ctx, j.sho, 6.8, C.skin, hl("delt"));
    ball(ctx, j.hand, 3.6, C.skin);
  }

  // Front view, used for lateral raises where the arms move out to the sides.
  function drawFront(ctx, pose, spec, fx) {
    const cx = 130, hlDelt = spec.muscle === "shoulders" ? { color: spec.color, alpha: fx.alpha, glow: fx.glow } : null;
    for (const s of [-1, 1]) {
      const hip = [cx + s * 7, 106], knee = [cx + s * 9, 148], ank = [cx + s * 10, 184];
      ctx.beginPath(); ctx.ellipse(ank[0] + s * 2, ank[1] + 2.5, 5.5, 3.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.shoe[0]; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.stroke();
      limb(ctx, knee, ank, 5.4, 3.6, C.skin);
      limb(ctx, hip, knee, 8.2, 5.5, C.skin);
      shade(ctx, () => capsule(ctx, [cx + s * 6.5, 102], [cx + s * 8.5, 128], 9.6, 8.2), 3, C.shorts, 1.5,
        () => seg(ctx, [cx + s * 13, 104], [cx + s * 14.5, 130], 1.4, C.stripe));
    }
    const torso = () => {
      ctx.beginPath(); ctx.moveTo(cx - 20, 58); ctx.lineTo(cx + 20, 58);
      ctx.quadraticCurveTo(cx + 15, 84, cx + 11, 104); ctx.lineTo(cx - 11, 104);
      ctx.quadraticCurveTo(cx - 15, 84, cx - 20, 58); ctx.closePath();
    };
    shade(ctx, torso, 4, C.skin, 1.5, () => {
      ctx.globalAlpha = 0.28; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 15, 70); ctx.quadraticCurveTo(cx - 6, 77, cx, 72); ctx.quadraticCurveTo(cx + 6, 77, cx + 15, 70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, 78); ctx.lineTo(cx, 100);
      for (const y of [84, 91]) { ctx.moveTo(cx - 6, y); ctx.lineTo(cx + 6, y); }
      ctx.stroke(); ctx.globalAlpha = 1;
    });
    shade(ctx, () => { ctx.beginPath(); ctx.rect(cx - 12, 99, 24, 7); }, 2, C.shorts, 1.5);
    limb(ctx, [cx, 58], [cx, 45], 5.2, 4.8, C.skin);
    const h = [cx, 36];
    shade(ctx, () => circle(ctx, h, L.head), 4.5, C.skin, 1.5);
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (1.05 + i * 0.09), r = i % 2 ? L.head + 1 : L.head + 8;
      pts.push([h[0] + Math.cos(a) * r, h[1] + Math.sin(a) * r]);
    }
    for (let i = 10; i >= 0; i--) { const a = Math.PI * (1.05 + i * 0.09); pts.push([h[0] + Math.cos(a) * (L.head - 3.5), h[1] + Math.sin(a) * (L.head - 3.5) + 1]); }
    shade(ctx, () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }, 2.5, C.hair, 1.4);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + s * 3.6, 37.5, 1.3, 2.2, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      seg(ctx, [cx + s * 1.8, 33.4], [cx + s * 5.6, 34.2], 1.1, C.ink);
    }
    seg(ctx, [cx - 1.5, 42.5], [cx + 1.5, 42.5], 1, C.ink);
    for (const s of [-1, 1]) {
      const sh = [cx + s * 19, 59], a = pose.abd * Math.PI / 180, a2 = (pose.abd - 8) * Math.PI / 180;
      const e = [sh[0] + s * Math.sin(a) * L.ua, sh[1] + Math.cos(a) * L.ua];
      const hd = [e[0] + s * Math.sin(a2) * L.fa, e[1] + Math.cos(a2) * L.fa];
      limb(ctx, e, hd, 4.4, 3.1, C.skin);
      limb(ctx, sh, e, 5.9, 4.5, C.skin);
      ball(ctx, sh, 7, C.skin, hlDelt);
      ball(ctx, hd, 3.6, C.skin);
      if (spec.anim.h === "db") dumbbell(ctx, hd);
    }
  }

  // ---------- equipment ----------
  function metal(ctx, a, b, w) {
    const u = unit(sub(b, a)); let n = [u[1], -u[0]];
    if (n[0] * LIGHT[0] + n[1] * LIGHT[1] < 0) n = mul(n, -1);
    seg(ctx, a, b, w + 2.2, C.ink);
    seg(ctx, a, b, w, C.metalDark);
    seg(ctx, add(a, mul(n, w * 0.22)), add(b, mul(n, w * 0.22)), w * 0.35, C.metal);
  }
  function pad(ctx, a, b, r) { shade(ctx, () => capsule(ctx, a, b, r, r), r * 0.6, C.pad, 1.5); }
  function foot(ctx, x) { metal(ctx, [x - 9, GROUND - 1], [x + 9, GROUND - 1], 2.4); }

  function disc(ctx, p, r, back) {
    const g = ctx.createRadialGradient(p[0] - r * 0.35, p[1] - r * 0.35, r * 0.1, p[0], p[1], r);
    g.addColorStop(0, back ? "#2a303c" : "#4a5468"); g.addColorStop(1, back ? "#0e1116" : "#161a22");
    circle(ctx, p, r); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = C.ink; ctx.stroke();
    if (back) return;
    ctx.lineWidth = 1.3; ctx.strokeStyle = "#c9d1de"; circle(ctx, p, r - 2.2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.14)"; circle(ctx, p, r * 0.56); ctx.stroke();
    circle(ctx, p, r * 0.24); ctx.fillStyle = C.metal; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(p[0], p[1], r - 2.2, Math.PI * 1.08, Math.PI * 1.42);
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 1.6; ctx.stroke();
  }
  function plate(ctx, p, r) { disc(ctx, add(p, [-2.4, -1.3]), r, true); disc(ctx, p, r, false); }

  function dumbbell(ctx, p) {
    const hex = (r) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx[i ? "lineTo" : "moveTo"](p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r); }
      ctx.closePath();
    };
    shade(ctx, () => hex(6.6), 2, ["#3a4152", "#1a1e27"], 1.5, () => {
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1; hex(4); ctx.stroke();
    });
    circle(ctx, p, 1.6); ctx.fillStyle = C.metal; ctx.fill();
  }

  function pulley(ctx, p, spin) {
    circle(ctx, p, 5.6); ctx.fillStyle = C.metalDark; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = spin + i * Math.PI * 2 / 3;
      seg(ctx, p, [p[0] + Math.cos(a) * 4.2, p[1] + Math.sin(a) * 4.2], 1.1, C.metal);
    }
    circle(ctx, p, 1.5); ctx.fillStyle = C.metal; ctx.fill();
  }

  // Pad parallel to a body segment (benches, back pads, arm pads).
  function segpad(ctx, a, b, side, support, ext) {
    const u = unit(sub(b, a)), n = [u[1] * side * 11, -u[0] * side * 11], e = ext || [16, 4];
    const p1 = add(add(a, mul(u, -e[0])), n), p2 = add(add(b, mul(u, e[1])), n);
    if (support) {
      const m = add(mul(add(a, b), 0.5), n);
      metal(ctx, [m[0], m[1] + 4], [m[0], GROUND - 1], 3.4); foot(ctx, m[0]);
    }
    pad(ctx, p1, p2, 4.6);
  }

  function drawProp(ctx, p, j) {
    switch (p.k) {
      case "bench": segpad(ctx, j.hip, j.head, p.side ?? 1, p.support); break;
      case "segpad": segpad(ctx, j[p.a], j[p.b], p.side ?? 1, p.support, p.ext); break;
      case "seat":
        metal(ctx, [p.x + p.w / 2, p.y + 4], [p.x + p.w / 2, GROUND - 1], 3.4); foot(ctx, p.x + p.w / 2);
        pad(ctx, [p.x, p.y], [p.x + p.w, p.y], 4.2); break;
      case "box":
        if (p.y + p.h < GROUND - 2) for (const x of [p.x + 5, p.x + p.w - 5]) metal(ctx, [x, p.y + p.h], [x, GROUND - 1], 2.6);
        if (p.h > 12) { metal(ctx, [p.x + p.w / 2, p.y], [p.x + p.w / 2, p.y + p.h], p.w - 1); break; }
        pad(ctx, [p.x + 4, p.y + p.h / 2], [p.x + p.w - 4, p.y + p.h / 2], Math.max(3.2, p.h / 2 + 1)); break;
      case "rack":
        metal(ctx, [p.x, p.top], [p.x, GROUND - 1], 5);
        ctx.fillStyle = C.ink;
        for (let y = p.top + 8; y < GROUND - 8; y += 9) { circle(ctx, [p.x, y], 0.9); ctx.fill(); }
        foot(ctx, p.x); break;
      case "dipbar":
        metal(ctx, p.at, [p.at[0], GROUND - 1], 4); foot(ctx, p.at[0]);
        circle(ctx, p.at, 4.6); ctx.fillStyle = "#2a2f3a"; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.stroke(); break;
      case "hbar":
        for (const x of [30, 230]) { metal(ctx, [x, p.y], [x, GROUND - 1], 4); foot(ctx, x); }
        metal(ctx, [30, p.y], [230, p.y], 3.6); break;
      case "pad": {
        const c = add(j[p.j], [p.dx || 0, p.dy || 0]);
        shade(ctx, () => circle(ctx, c, 6.6), 3, C.pad, 1.4); break;
      }
      case "platform": {
        const u = unit(sub(j.ank, j.hip)), c = add(j.ank, mul(u, 8)), n = [u[1], -u[0]];
        metal(ctx, add(c, mul(n, 24)), add(c, mul(n, -24)), 5); break;
      }
      case "hyperframe": {
        const a = add(j.hip, [6, 8]), b = add(j.ank, [4, 7]);
        metal(ctx, a, b, 4); metal(ctx, add(a, [0, 6]), [a[0], GROUND - 1], 3.4); foot(ctx, a[0]);
        shade(ctx, () => circle(ctx, a, 7), 3, C.pad, 1.4); shade(ctx, () => circle(ctx, b, 6), 3, C.pad, 1.4); break;
      }
    }
  }

  function drawHandItem(ctx, kind, j) {
    if (kind === "bar") plate(ctx, j.hand, 13);
    else if (kind === "ez") plate(ctx, j.hand, 8.5);
    else if (kind === "db") dumbbell(ctx, j.hand);
    else if (kind === "barBack") plate(ctx, add(j.sho, upv(j.t - 90, 8)), 13);
  }

  // ---------- stage (cached per size + colour) ----------
  const stages = new Map();
  function stage(w, h, s, color) {
    const key = `${w}x${h}:${color}`;
    if (stages.has(key)) return stages.get(key);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.setTransform(s, 0, 0, s, 0, OY * s);
    let gr = g.createLinearGradient(0, -OY, 0, GROUND);
    gr.addColorStop(0, "#202634"); gr.addColorStop(1, "#131720");
    g.fillStyle = gr; g.fillRect(0, -OY, W, GROUND + OY);
    g.strokeStyle = "rgba(255,255,255,.035)"; g.lineWidth = 1;
    for (let x = 26; x < W; x += 52) { g.beginPath(); g.moveTo(x, -OY); g.lineTo(x, GROUND); g.stroke(); }
    gr = g.createRadialGradient(130, 70, 5, 130, 70, 150);
    gr.addColorStop(0, hexA(color, 0.26)); gr.addColorStop(1, hexA(color, 0));
    g.fillStyle = gr; g.fillRect(0, -OY, W, GROUND + OY);
    gr = g.createLinearGradient(0, GROUND, 0, H - OY);
    gr.addColorStop(0, "#1c212c"); gr.addColorStop(1, "#0c0e13");
    g.fillStyle = gr; g.fillRect(0, GROUND, W, H - OY - GROUND);
    g.strokeStyle = "rgba(255,255,255,.05)";
    for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(130 + i * 14, GROUND); g.lineTo(130 + i * 40, H - OY); g.stroke(); }
    g.strokeStyle = "rgba(255,255,255,.1)"; g.beginPath(); g.moveTo(0, GROUND + 0.5); g.lineTo(W, GROUND + 0.5); g.stroke();
    gr = g.createRadialGradient(130, GROUND + 6, 2, 130, GROUND + 6, 90);
    gr.addColorStop(0, hexA(color, 0.16)); gr.addColorStop(1, hexA(color, 0));
    g.fillStyle = gr; g.fillRect(0, GROUND, W, H - OY - GROUND);
    gr = g.createRadialGradient(130, 95, 80, 130, 95, 200);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.6)");
    g.fillStyle = gr; g.fillRect(0, -OY, W, H);
    if (stages.size > 40) stages.clear();
    stages.set(key, c);
    return c;
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

  function floorShadow(ctx, x, w) {
    const g = ctx.createRadialGradient(x, GROUND + 1, 1, x, GROUND + 1, w);
    g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.translate(x, GROUND + 1); ctx.scale(1, 0.14); ctx.translate(-x, -(GROUND + 1));
    circle(ctx, [x, GROUND + 1], w); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }

  // Manga speed lines trailing behind a fast-moving point.
  function speedLines(ctx, p, v) {
    const s = Math.hypot(v[0], v[1]);
    if (s < 0.6) return;
    const ux = v[0] / s, uy = v[1] / s, len = Math.min(26, 8 + s * 5);
    ctx.save(); ctx.globalAlpha = Math.min(0.7, s / 3);
    for (const o of [-6, 0, 6]) {
      const b = [p[0] - ux * 12 - uy * o, p[1] - uy * 12 + ux * o];
      seg(ctx, b, [b[0] - ux * (len - Math.abs(o)), b[1] - uy * (len - Math.abs(o))], 1.4, "#ffffff");
    }
    ctx.restore();
  }

  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

  // Player HUD: rep progress bar, phase pill and rep counter.
  function hud(ctx, tl, color) {
    const y = -OY + 6, x0 = 10, bw = W - 20;
    rrect(ctx, x0, y, bw, 3, 1.5); ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fill();
    rrect(ctx, x0, y, bw * tl.frac, 3, 1.5); ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    let t = 0;
    for (const d of [T_HOLD0, T_CON, T_HOLD1]) { t += d; ctx.fillRect(x0 + bw * t / PERIOD - 0.5, y - 1, 1, 5); }
    ctx.font = "600 8.5px Oswald, Inter, sans-serif"; ctx.textBaseline = "middle";
    const label = PHASES[tl.phase], tw = ctx.measureText(label).width;
    const px = W - 12 - tw - 14, py = y + 9;
    rrect(ctx, px, py, tw + 14, 14, 7); ctx.fillStyle = "rgba(8,9,13,.78)"; ctx.fill();
    ctx.strokeStyle = tl.phase === 1 || tl.phase === 2 ? color : "rgba(255,255,255,.3)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.fillText(label, px + 7, py + 7.5);
    ctx.font = "600 7.5px Inter, sans-serif"; ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fillText(`REP ${tl.rep} / ${REPS}`, W - 12, py + 23);
    ctx.textAlign = "left";
  }

  function timeline(ms, con) {
    const t0 = ((ms % PERIOD) + PERIOD) % PERIOD;
    let t = t0, s, phase;
    if (t < T_HOLD0) { s = 0; phase = 0; }
    else if ((t -= T_HOLD0) < T_CON) { s = ease(t / T_CON); phase = 1; }
    else if ((t -= T_CON) < T_HOLD1) { s = 1; phase = 2; }
    else { s = 1 - ease((t - T_HOLD1) / T_ECC); phase = 3; }
    return { k: con === "ba" ? 1 - s : s, s, phase, frac: t0 / PERIOD, rep: Math.floor(ms / PERIOD) % REPS + 1 };
  }

  // ---------- loop ----------
  const items = new Set();
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.target._anim) e.target._anim.visible = e.isIntersecting; }))
    : null;

  const cycleAt = it => ((Math.floor(it.clock / (PERIOD * 2)) % it.cycle.length) + it.cycle.length) % it.cycle.length;
  function specOf(it) { return it.cycle ? it.cycle[cycleAt(it)] : it.spec; }

  function draw(it) {
    const c = it.canvas, cw = c.clientWidth;
    if (!cw) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(cw * dpr), h = Math.round(cw * dpr * H / W);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = c.getContext("2d"), s = w / W;
    const spec = specOf(it), pat = P[spec.anim.p];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(stage(w, h, s, spec.color), 0, 0);
    if (!pat) return;
    ctx.setTransform(s, 0, 0, s, 0, OY * s);

    const still = reduced && !it.always;
    const tl = still ? { k: pat.con === "ba" ? 0 : 1, s: 1, phase: 2, frac: 0.4, rep: 1 } : timeline(it.clock, pat.con);
    const fx = { alpha: 0.55 + 0.4 * tl.s, glow: (3 + 10 * tl.s) * s };
    const pose = lerp(pat.a, pat.b, tl.k);

    if (pat.front) {
      floorShadow(ctx, 130, 34);
      drawFront(ctx, pose, spec, fx);
    } else {
      const j = solve(pose);
      floorShadow(ctx, (j.hip[0] + j.ank[0]) / 2, 40);
      pat.props.forEach(p => { if (p.k !== "cable") drawProp(ctx, p, j); });
      if (!still && tl.phase === 1) {
        const jp = solve(lerp(pat.a, pat.b, timeline(it.clock - 70, pat.con).k));
        speedLines(ctx, j.hand, sub(j.hand, jp.hand));
      }
      drawFigure(ctx, j, spec, fx);
      pat.props.forEach(p => {
        if (p.k !== "cable") return;
        seg(ctx, j.hand, p.to, 2.4, C.ink); seg(ctx, j.hand, p.to, 1.2, "#d5dbe6");
        pulley(ctx, p.to, Math.hypot(p.to[0] - j.hand[0], p.to[1] - j.hand[1]) / 6);
      });
      drawHandItem(ctx, spec.anim.h, j);
    }
    if (it.hud) hud(ctx, tl, spec.color);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min(100, now - last)); last = now;
    requestAnimationFrame(frame); // schedule first so one bad frame can't stop the loop
    for (const it of items) {
      if (!it.canvas.isConnected) { items.delete(it); if (io) io.unobserve(it.canvas); continue; }
      if (!it.paused) it.clock += dt * it.speed;
      if (it.visible) {
        try { draw(it); } catch (err) { if (!it.failed) console.error("Demo animation failed:", err); it.failed = true; }
      }
    }
  }
  requestAnimationFrame(frame);

  window.Anim = {
    PERIOD,
    // spec: { anim: {p, h}, color, muscle } — or opts.cycle: [spec, ...]. opts.hud adds the player overlay.
    attach(canvas, spec, opts = {}) {
      const it = {
        canvas, spec, cycle: opts.cycle, always: !!opts.always, hud: !!opts.hud, visible: true,
        clock: opts.cycle || opts.hud ? 0 : Math.random() * PERIOD, speed: 1, paused: false
      };
      canvas._anim = it; items.add(it);
      if (io) io.observe(canvas);
      return it;
    },
    control(canvas, o) { const it = canvas._anim; if (it) Object.assign(it, o); return it; },
    cycleIndex(canvas) { const it = canvas._anim; return it && it.cycle ? cycleAt(it) : 0; },
    has: name => !!P[name]
  };
})();
