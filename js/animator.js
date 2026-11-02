// Animated stick-figure demonstrations for every exercise (drawn on <canvas>).
// Each pattern is two poses (a = start, b = end); the figure loops between them.
// Used as the built-in demo until an AI video is placed at videos/<exercise-id>.mp4.

(function () {
  const L = { torso: 58, neck: 7, head: 10, ua: 30, fa: 28, th: 40, sh: 40 };
  const W = 260, H = 236, OY = 26, GROUND = 190, PERIOD = 3400;
  const BODY = "#f3e3d3", BACK = "#a8968a", FRAME = "#4a5162", PAD = "#5b6375", PLATE = "#9aa3b2";
  // Anime look: dark ink outline under every limb, spiky hair, an eye, speed lines on fast moves.
  const INK = "#07080b", HAIR = "#ffcf3a";

  const rad = d => d * Math.PI / 180;
  const dn = (a, l) => [Math.sin(rad(a)) * l, Math.cos(rad(a)) * l];   // angle from straight down, + = forward
  const upv = (a, l) => [Math.sin(rad(a)) * l, -Math.cos(rad(a)) * l]; // angle from straight up, + = forward
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];

  // Two-bone inverse kinematics: returns [middle joint, end joint]. s picks the bend side.
  function ik(p, t, l1, l2, s) {
    const dx = t[0] - p[0], dy = t[1] - p[1];
    let d = Math.hypot(dx, dy);
    d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, d));
    const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
    const ang = Math.atan2(dy, dx) + s * a;
    const mid = [p[0] + Math.cos(ang) * l1, p[1] + Math.sin(ang) * l1];
    const ex = t[0] - mid[0], ey = t[1] - mid[1], el = Math.hypot(ex, ey) || 1;
    return [mid, [mid[0] + ex / el * l2, mid[1] + ey / el * l2]];
  }

  const STAND = { hip: [128, 110], t: 0, foot: [130, 186] };
  const S = o => Object.assign({}, STAND, o);

  const P = {
    benchPress: {
      a: { hip: [150, 133], t: -90, foot: [188, 186], hand: [126, 110], eb: 1 },
      b: { hip: [150, 133], t: -90, foot: [188, 186], hand: [96, 74], eb: 1 },
      props: [{ k: "bench", support: true }, { k: "rack", x: 80, top: 66 }]
    },
    inclinePress: {
      a: { hip: [150, 140], t: -55, foot: [194, 186], hand: [128, 94], eb: 1 },
      b: { hip: [150, 140], t: -55, foot: [194, 186], hand: [128, 52], eb: 1 },
      props: [{ k: "bench", support: true }]
    },
    declinePress: {
      a: { hip: [150, 120], t: -105, foot: [184, 150], hand: [118, 112], eb: 1 },
      b: { hip: [150, 120], t: -105, foot: [184, 150], hand: [104, 80], eb: 1 },
      props: [{ k: "bench", support: true }, { k: "pad", j: "ank", dy: 8 }]
    },
    dip: {
      a: { hip: [133, 100], t: 8, hand: [140, 100], eb: 1, th: 15, sh: -70 },
      b: { hip: [128, 128], t: 25, hand: [140, 100], eb: 1, th: 15, sh: -70 },
      props: [{ k: "dipbar", at: [140, 100] }]
    },
    fly: {
      a: S({ t: 12, foot: [134, 186], ua: -25, fa: -15 }),
      b: S({ t: 12, foot: [134, 186], ua: 75, fa: 92 }),
      props: [{ k: "cable", to: [58, 6] }]
    },
    pecDeck: {
      a: { hip: [120, 150], t: 0, th: 90, sh: 0, ua: -20, fa: 150 },
      b: { hip: [120, 150], t: 0, th: 90, sh: 0, ua: 80, fa: 175 },
      props: [{ k: "bench" }, { k: "seat", x: 95, y: 156, w: 45 }]
    },
    pullUp: {
      a: { hip: [128, 126], t: -2, hand: [130, 10], eb: 1, th: 10, sh: -70 },
      b: { hip: [124, 84], t: -8, hand: [130, 10], eb: 1, th: 10, sh: -70 },
      props: [{ k: "hbar", y: 10 }]
    },
    latPulldown: {
      a: { hip: [120, 150], t: -12, th: 90, sh: 0, hand: [118, 38], eb: 1 },
      b: { hip: [120, 150], t: -12, th: 90, sh: 0, hand: [130, 82], eb: 1 },
      props: [{ k: "seat", x: 95, y: 156, w: 45 }, { k: "pad", j: "knee", dy: -10 }, { k: "cable", to: [118, -16] }]
    },
    barbellRow: {
      a: { hip: [110, 120], t: 60, foot: [140, 186], hand: [160, 149], eb: 1 },
      b: { hip: [110, 120], t: 60, foot: [140, 186], hand: [140, 118], eb: 1 },
      props: []
    },
    seatedRow: {
      a: { hip: [105, 158], t: 20, foot: [185, 168], hand: [180, 113], eb: 1 },
      b: { hip: [105, 158], t: -8, foot: [185, 168], hand: [112, 114], eb: 1 },
      props: [{ k: "seat", x: 70, y: 164, w: 70 }, { k: "box", x: 190, y: 140, w: 7, h: 50 }, { k: "cable", to: [200, 150] }]
    },
    dbRow: {
      a: { hip: [100, 112], t: 80, foot: [102, 186], hand: [158, 158], eb: 1 },
      b: { hip: [100, 112], t: 80, foot: [102, 186], hand: [140, 120], eb: 1 },
      props: [{ k: "box", x: 176, y: 140, w: 60, h: 8 }]
    },
    deadlift: {
      a: { hip: [98, 150], t: 42, foot: [132, 186], hand: [138, 166], eb: 1 },
      b: { hip: [126, 108], t: 0, foot: [132, 186], hand: [128, 106], eb: 1 },
      props: []
    },
    rdl: {
      a: { hip: [126, 108], t: 2, foot: [132, 186], hand: [128, 106], eb: 1 },
      b: { hip: [108, 114], t: 62, foot: [132, 186], hand: [158, 144], eb: 1 },
      props: []
    },
    goodMorning: {
      a: { hip: [126, 108], t: 0, foot: [132, 186], ua: -45, fa: 155 },
      b: { hip: [110, 114], t: 72, foot: [132, 186], ua: 27, fa: 227 },
      props: [{ k: "rack", x: 40, top: 30 }]
    },
    hyper: {
      a: { hip: [150, 108], t: 150, th: -50, sh: -50, hand: [157, 137], eb: 1 },
      b: { hip: [150, 108], t: 45, th: -50, sh: -50, hand: [176, 93], eb: 1 },
      props: [{ k: "hyperframe" }]
    },
    squat: {
      a: { hip: [128, 108], t: 5, foot: [132, 186], ua: -45, fa: 155 },
      b: { hip: [100, 148], t: 42, foot: [132, 186], ua: -8, fa: 192 },
      props: [{ k: "rack", x: 40, top: 30 }]
    },
    hackSquat: {
      a: { hip: [132, 104], t: -14, foot: [152, 180], ua: -30, fa: 160 },
      b: { hip: [110, 148], t: -20, foot: [152, 180], ua: -36, fa: 154 },
      props: [{ k: "bench" }, { k: "box", x: 135, y: 184, w: 44, h: 6 }]
    },
    legPress: {
      a: { hip: [92, 148], t: -58, foot: [126, 118], ua: 40, fa: 80 },
      b: { hip: [92, 148], t: -58, foot: [150, 98], ua: 40, fa: 80 },
      props: [{ k: "bench" }, { k: "seat", x: 70, y: 155, w: 45 }, { k: "platform" }]
    },
    legExtension: {
      a: { hip: [115, 150], t: -8, th: 88, sh: 5, ua: 15, fa: 40 },
      b: { hip: [115, 150], t: -8, th: 88, sh: 85, ua: 15, fa: 40 },
      props: [{ k: "bench" }, { k: "seat", x: 90, y: 156, w: 48 }, { k: "pad", j: "ank", dx: 6 }]
    },
    splitSquat: {
      a: { hip: [120, 112], t: 5, foot: [152, 186], foot2: [70, 150], ua: 0, fa: 0 },
      b: { hip: [112, 140], t: 14, foot: [152, 186], foot2: [70, 150], ua: 0, fa: 0 },
      props: [{ k: "box", x: 40, y: 155, w: 45, h: 8 }]
    },
    lyingCurl: {
      a: { hip: [110, 135], t: 90, th: -90, sh: -90, ua: 30, fa: -40 },
      b: { hip: [110, 135], t: 90, th: -90, sh: -172, ua: 30, fa: -40 },
      props: [{ k: "bench", side: -1, support: true }, { k: "pad", j: "ank", dy: -8 }]
    },
    seatedCurl: {
      a: { hip: [110, 150], t: -10, th: 88, sh: 85, ua: 20, fa: 60 },
      b: { hip: [110, 150], t: -10, th: 88, sh: -15, ua: 20, fa: 60 },
      props: [{ k: "bench" }, { k: "seat", x: 85, y: 156, w: 48 }, { k: "pad", j: "knee", dy: -10 }, { k: "pad", j: "ank", dx: -6 }]
    },
    curl: {
      a: S({ ua: 0, fa: 0 }),
      b: S({ ua: 10, fa: 150 }),
      props: []
    },
    preacherCurl: {
      a: { hip: [110, 112], t: 8, foot: [114, 186], ua: 45, fa: 50 },
      b: { hip: [110, 112], t: 8, foot: [114, 186], ua: 45, fa: 165 },
      props: [{ k: "segpad", a: "sho", b: "elb", side: -1, ext: [0, 8], support: true }]
    },
    inclineCurl: {
      a: { hip: [140, 140], t: -50, foot: [186, 186], ua: -5, fa: -5 },
      b: { hip: [140, 140], t: -50, foot: [186, 186], ua: -5, fa: 140 },
      props: [{ k: "bench", support: true }]
    },
    pushdown: {
      a: S({ hip: [125, 110], t: 8, ua: -5, fa: 150 }),
      b: S({ hip: [125, 110], t: 8, ua: -5, fa: 5 }),
      props: [{ k: "cable", to: [152, -16] }]
    },
    skullCrusher: {
      a: { hip: [150, 133], t: -90, foot: [188, 186], ua: 195, fa: 280 },
      b: { hip: [150, 133], t: -90, foot: [188, 186], ua: 195, fa: 190 },
      props: [{ k: "bench", support: true }]
    },
    overheadExt: {
      a: S({ hip: [125, 110], ua: 178, fa: 330 }),
      b: S({ hip: [125, 110], ua: 178, fa: 182 }),
      props: []
    },
    benchDip: {
      a: { hip: [108, 140], t: -5, hand: [100, 140], eb: 1, foot: [190, 186] },
      b: { hip: [112, 168], t: 5, hand: [100, 140], eb: 1, foot: [190, 186] },
      props: [{ k: "box", x: 38, y: 142, w: 64, h: 8 }]
    },
    ohp: {
      a: S({ t: -3, hand: [140, 50], eb: 1 }),
      b: S({ t: -3, hand: [127, -6], eb: 1 }),
      props: []
    },
    seatedPress: {
      a: { hip: [120, 150], t: -5, th: 90, sh: 0, hand: [138, 96], eb: 1 },
      b: { hip: [120, 150], t: -5, th: 90, sh: 0, hand: [118, 36], eb: 1 },
      props: [{ k: "bench" }, { k: "seat", x: 95, y: 156, w: 45 }]
    },
    frontRaise: {
      a: S({ ua: 0, fa: 0 }),
      b: S({ ua: 92, fa: 95 }),
      props: []
    },
    reversePecDeck: {
      a: { hip: [125, 150], t: 8, th: 90, sh: 0, ua: 85, fa: 88 },
      b: { hip: [125, 150], t: 8, th: 90, sh: 0, ua: -55, fa: -55 },
      props: [{ k: "bench", side: -1 }, { k: "seat", x: 100, y: 156, w: 45 }]
    },
    facePull: {
      a: S({ hip: [125, 110], t: -6, hand: [176, 58], eb: -1 }),
      b: S({ hip: [125, 110], t: -6, hand: [128, 36], eb: -1 }),
      props: [{ k: "cable", to: [218, 52] }]
    },
    lateralRaise: { front: true, a: { abd: 6 }, b: { abd: 85 }, props: [] }
  };

  // Which body segment glows in the muscle colour.
  const HIGHLIGHT = { chest: "torso", back: "torso", shoulders: "delt", triceps: "ua", arms: "ua", quads: "thigh", hamstrings: "thigh" };

  function lerp(a, b, k) {
    const o = {};
    for (const key in a) {
      const x = a[key], y = b[key];
      if (typeof x === "number" && typeof y === "number") o[key] = x + (y - x) * k;
      else if (Array.isArray(x) && Array.isArray(y)) o[key] = x.map((v, i) => v + (y[i] - v) * k);
      else o[key] = x;
    }
    return o;
  }

  function phase(x) {
    x -= Math.floor(x);
    let k;
    if (x < 0.12) k = 0; else if (x < 0.5) k = (x - 0.12) / 0.38;
    else if (x < 0.62) k = 1; else k = 1 - (x - 0.62) / 0.38;
    return 0.5 - 0.5 * Math.cos(Math.PI * k);
  }

  function solve(p) {
    const hip = p.hip;
    const sho = add(hip, upv(p.t, L.torso));
    const head = add(sho, upv(p.t, L.neck + L.head));
    let elb, hand, knee, ank, knee2, ank2;
    if (p.hand) [elb, hand] = ik(sho, p.hand, L.ua, L.fa, p.eb ?? 1);
    else { elb = add(sho, dn(p.ua, L.ua)); hand = add(elb, dn(p.fa, L.fa)); }
    if (p.foot) [knee, ank] = ik(hip, p.foot, L.th, L.sh, p.kb ?? -1);
    else { knee = add(hip, dn(p.th, L.th)); ank = add(knee, dn(p.sh, L.sh)); }
    if (p.foot2) [knee2, ank2] = ik(hip, p.foot2, L.th, L.sh, -1);
    return { hip, sho, head, elb, hand, knee, ank, knee2, ank2, t: p.t };
  }

  function seg(ctx, a, b, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  function dot(ctx, p, r, fill, stroke, sw) {
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw || 2; ctx.stroke(); }
  }
  function footOf(ctx, knee, ank, color) {
    const dx = ank[0] - knee[0], dy = ank[1] - knee[1], l = Math.hypot(dx, dy) || 1;
    seg(ctx, ank, [ank[0] + dy / l * 10, ank[1] - dx / l * 10], 6, color);
  }

  // Thick pad drawn parallel to a body segment (benches, back pads, arm pads).
  function segpad(ctx, a, b, side, support, ext) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l, nx = uy * side * 11, ny = -ux * side * 11;
    const e = ext || [16, 4];
    seg(ctx, [a[0] - ux * e[0] + nx, a[1] - uy * e[0] + ny], [b[0] + ux * e[1] + nx, b[1] + uy * e[1] + ny], 8, PAD);
    if (support) {
      const m = [(a[0] + b[0]) / 2 + nx, (a[1] + b[1]) / 2 + ny];
      seg(ctx, [m[0], m[1] + 4], [m[0], GROUND], 4, FRAME);
    }
  }

  function drawProp(ctx, p, j) {
    switch (p.k) {
      case "bench": segpad(ctx, j.hip, j.head, p.side ?? 1, p.support); break;
      case "segpad": segpad(ctx, j[p.a], j[p.b], p.side ?? 1, p.support, p.ext); break;
      case "seat":
        seg(ctx, [p.x, p.y], [p.x + p.w, p.y], 8, PAD);
        seg(ctx, [p.x + p.w / 2, p.y + 4], [p.x + p.w / 2, GROUND], 4, FRAME); break;
      case "box":
        ctx.fillStyle = PAD; ctx.fillRect(p.x, p.y, p.w, p.h);
        if (p.y + p.h < GROUND - 2) { seg(ctx, [p.x + 4, p.y + p.h], [p.x + 4, GROUND], 3, FRAME); seg(ctx, [p.x + p.w - 4, p.y + p.h], [p.x + p.w - 4, GROUND], 3, FRAME); }
        break;
      case "rack": seg(ctx, [p.x, p.top], [p.x, GROUND], 5, FRAME); break;
      case "dipbar": seg(ctx, [p.at[0], p.at[1]], [p.at[0], GROUND], 4, FRAME); dot(ctx, p.at, 4, FRAME); break;
      case "hbar":
        seg(ctx, [30, p.y], [230, p.y], 4, FRAME);
        seg(ctx, [30, p.y], [30, GROUND], 4, FRAME); seg(ctx, [230, p.y], [230, GROUND], 4, FRAME); break;
      case "pad": dot(ctx, add(j[p.j], [p.dx || 0, p.dy || 0]), 6.5, PAD); break;
      case "platform": {
        const dx = j.ank[0] - j.hip[0], dy = j.ank[1] - j.hip[1], l = Math.hypot(dx, dy) || 1;
        const ux = dx / l, uy = dy / l, c = [j.ank[0] + ux * 8, j.ank[1] + uy * 8];
        seg(ctx, [c[0] + uy * 24, c[1] - ux * 24], [c[0] - uy * 24, c[1] + ux * 24], 6, PAD);
        break;
      }
      case "hyperframe":
        seg(ctx, add(j.hip, [6, 8]), add(j.ank, [4, 6]), 5, FRAME);
        dot(ctx, add(j.hip, [6, 8]), 7, PAD); dot(ctx, add(j.ank, [4, 7]), 6, PAD);
        seg(ctx, add(j.hip, [6, 14]), [j.hip[0] + 6, GROUND], 4, FRAME); break;
    }
  }

  function drawHandItem(ctx, kind, j) {
    if (kind === "bar") { dot(ctx, j.hand, 13, "#2f3542", PLATE, 3); dot(ctx, j.hand, 3, PLATE); }
    else if (kind === "ez") { dot(ctx, j.hand, 8, "#2f3542", PLATE, 2.5); }
    else if (kind === "db") { dot(ctx, j.hand, 6.5, "#2f3542", PLATE, 2.5); }
    else if (kind === "barBack") {
      const d = upv(j.t - 90, 8); // a little behind the shoulders, on the upper back
      dot(ctx, [j.sho[0] + d[0], j.sho[1] + d[1]], 13, "#2f3542", PLATE, 3);
    }
  }

  // ol = outline pass: same shapes, wider and in ink, drawn first so the colour pass sits on top.
  function drawFigure(ctx, j, color, muscle, ol) {
    const hl = HIGHLIGHT[muscle];
    const c = x => (ol ? INK : x), w = x => (ol ? x + 4 : x);
    if (j.knee2) { seg(ctx, j.hip, j.knee2, w(10), c(BACK)); seg(ctx, j.knee2, j.ank2, w(8), c(BACK)); footOf(ctx, j.knee2, j.ank2, c(BACK)); }
    seg(ctx, j.hip, j.knee, w(10), c(hl === "thigh" ? color : BODY));
    seg(ctx, j.knee, j.ank, w(8), c(BODY)); footOf(ctx, j.knee, j.ank, c(BODY));
    seg(ctx, j.hip, j.sho, w(13), c(hl === "torso" ? color : BODY));
    seg(ctx, j.sho, add(j.sho, upv(j.t, L.neck)), w(6), c(BODY));
    dot(ctx, j.head, L.head + (ol ? 2 : 0), c(BODY));
    if (!ol) hairAndEye(ctx, j.head, upv(j.t, 1));
    seg(ctx, j.sho, j.elb, w(8), c(hl === "ua" ? color : BODY));
    seg(ctx, j.elb, j.hand, w(7), c(BODY));
    if (hl === "delt") dot(ctx, j.sho, 7 + (ol ? 2 : 0), c(color));
    dot(ctx, j.hand, 3.5 + (ol ? 2 : 0), c(BODY));
  }

  // Spiky hair over the top/back of the head, plus one eye on the face side. u = unit "up" of the head.
  function hairAndEye(ctx, h, u, front) {
    const R = L.head, up = Math.atan2(u[1], u[0]);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const a = up + rad(45 - i * 21);
      const r = i % 2 ? R + 1 : R + 8;
      pts.push([h[0] + Math.cos(a) * r, h[1] + Math.sin(a) * r]);
    }
    for (let i = 8; i >= 0; i--) {
      const a = up + rad(45 - i * 21);
      pts.push([h[0] + Math.cos(a) * (R - 4), h[1] + Math.sin(a) * (R - 4)]);
    }
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = HAIR; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
    const f = front || [-u[1], u[0]]; // face direction: perpendicular to "up", toward the front
    const e = [h[0] + f[0] * 4.5 + u[0] * 0.5, h[1] + f[1] * 4.5 + u[1] * 0.5];
    ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(up + Math.PI / 2);
    ctx.beginPath(); ctx.ellipse(0, 0, 1.6, 2.6, 0, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(-0.5, -0.9, 0.7, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.restore();
  }

  // Manga speed lines trailing behind a fast-moving point.
  function speedLines(ctx, p, v) {
    const s = Math.hypot(v[0], v[1]);
    if (s < 0.5) return;
    const ux = v[0] / s, uy = v[1] / s, len = Math.min(26, 8 + s * 5);
    ctx.save(); ctx.globalAlpha = Math.min(0.75, s / 3);
    for (const o of [-6, 0, 6]) {
      const b = [p[0] - ux * 10 - uy * o, p[1] - uy * 10 + ux * o];
      seg(ctx, b, [b[0] - ux * (len - Math.abs(o)), b[1] - uy * (len - Math.abs(o))], 1.5, "#ffffff");
    }
    ctx.restore();
  }

  // Front view (used for lateral raises, where the arms move sideways).
  function drawFront(ctx, pose, color, kind, ol) {
    const cx = 130, c = x => (ol ? INK : x), w = x => (ol ? x + 4 : x);
    for (const s of [-1, 1]) {
      seg(ctx, [cx + s * 8, 110], [cx + s * 10, 148], w(10), c(BODY));
      seg(ctx, [cx + s * 10, 148], [cx + s * 11, 186], w(8), c(BODY));
      seg(ctx, [cx + s * 11, 186], [cx + s * 17, 187], w(5), c(BODY));
    }
    seg(ctx, [cx, 104], [cx, 62], w(24), c(BODY));
    seg(ctx, [cx - 16, 58], [cx + 16, 58], w(10), c(BODY));
    seg(ctx, [cx, 56], [cx, 46], w(6), c(BODY));
    dot(ctx, [cx, 38], L.head + (ol ? 2 : 0), c(BODY));
    if (!ol) {
      hairAndEye(ctx, [cx, 38], [0, -1], [-0.55, 0]);
      hairAndEye(ctx, [cx, 38], [0, -1], [0.55, 0]);
    }
    for (const s of [-1, 1]) {
      const sh = [cx + s * 17, 58], a = pose.abd;
      const e = [sh[0] + s * Math.sin(rad(a)) * L.ua, sh[1] + Math.cos(rad(a)) * L.ua];
      const h = [e[0] + s * Math.sin(rad(a - 8)) * L.fa, e[1] + Math.cos(rad(a - 8)) * L.fa];
      seg(ctx, sh, e, w(8), c(BODY)); seg(ctx, e, h, w(7), c(BODY));
      dot(ctx, sh, 7 + (ol ? 2 : 0), c(color));
      if (ol) continue;
      if (kind === "db") dot(ctx, h, 6.5, "#2f3542", PLATE, 2.5); else dot(ctx, h, 3.5, BODY);
    }
  }

  const items = new Set();
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.target._anim) e.target._anim.visible = e.isIntersecting; }))
    : null;

  function draw(it, now) {
    const c = it.canvas, cw = c.clientWidth;
    if (!cw) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(cw * dpr), h = Math.round(cw * dpr * H / W);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = c.getContext("2d"), s = w / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.setTransform(s, 0, 0, s, 0, OY * s);

    let spec = it.spec;
    if (it.cycle) spec = it.cycle[Math.floor(now / (PERIOD * 2)) % it.cycle.length];
    const pat = P[spec.anim.p];
    if (!pat) return;
    const still = reduced && !it.always;
    const k = still ? 1 : phase((now + it.offset) / PERIOD);
    const pose = lerp(pat.a, pat.b, k);

    seg(ctx, [10, GROUND + 2], [W - 10, GROUND + 2], 2, "#2c313c");
    if (pat.front) {
      drawFront(ctx, pose, spec.color, spec.anim.h, true);
      drawFront(ctx, pose, spec.color, spec.anim.h, false);
      return;
    }
    const j = solve(pose);
    pat.props.forEach(p => { if (p.k !== "cable") drawProp(ctx, p, j); });
    if (!still) {
      const jp = solve(lerp(pat.a, pat.b, phase((now + it.offset - 70) / PERIOD)));
      speedLines(ctx, j.hand, [j.hand[0] - jp.hand[0], j.hand[1] - jp.hand[1]]);
    }
    drawFigure(ctx, j, spec.color, spec.muscle, true);
    drawFigure(ctx, j, spec.color, spec.muscle, false);
    pat.props.forEach(p => {
      if (p.k === "cable") { seg(ctx, j.hand, p.to, 1.5, PLATE); dot(ctx, p.to, 5, FRAME, PLATE, 1.5); }
    });
    drawHandItem(ctx, spec.anim.h, j);
  }

  function frame(now) {
    for (const it of items) {
      if (!it.canvas.isConnected) { items.delete(it); if (io) io.unobserve(it.canvas); continue; }
      if (it.visible) draw(it, now);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.Anim = {
    // spec: { anim: {p, h}, color, muscle }  — or opts.cycle: [spec, spec, ...]
    attach(canvas, spec, opts = {}) {
      const it = { canvas, spec, cycle: opts.cycle, always: !!opts.always, visible: true, offset: Math.random() * PERIOD };
      canvas._anim = it; items.add(it);
      if (io) io.observe(canvas);
      return it;
    },
    has: name => !!P[name]
  };
})();
