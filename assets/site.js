// Overlayer website: the live overlay demo, style tabs, pricing toggle and
// copy button. No libraries, no network requests.
//
// The overlays are ported line for line from the app's renderers
// (app/src/main/java/com/overlayer/app/render/styles/*Style.kt), in the same
// 1920×1080 design space, with the same fonts, colourways and motion. When a
// style changes in the app, change it here too so the site never shows
// something the app doesn't make.

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var frame = document.getElementById("frame");
  if (!frame) return;

  // ---------- A synthetic 24-second downhill run ----------

  var LOOP = 24;
  var JUMP_AT = 15.2, JUMP_LEN = 0.64;          // seconds into the loop
  var TRACK_OFFSET_MS = 872000;                 // the clip starts 14:32 into the ride
  var CLOCK_START = 16 * 60 + 28;               // ride started at 16:28 local time
  var RIDE_NAME = "FELLS LOOP";
  var RIDE_DATE = "SAT 26 SEP 2026";

  function speedAt(t) {
    return 31 + 9 * Math.sin(t * 0.55) + 5 * Math.sin(t * 1.7 + 1) + (t > 13 && t < JUMP_AT ? 6 : 0);
  }
  function altAt(t) { return 1840 - t * 1.1 - 1.5 * Math.sin(t * 0.4); }
  function hrAt(t) { return 150 + 14 * Math.sin(t * 0.26 - 0.8) + 4 * Math.sin(t * 1.3); }
  function lateralG(t) { return 0.9 * Math.sin(t * 0.9) + 0.35 * Math.sin(t * 2.3); }
  function inJump(t) { return t >= JUMP_AT && t < JUMP_AT + JUMP_LEN; }

  var DIST0 = 4210, distTable = [0], SPEED_MAX = 0;
  (function () {
    var d = 0, dt = 0.05;
    for (var t = dt; t <= LOOP + dt; t += dt) {
      d += speedAt(t) / 3.6 * dt;
      distTable.push(d);
      SPEED_MAX = Math.max(SPEED_MAX, speedAt(t));
    }
  })();
  function distAt(t) { return DIST0 + distTable[Math.min(distTable.length - 1, Math.round(t / 0.05))]; }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function signed(v) { return v < 0 ? "−" + (-v) : "" + v; }

  /** The values the renderers read, formatted exactly as core/Gauge.kt does. */
  function sampleAt(t) {
    var sp = speedAt(t);
    var grade = (altAt(t + 0.5) - altAt(t - 0.5)) / (sp / 3.6) * 100;
    var trackMs = TRACK_OFFSET_MS + t * 1000;
    var s = Math.floor(trackMs / 1000);
    var clock = CLOCK_START + Math.floor(s / 60);
    return {
      t: t,
      trackMs: trackMs,
      speed: { display: "" + Math.round(sp), fraction: sp / SPEED_MAX, unit: "km/h" },
      alt: { display: "" + Math.round(altAt(t)), unit: "m" },
      hr: { display: "" + Math.round(hrAt(t)), unit: "bpm", bpm: hrAt(t) },
      grade: { display: signed(Math.round(grade)), unit: "%", value: grade },
      dist: { display: (distAt(t) / 1000).toFixed(1), unit: "km" },
      elapsed: { display: Math.floor(s / 60) + ":" + pad2(s % 60) },
      time: { display: pad2(Math.floor(clock / 60) % 24) + ":" + pad2(clock % 60) }
    };
  }

  var JUMP = { takeoffMs: TRACK_OFFSET_MS + JUMP_AT * 1000, airtimeMs: JUMP_LEN * 1000, heightM: 1.1, landingG: 2.4 };
  JUMP.landingMs = JUMP.takeoffMs + JUMP.airtimeMs;
  var JUMP_HOLD_MS = 3000;

  // ---------- core Motion ----------

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function progress(videoMs, index, durationMs, delayMs, gapMs) {
    if (index == null) index = 0;
    if (durationMs == null) durationMs = 700;
    if (delayMs == null) delayMs = 150;
    if (gapMs == null) gapMs = 140;
    return clamp01((videoMs - (delayMs + index * gapMs)) / durationMs);
  }
  function easeOut(p) { var q = 1 - clamp01(p); return 1 - q * q * q; }
  function easeBack(p) { var c1 = 1.70158, c3 = c1 + 1, q = clamp01(p) - 1; return 1 + c3 * q * q * q + c1 * q * q; }
  function beatScale(videoMs, bpm) {
    var beats = videoMs / 60000 * bpm, phase = beats - Math.floor(beats);
    return 1 + 0.3 * Math.exp(-phase * 9);
  }
  function blink(videoMs, periodMs) { return Math.floor(videoMs / (periodMs / 2)) % 2 === 0; }

  // ---------- core Colourways ----------

  var COLOURWAYS = {
    clean: [
      { name: "White", swatch: [0xFFFFFFFF, 0xFFFF4D6D], p: { ink: 0xFFFFFFFF, sub: 0xE6FFFFFF, track: 0x59FFFFFF, heart: 0xFFFF4D6D, shadow: 0x80000000 } },
      { name: "Ink", swatch: [0xFF0E1A24, 0xFFE63956], p: { ink: 0xFF0E1A24, sub: 0xD90E1A24, track: 0x400E1A24, heart: 0xFFE63956, shadow: 0x99FFFFFF } },
      { name: "Gold", swatch: [0xFFFFD54F, 0xFFFF7A3D], p: { ink: 0xFFFFD54F, sub: 0xEBFFECAA, track: 0x59FFD54F, heart: 0xFFFF7A3D, shadow: 0x99000000 } },
      { name: "Ice", swatch: [0xFFCFEFFF, 0xFF7AD3FF], p: { ink: 0xFFCFEFFF, sub: 0xEBCFEFFF, track: 0x59CFEFFF, heart: 0xFF7AD3FF, shadow: 0x99000A1E } }
    ],
    race: [
      { name: "Yellow", swatch: [0xFFFFD400, 0xFF1E2022], p: { accent: 0xFFFFD400, onAccent: 0xFF0C0C0C, carbonA: 0xFF131415, carbonB: 0xFF1E2022 } },
      { name: "Orange", swatch: [0xFFFF8000, 0xFF1E2022], p: { accent: 0xFFFF8000, onAccent: 0xFF0C0C0C, carbonA: 0xFF131415, carbonB: 0xFF1E2022 } },
      { name: "Green", swatch: [0xFF00C46A, 0xFF17211B], p: { accent: 0xFF00C46A, onAccent: 0xFF04140C, carbonA: 0xFF0F1512, carbonB: 0xFF17211B } },
      { name: "Red", swatch: [0xFFE8002D, 0xFF201719], p: { accent: 0xFFE8002D, onAccent: 0xFFFFFFFF, carbonA: 0xFF151012, carbonB: 0xFF201719 } }
    ],
    broadcast: [
      { name: "Classic", swatch: [0xFF0B1E3F, 0xFFFFD400], p: { primary: 0xFF0B1E3F, onPrimary: 0xFFFFFFFF, accent: 0xFFFFD400, onAccent: 0xFF0B1E3F, alert: 0xFFE10600, light: 0xFFFFFFFF, onLight: 0xFF0B1E3F, dark: 0xE0081020 } },
      { name: "Black / red", swatch: [0xFF111111, 0xFFE10600], p: { primary: 0xFF111111, onPrimary: 0xFFFFFFFF, accent: 0xFFE10600, onAccent: 0xFFFFFFFF, alert: 0xFFE10600, light: 0xFFFFFFFF, onLight: 0xFF111111, dark: 0xD9000000 } },
      { name: "White / blue", swatch: [0xFFFFFFFF, 0xFF0033A0], p: { primary: 0xFFFFFFFF, onPrimary: 0xFF0033A0, accent: 0xFF0033A0, onAccent: 0xFFFFFFFF, alert: 0xFFE10600, light: 0xFFEEF3FB, onLight: 0xFF0033A0, dark: 0xD900143C } },
      { name: "Green / gold", swatch: [0xFF0B3D2E, 0xFFD4AF37], p: { primary: 0xFF0B3D2E, onPrimary: 0xFFFFFFFF, accent: 0xFFD4AF37, onAccent: 0xFF0B3D2E, alert: 0xFFC62828, light: 0xFFFFFFFF, onLight: 0xFF0B3D2E, dark: 0xE0041812 } }
    ]
  };

  /** An Android ARGB int as a CSS colour. */
  function col(v) {
    var a = Math.floor(v / 16777216) % 256;
    return "rgba(" + ((v >> 16) & 255) + "," + ((v >> 8) & 255) + "," + (v & 255) + "," + (a / 255).toFixed(3) + ")";
  }

  // ---------- Canvas helpers, as in DesignRenderer ----------

  var canvas = document.getElementById("scene");
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1, sc = 1;   // sc: design px -> device px, for shadows

  var FONTS = {
    italic: function (s) { return "italic 800 " + s + "px 'Barlow Condensed', sans-serif"; },
    semi: function (s) { return "600 " + s + "px 'Barlow Condensed', sans-serif"; },
    bold: function (s) { return "700 " + s + "px 'Barlow Condensed', sans-serif"; },
    mono: function (s) { return s + "px 'Share Tech Mono', monospace"; },
    // Clean uses the phone's own condensed face (Roboto Condensed on Android).
    roboto: function (s) { return "400 " + s + "px 'Roboto Condensed', sans-serif-condensed, 'Barlow Condensed', sans-serif"; },
    robotoBold: function (s) { return "700 " + s + "px 'Roboto Condensed', sans-serif-condensed, 'Barlow Condensed', sans-serif"; }
  };
  var hasSpacing = "letterSpacing" in ctx;

  function shadow(radius, dy, color) {
    ctx.shadowColor = col(color);
    ctx.shadowBlur = radius * sc;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = dy * sc;
  }
  function noShadow() { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

  function setText(font, size, align, spacing) {
    ctx.font = FONTS[font](size);
    ctx.textAlign = align || "left";
    if (hasSpacing) ctx.letterSpacing = (spacing || 0) + "px";
  }
  /** Draws text and returns its width. */
  function text(s, x, y, font, size, color, align, spacing, sh) {
    setText(font, size, align, spacing);
    ctx.fillStyle = col(color);
    if (sh) shadow(size * 0.05 + 4, 3, sh); else noShadow();
    ctx.fillText(s, x, y);
    noShadow();
    return ctx.measureText(s).width;
  }
  function measure(s, font, size, spacing) {
    setText(font, size, "left", spacing);
    return ctx.measureText(s).width;
  }
  function faded(alpha, block) {
    var a = clamp01(alpha);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    block();
    ctx.restore();
  }
  function heart(x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    noShadow();
    ctx.fillStyle = col(color);
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-12, -2, -8, -13, 0, -6);
    ctx.bezierCurveTo(8, -13, 12, -2, 0, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function slanted(x, y, w, h, lean) {
    var p = new Path2D();
    p.moveTo(x + lean, y);
    p.lineTo(x + w, y);
    p.lineTo(x + w - lean, y + h);
    p.lineTo(x, y + h);
    p.closePath();
    return p;
  }
  function roundRect(x1, y1, x2, y2, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x1, y1, x2 - x1, y2 - y1, r); else ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.fill();
  }
  function lapTime(ms) {
    var t = Math.max(0, Math.floor(ms));
    return Math.floor(t / 60000) + ":" + pad2(Math.floor(t / 1000) % 60) + "." + (Math.floor(t / 100) % 10);
  }

  // ---------- Clean (CleanStyle.kt) ----------

  function drawClean(f, p) {
    var intro = function (i) { return progress(f.videoMs, i); };

    // Speed
    var a = easeOut(intro(0));
    faded(a, function () {
      ctx.save();
      ctx.translate(0, 34 * (1 - a));
      var w = text(f.s.speed.display, 92, 952, "robotoBold", 230, p.ink, "left", -5, p.shadow);
      text("KM/H", 92 + w + 18, 812, "roboto", 30, p.sub, "left", 6, p.shadow);
      ctx.fillStyle = col(p.track);
      roundRect(98, 984, 618, 989, 2.5);
      ctx.fillStyle = col(p.ink);
      var bw = 520 * f.s.speed.fraction;
      if (bw > 0) roundRect(98, 984, 98 + bw, 989, 2.5);
      ctx.restore();
    });

    function stat(x, y, index, label, value, unit, extra) {
      var a = easeOut(intro(index));
      faded(a, function () {
        ctx.save();
        ctx.translate(0, 24 * (1 - a));
        text(label, x, y - 46, "roboto", 17, p.sub, "left", 3, p.shadow);
        if (extra) extra();
        var w = text(value, x, y, "robotoBold", 50, p.ink, "left", 0, p.shadow);
        if (unit) text(unit, x + w + 6, y, "roboto", 22, p.ink, "left", 0, p.shadow);
        ctx.restore();
      });
    }
    stat(700, 902, 1, "ALTITUDE", f.s.alt.display, f.s.alt.unit);
    stat(940, 902, 2, "HEART RATE", f.s.hr.display, f.s.hr.unit, function () { heart(1078, 850, f.beat * 1.1, p.heart); });
    stat(700, 992, 2, "GRADE", f.s.grade.display, f.s.grade.unit);
    stat(940, 992, 3, "ELAPSED", f.s.elapsed.display, "");

    // Clock
    faded(easeOut(intro(3)), function () {
      text(f.s.time.display, 1830, 118, "robotoBold", 66, p.ink, "right", 0, p.shadow);
      text("LOCAL TIME", 1830, 150, "roboto", 17, p.sub, "right", 3, p.shadow);
    });
  }

  // ---------- Race Dash (RaceDashStyle.kt) ----------

  var LIGHTS = 15, BARS = 64;
  var GREEN = 0xFF36E05A, YELLOW = 0xFFFFD400, RED = 0xFFFF2D2D, UNLIT = 0xFF1D1F22, BAR_OFF = 0xFF2A2C2F, MUTED = 0xFF9AA0A6;
  var carbonCache = {};

  function carbon(p) {
    var key = p.carbonA + ":" + p.carbonB;
    if (carbonCache[key]) return carbonCache[key];
    var tile = document.createElement("canvas");
    tile.width = tile.height = 14;
    var t = tile.getContext("2d");
    t.fillStyle = col(p.carbonA); t.fillRect(0, 0, 14, 14);
    t.fillStyle = col(p.carbonB); t.fillRect(0, 0, 7, 7); t.fillRect(7, 7, 7, 7);
    var pat = ctx.createPattern(tile, "repeat");
    if (pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix().rotate(45));
    return (carbonCache[key] = pat);
  }

  function hsv(h, s, v) {
    var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else { g = c; b = x; }
    return "rgb(" + Math.round((r + m) * 255) + "," + Math.round((g + m) * 255) + "," + Math.round((b + m) * 255) + ")";
  }

  function drawRace(f, p) {
    var slide = 300 * (1 - easeOut(progress(f.videoMs, 0, 800)));
    var label = function (s, x) { text(s, x, 950, "semi", 22, MUTED, "left", 4); };

    // Strip
    ctx.save();
    ctx.translate(0, slide);
    var strip = new Path2D();
    strip.moveTo(150, 1062); strip.lineTo(212, 842); strip.lineTo(1708, 842); strip.lineTo(1770, 1062); strip.closePath();
    ctx.fillStyle = carbon(p);
    ctx.fill(strip);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.stroke(strip);
    ctx.strokeStyle = col(p.accent); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(212, 842); ctx.lineTo(1708, 842); ctx.stroke();

    // Rev bar
    var lit = Math.round(f.s.speed.fraction * BARS), step = 1400 / BARS;
    for (var i = 0; i < BARS; i++) {
      var t = i / (BARS - 1), h = 12 + 36 * Math.pow(t, 1.4), x = 260 + i * step;
      ctx.fillStyle = i < lit ? hsv(120 - 120 * t, 0.9, 0.95) : col(BAR_OFF);
      ctx.fillRect(x, 906 - h, step - 5, h);
    }

    // Left: distance and run time
    label("DIST", 280);
    var w = text(f.s.dist.display, 280, 1028, "italic", 64, 0xFFFFFFFF);
    text("KM", 280 + w + 6, 1028, "semi", 24, MUTED);
    label("RUN TIME", 440);
    text(lapTime(f.s.trackMs), 440, 1022, "mono", 50, 0xFFFFFFFF);

    // Centre: speed
    ctx.fillStyle = col(p.accent);
    ctx.fill(slanted(750, 926, 420, 120, 20));
    text(f.s.speed.display, 960, 1032, "italic", 136, p.onAccent, "center");
    text("KM/H", 1140, 960, "bold", 22, p.onAccent, "right", 2);

    // Right: altitude and pulse
    label("ALT M", 1240);
    text(f.s.alt.display, 1240, 1022, "mono", 50, 0xFFFFFFFF);
    label("PULSE", 1480);
    text(f.s.hr.display, 1480, 1022, "mono", 50, 0xFFFFFFFF);
    heart(1640, 1004, f.beat * 1.4, p.accent);
    ctx.restore();

    // Shift lights: a test sweep on entry, then speed; flashing near the top.
    var sweep = progress(f.videoMs, 1, 1100, 550);
    var frac = f.s.speed.fraction;
    var shift = frac > 0.86 && sweep >= 1;
    var flashOn = blink(f.videoMs, 200);
    var on = sweep < 1 ? Math.round(Math.sin(Math.PI * sweep) * LIGHTS) : Math.round(frac * LIGHTS);
    ctx.save();
    ctx.translate(0, slide);
    for (var k = 0; k < LIGHTS; k++) {
      var c = shift ? RED : k < 5 ? GREEN : k < 10 ? YELLOW : RED;
      var isOn = shift ? flashOn : k < on;
      var cx = 960 + (k - 7) * 50;
      ctx.fillStyle = col(isOn ? c : UNLIT);
      if (isOn) shadow(10, 0, c); else noShadow();
      ctx.beginPath(); ctx.arc(cx, 800, 15, 0, Math.PI * 2); ctx.fill();
      noShadow();
      ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Broadcast (BroadcastStyle.kt) ----------

  function drawBroadcast(f, p) {
    var SHADOW = 0x59000000;

    // LIVE bug
    faded(easeOut(progress(f.videoMs, 0, 400, 100)), function () {
      shadow(12, 5, SHADOW);
      ctx.fillStyle = col(p.alert); ctx.fillRect(60, 50, 130, 52);
      ctx.fillStyle = col(p.dark); ctx.fillRect(190, 50, 130, 52);
      noShadow();
      ctx.fillStyle = blink(f.videoMs, 1000) ? "#fff" : "rgba(255,255,255,.353)";
      ctx.beginPath(); ctx.arc(86, 76, 8, 0, Math.PI * 2); ctx.fill();
      text("LIVE", 102, 90, "italic", 36, 0xFFFFFFFF);
      text(f.s.elapsed.display, 255, 88, "mono", 30, 0xFFFFFFFF, "center");
    });

    // Distance tag
    faded(easeOut(progress(f.videoMs, 0, 400, 100)), function () {
      shadow(12, 5, SHADOW);
      ctx.fillStyle = col(p.dark); ctx.fillRect(1660, 50, 200, 52);
      noShadow();
      var numW = measure(f.s.dist.display, "bold", 30), unitW = measure("KM", "bold", 20);
      var x = 1760 - (numW + 6 + unitW) / 2;
      text(f.s.dist.display, x, 88, "bold", 30, 0xFFFFFFFF);
      text("KM", x + numW + 6, 88, "bold", 20, p.accent);
    });

    /** A slanted block, wiped in left to right with an accent bar on its edge. */
    function block(index, x, y, w, h, color, content) {
      var raw = progress(f.videoMs, index, 450, 250, 130);
      if (raw <= 0) return;
      var e = easeOut(raw), lean = h * 0.25, revealW = (w + 60) * e;
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 30, y - 12, revealW, h + 36); ctx.clip();
      shadow(12, 5, SHADOW);
      ctx.fillStyle = col(color);
      ctx.fill(slanted(x, y, w, h, lean));
      noShadow();
      content();
      ctx.restore();
      if (raw < 1) {
        var edge = x - 30 + revealW;
        ctx.fillStyle = col(p.accent);
        ctx.fill(slanted(edge - lean, y - 6, 14 + lean, h + 12, lean));
      }
    }

    block(1, 80, 856, 500, 80, p.primary, function () {
      ctx.fillStyle = col(p.accent);
      ctx.fill(slanted(80, 856, 32, 80, 20));
      var size = Math.min(50, 50 * 430 / Math.max(1, measure(RIDE_NAME, "italic", 50, 1)));
      text(RIDE_NAME, 126, 896 + size * 0.32, "italic", size, p.onPrimary, "left", 1);
    });
    block(2, 80, 944, 470, 44, p.dark, function () {
      text(RIDE_DATE, 110, 975, "semi", 24, 0xFFE6EBF2, "left", 3);
    });
    block(3, 598, 856, 256, 80, p.accent, function () {
      text(f.s.speed.display, 636, 924, "italic", 72, p.onAccent);
      text("KM/H", 820, 892, "bold", 20, p.onAccent, "right");
    });
    var grade = f.s.grade.value;
    block(4, 872, 856, 330, 80, p.light, function () {
      text("GRADIENT", 912, 886, "bold", 18, p.onLight, "left", 4);
      text((grade < -0.05 ? "−" : "") + Math.abs(grade).toFixed(1) + "%", 910, 928, "italic", 46, p.onLight);
      var h = Math.min(64, Math.abs(grade) * 3.4);
      ctx.fillStyle = col(p.onLight);
      ctx.globalAlpha *= 225 / 255;
      ctx.beginPath();
      ctx.moveTo(1100, 934); ctx.lineTo(1176, 934);
      if (grade < 0) ctx.lineTo(1100, 934 - h); else ctx.lineTo(1176, 934 - h);
      ctx.closePath(); ctx.fill();
    });
    block(5, 1220, 856, 230, 80, p.alert, function () {
      heart(1262, 896, f.beat * 1.7, 0xFFFFFFFF);
      text(f.s.hr.display, 1292, 922, "italic", 58, 0xFFFFFFFF);
      text("BPM", 1420, 892, "bold", 18, 0xFFFFFFFF, "right");
    });
  }

  // ---------- Jump callout (DesignRenderer.kt) ----------

  function calloutLook(style, p) {
    if (style === "clean") return { background: 0, ink: p.ink, accent: p.heart, slanted: false, shadow: p.shadow };
    if (style === "race") return { background: 0xF0101112, ink: 0xFFFFFFFF, accent: p.accent, slanted: true, shadow: 0 };
    return { background: p.primary, ink: p.onPrimary, accent: p.accent, slanted: true, shadow: 0 };
  }

  function drawJump(f, look) {
    var ms = f.s.trackMs;
    if (ms < JUMP.takeoffMs || ms > JUMP.landingMs + JUMP_HOLD_MS) return;
    var inAir = ms < JUMP.landingMs;
    var sinceTakeoff = ms - JUMP.takeoffMs, sinceLanding = ms - JUMP.landingMs;
    var pop = easeBack(clamp01(sinceTakeoff / 250));
    var fade = inAir ? 1 : clamp01(1 - (sinceLanding - (JUMP_HOLD_MS - 500)) / 500);
    if (pop <= 0 || fade <= 0) return;
    var airS = (inAir ? sinceTakeoff : JUMP.airtimeMs) / 1000;

    faded(fade, function () {
      ctx.save();
      ctx.translate(960, 220); ctx.scale(pop, pop); ctx.translate(-960, -220);
      if (look.background) {
        shadow(14, 6, 0x66000000);
        ctx.fillStyle = col(look.background);
        if (look.slanted) ctx.fill(slanted(710, 160, 500, 120, 26)); else roundRect(710, 160, 1210, 280, 18);
        noShadow();
        ctx.fillStyle = col(look.accent);
        if (look.slanted) ctx.fill(slanted(710, 160, 40, 120, 26)); else ctx.fillRect(710, 160, 12, 120);
      }
      var sh = look.shadow;
      text(inAir ? "IN THE AIR" : "AIRTIME", 750, 196, "bold", 20, look.accent, "left", 4, sh);
      var w = text(airS.toFixed(2), 748, 262, "italic", 72, look.ink, "left", 0, sh);
      text("s", 752 + w, 262, "bold", 30, look.ink, "left", 0, sh);
      if (!inAir) {
        [JUMP.heightM.toFixed(1) + " m HIGH", JUMP.landingG.toFixed(1) + " g LANDING"].forEach(function (s, i) {
          text(s, 1180, 202 + i * 30, "bold", 24, look.ink, "right", 1, sh);
        });
      }
      ctx.restore();
    });
  }

  // ---------- The "footage": a POV run down an alpine trail ----------

  function resize() {
    var r = frame.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
  }

  function ridge(offset, baseY, amp, seed, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W + 8; x += 8) {
      var u = (x + offset) / W;
      ctx.lineTo(x, baseY - amp * (0.55 * Math.sin(u * 5.1 + seed) + 0.3 * Math.sin(u * 11.7 + seed * 2) + 0.15 * Math.sin(u * 23 + seed * 3)));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  var travelled = 0;

  function drawScene(t, dt) {
    travelled += speedAt(t) / 3.6 * dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    noShadow();

    var air = inJump(t) ? Math.sin((t - JUMP_AT) / JUMP_LEN * Math.PI) : 0;
    var bob = Math.sin(travelled * 1.9) * H * 0.006 + Math.sin(travelled * 5.3) * H * 0.002;
    var roll = lateralG(t) * 0.035 * (1 - air);
    var horizon = H * 0.46 + bob + air * H * 0.09;

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(roll);
    ctx.translate(-W / 2, -H / 2);

    var sky = ctx.createLinearGradient(0, -H * 0.1, 0, horizon);
    sky.addColorStop(0, "#2b4d78");
    sky.addColorStop(0.65, "#8fa7c2");
    sky.addColorStop(1, "#f2c28f");
    ctx.fillStyle = sky;
    ctx.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);

    var sun = ctx.createRadialGradient(W * 0.72, horizon - H * 0.12, 0, W * 0.72, horizon - H * 0.12, H * 0.5);
    sun.addColorStop(0, "rgba(255,236,200,.95)");
    sun.addColorStop(0.08, "rgba(255,214,160,.55)");
    sun.addColorStop(1, "rgba(255,200,140,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);

    var p = travelled;
    ridge(p * 0.4, horizon - H * 0.02, H * 0.2, 1.3, "#7d8fb0");
    ridge(p * 1.1, horizon + H * 0.03, H * 0.14, 4.1, "#56668a");
    ridge(p * 2.6, horizon + H * 0.08, H * 0.09, 2.2, "#3a4a62");

    var ground = ctx.createLinearGradient(0, horizon + H * 0.05, 0, H * 1.1);
    ground.addColorStop(0, "#3f5a3a");
    ground.addColorStop(1, "#22331f");
    ctx.fillStyle = ground;
    ctx.fillRect(-W * 0.1, horizon + H * 0.06, W * 1.2, H);

    var vx = W * 0.5 + lateralG(t) * W * 0.12;
    var top = horizon + H * 0.07;
    ctx.fillStyle = "#8b6c4c";
    ctx.beginPath();
    ctx.moveTo(vx - W * 0.012, top);
    ctx.quadraticCurveTo(W * 0.5 + (vx - W * 0.5) * 0.3 - W * 0.12, H * 0.8, W * 0.12, H * 1.1);
    ctx.lineTo(W * 0.88, H * 1.1);
    ctx.quadraticCurveTo(W * 0.5 + (vx - W * 0.5) * 0.3 + W * 0.12, H * 0.8, vx + W * 0.012, top);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(60,44,30,.55)";
    for (var k = 0; k < 14; k++) {
      var z = ((k * 0.37 - travelled * 0.08) % 1 + 1) % 1;
      var depth = z * z;
      var y = top + (H * 1.1 - top) * depth;
      var spread = 0.02 + depth * 0.32;
      var cx = vx + (W * 0.5 - vx) * depth + ((k % 3) - 1) * W * spread * 0.9;
      ctx.beginPath();
      ctx.ellipse(cx, y, 1 + depth * W * 0.012, 0.6 + depth * H * 0.008, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var j = 0; j < 10; j++) {
      var zz = ((j * 0.19 + 0.05 - travelled * 0.035) % 1 + 1) % 1;
      var d2 = zz * zz;
      var side = j % 2 ? 1 : -1;
      var tx = vx + side * (W * 0.05 + d2 * W * 0.9) + (W * 0.5 - vx) * d2;
      var ty = top + (H * 1.1 - top) * d2;
      var th = H * (0.03 + d2 * 0.9);
      var tw = th * 0.32;
      ctx.fillStyle = d2 > 0.5 ? "#15241a" : "#1e3322";
      ctx.beginPath();
      ctx.moveTo(tx, ty - th);
      ctx.lineTo(tx - tw, ty);
      ctx.lineTo(tx + tw, ty);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    var v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- One frame ----------

  var style = frame.dataset.style || "broadcast";
  var colourway = 0;

  function drawFrame(t, dt) {
    drawScene(t, dt);

    var s = sampleAt(t);
    var f = { videoMs: t * 1000, s: s, beat: beatScale(t * 1000, s.hr.bpm) };
    var p = COLOURWAYS[style][colourway].p;
    sc = dpr * W / 1920;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    if (style === "clean") drawClean(f, p);
    else if (style === "race") drawRace(f, p);
    else drawBroadcast(f, p);
    drawJump(f, calloutLook(style, p));
    noShadow();
    if (hasSpacing) ctx.letterSpacing = "0px";
  }

  // ---------- Loop ----------

  var start = null, last = 0, visible = true, running = false;
  var STILL_T = 9;   // the frame shown when motion is reduced: every intro done

  function tick(now) {
    if (start === null) start = now;
    var t = ((now - start) / 1000) % LOOP;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    drawFrame(t, dt);
    running = visible;
    if (running) requestAnimationFrame(tick);
  }
  function run() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(tick);
  }
  function still() { travelled = 40; drawFrame(STILL_T, 0); }
  /** Replays the clip from the start, so a new style shows its intro. */
  function restart() {
    if (reduceMotion) { still(); return; }
    start = null;
    travelled = 0;
  }

  resize();
  if (window.ResizeObserver) {
    new ResizeObserver(function () { resize(); if (reduceMotion) still(); }).observe(frame);
  }

  // Canvas text needs the fonts loaded before the first frames draw.
  if (document.fonts && document.fonts.load) {
    ["italic 800 20px 'Barlow Condensed'", "600 20px 'Barlow Condensed'", "700 20px 'Barlow Condensed'", "20px 'Share Tech Mono'"]
      .forEach(function (font) { document.fonts.load(font).then(function () { if (reduceMotion) still(); }, function () {}); });
  }

  if (reduceMotion) {
    still();
  } else {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) run();
      }).observe(frame);
    }
    run();
  }

  // ---------- Style tabs and colourway chips ----------

  function tabGroup(selector, attr, onPick) {
    var buttons = document.querySelectorAll(selector);
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        buttons.forEach(function (o) { o.setAttribute("aria-selected", o === b ? "true" : "false"); });
        onPick(b.dataset[attr]);
      });
    });
  }

  var swatches = document.getElementById("swatches");
  function renderSwatches() {
    swatches.innerHTML = "";
    COLOURWAYS[style].forEach(function (cw, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", i === colourway ? "true" : "false");
      var dot = document.createElement("i");
      dot.style.background = "linear-gradient(135deg, " + col(cw.swatch[0]) + " 50%, " + col(cw.swatch[1]) + " 50%)";
      b.appendChild(dot);
      b.appendChild(document.createTextNode(cw.name));
      b.addEventListener("click", function () {
        colourway = i;
        renderSwatches();
        if (reduceMotion) still();
      });
      swatches.appendChild(b);
    });
  }
  renderSwatches();

  tabGroup(".demo-bar .tabs button", "style", function (s) {
    style = s;
    frame.dataset.style = s;
    colourway = 0;
    renderSwatches();
    restart();
  });

  // A link can open a style directly: overlayer…/#race
  var hash = location.hash.slice(1);
  var fromHash = /^[a-z]+$/.test(hash) && document.querySelector(".demo-bar .tabs button[data-style='" + hash + "']");
  if (fromHash) fromHash.click();

  // ---------- Pricing ----------

  // Suggested launch prices. Change them here.
  var PRICES = {
    year: ["$9", "per year"],
    month: ["$2.99", "per month"],
    life: ["$15", "one-time"]
  };
  var proPrice = document.getElementById("proPrice"), proPer = document.getElementById("proPer");
  tabGroup(".billing button", "bill", function (b) {
    proPrice.textContent = PRICES[b][0];
    proPer.textContent = PRICES[b][1];
  });

  // ---------- Copy email ----------

  var copy = document.getElementById("copy"), email = document.getElementById("email");
  if (copy && email) {
    copy.addEventListener("click", function () {
      function selectIt() {
        var r = document.createRange();
        r.selectNodeContents(email);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email.textContent).then(function () {
          copy.textContent = "Copied";
          setTimeout(function () { copy.textContent = "Copy"; }, 1600);
        }, selectIt);
      } else {
        selectIt();
      }
    });
  }
})();
