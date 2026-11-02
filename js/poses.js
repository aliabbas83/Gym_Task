// Exercise poses for the animated demos: body proportions, kinematics and one
// start/end pose pair per movement pattern. Rendering lives in animator.js.
(function () {
  const L = { torso: 58, neck: 7, head: 10, ua: 30, fa: 28, th: 40, sh: 40 };
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

  // con: direction of the lifting (concentric) half of the rep. "ba" = the lift goes from pose b back to pose a.
  for (const k of ["dip", "rdl", "goodMorning", "squat", "hackSquat", "splitSquat", "benchDip"]) P[k].con = "ba";

  window.Poses = { L, P, lerp, solve, upv, dn, add, rad };
})();
