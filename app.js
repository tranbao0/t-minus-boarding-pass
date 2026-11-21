(() => {
  const PALETTES = {
    slate: {
      bgTop: "#14161a",
      bgBot: "#14161a",
      headerText: "#f8fafc",
      headerAccent: "#ef4444",
      ruleTop: "rgba(255,255,255,0.85)",
      ruleBot: "rgba(255,255,255,0.18)",
      notch: "#14161a",
      cardShadow: "rgba(0,0,0,0.45)",
      cardBorder: null
    },
    cobalt: {
      bgTop: "#163a70",
      bgBot: "#102a54",
      headerText: "#ffffff",
      headerAccent: "#93c5fd",
      ruleTop: "rgba(255,255,255,0.88)",
      ruleBot: "rgba(255,255,255,0.22)",
      notch: "#133160",
      cardShadow: "rgba(7,18,38,0.42)",
      cardBorder: null
    },
    frost: {
      bgTop: "#eef2f6",
      bgBot: "#e3e8f0",
      headerText: "#0f1115",
      headerAccent: "#dc2626",
      ruleTop: "#0f1115",
      ruleBot: "rgba(15,17,21,0.18)",
      notch: "#e8ecf2",
      cardShadow: "rgba(15,23,42,0.10)",
      cardBorder: "rgba(15,17,21,0.12)"
    }
  };

  const pluralRules = new Intl.PluralRules("en-US");
  const stampFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });
  const longDateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });
  const lockDateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

  function dateOffsetISO(daysAhead) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + daysAhead);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const PRESETS = {
    tokyo: {
      fromCode: "SFO",
      fromCity: "San Francisco",
      toCode: "HND",
      toCity: "Tokyo",
      daysAhead: 14,
      flight: "NH007",
      depTime: "14:25",
      gate: "A14",
      milestones: [
        { days: 21, label: "Check passport & visa", done: true },
        { days: 14, label: "Buy eSIM & IC card", done: false },
        { days: 7, label: "Pack layers & adapter", done: false },
        { days: 3, label: "Download offline maps", done: false },
        { days: 1, label: "Check in & charge gear", done: false }
      ]
    },
    london: {
      fromCode: "JFK",
      fromCity: "New York",
      toCode: "LHR",
      toCity: "London",
      daysAhead: 21,
      flight: "BA178",
      depTime: "19:30",
      gate: "B22",
      milestones: [
        { days: 30, label: "Confirm visa & housing", done: true },
        { days: 21, label: "Set UK bank & SIM", done: false },
        { days: 14, label: "Register course modules", done: false },
        { days: 7, label: "Pack coat & plug kit", done: false },
        { days: 1, label: "Print arrival docs", done: false }
      ]
    },
    zurich: {
      fromCode: "ORD",
      fromCity: "Chicago",
      toCode: "ZRH",
      toCity: "Zurich",
      daysAhead: 14,
      flight: "LX009",
      depTime: "19:10",
      gate: "M12",
      milestones: [
        { days: 21, label: "Book Swiss Rail Pass", done: true },
        { days: 14, label: "Reserve scenic seats", done: false },
        { days: 7, label: "Pack thermals & gloves", done: false },
        { days: 3, label: "Load SBB mobile app", done: false },
        { days: 1, label: "Check in & weigh bag", done: false }
      ]
    }
  };

  let state = {
    activePreset: "tokyo",
    device: "phone",
    palette: "slate",
    showOsChrome: true,
    showSafeZones: false,
    fromCode: PRESETS.tokyo.fromCode,
    fromCity: PRESETS.tokyo.fromCity,
    toCode: PRESETS.tokyo.toCode,
    toCity: PRESETS.tokyo.toCity,
    date: dateOffsetISO(PRESETS.tokyo.daysAhead),
    flight: PRESETS.tokyo.flight,
    depTime: PRESETS.tokyo.depTime,
    gate: PRESETS.tokyo.gate,
    reminderTime: "09:00",
    dailyPing: true,
    milestones: PRESETS.tokyo.milestones.map((m) => ({ ...m }))
  };

  let lastDeleted = null;

  const $ = (id) => document.getElementById(id);

  function parseISODate(iso) {
    const parts = (iso || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
      return parseISODate(dateOffsetISO(14));
    }
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function daysUntilTarget() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    const target = parseISODate(state.date);
    return Math.round((target - today) / 86400000);
  }

  function formatStampDate(iso) {
    return stampFormatter.format(parseISODate(iso)).toUpperCase();
  }

  function formatLongDate(iso) {
    return longDateFormatter.format(parseISODate(iso));
  }

  function formatTag(days) {
    const n = Math.max(0, Math.min(999, Number(days) || 0));
    return `T-${String(n).padStart(2, "0")}`;
  }

  function formatTopCountdown(diff) {
    if (diff > 0) {
      const unit = pluralRules.select(diff) === "one" ? "DAY" : "DAYS";
      return `T-${diff} ${unit}`;
    }
    if (diff === 0) return "BOARDING TODAY";
    return `DEPARTED +${Math.abs(diff)}D`;
  }

  function buildBarcodeWidths(seedStr) {
    let hash = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      hash ^= seedStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const bars = [2, 1, 1, 2];
    for (let i = 0; i < 48; i++) {
      hash ^= hash << 13;
      hash ^= hash >>> 17;
      hash ^= hash << 5;
      bars.push((Math.abs(hash) % 3) + 1);
    }
    bars.push(2, 1, 1, 2);
    return bars;
  }

  function renderBarcodeSvg(svgEl, seedStr, color) {
    const bars = buildBarcodeWidths(seedStr);
    const totalUnits = bars.reduce((a, b) => a + b, 0);
    const vb = svgEl.getAttribute("viewBox").split(" ").map(Number);
    const unit = vb[2] / totalUnits;
    let x = 0;
    let rects = "";
    bars.forEach((w, idx) => {
      if (idx % 2 === 0) {
        rects += `<rect x="${x.toFixed(2)}" y="0" width="${(w * unit).toFixed(2)}" height="${vb[3]}" fill="${color}"/>`;
      }
      x += w * unit;
    });
    svgEl.innerHTML = rects;
  }

  function sortedMilestones() {
    return state.milestones
      .map((m, idx) => ({ ...m, _idx: idx }))
      .sort((a, b) => b.days - a.days);
  }

  function renderLiveClocks() {
    const now = new Date();
    const h12 = now.getHours() % 12 || 12;
    const mins = String(now.getMinutes()).padStart(2, "0");
    const clockStr = `${h12}:${mins}`;
    const dateStr = lockDateFormatter.format(now);
    document.querySelectorAll(".live-clock-big, .live-clock-mini").forEach((el) => {
      el.textContent = clockStr;
    });
    document.querySelectorAll(".live-date-full").forEach((el) => {
      el.textContent = dateStr;
    });
  }

  function renderMilestoneList(container) {
    const ordered = sortedMilestones();
    const nextIdx = ordered.find((m) => !m.done)?._idx ?? -1;
    container.innerHTML = ordered
      .map((m) => {
        const cls = m.done ? "m-row done" : m._idx === nextIdx ? "m-row next" : "m-row";
        const label = m.label.trim() || "Untitled step";
        return `
          <button type="button" class="${cls}" data-toggle-idx="${m._idx}" aria-pressed="${m.done}">
            <span class="m-box" aria-hidden="true">${m.done ? "&#10003;" : ""}</span>
            <span class="m-tminus">${formatTag(m.days)}</span>
            <span class="m-text">${escapeHtml(label)}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderMilestoneEditor() {
    const editor = $("milestoneEditor");
    editor.innerHTML = state.milestones
      .map((m, idx) => `
        <div class="me-row">
          <input type="checkbox" class="me-check" data-edit-done="${idx}" ${m.done ? "checked" : ""} aria-label="Mark milestone ${idx + 1} done">
          <input type="number" inputmode="numeric" class="me-days" data-edit-days="${idx}" min="0" max="365" value="${m.days}" aria-label="Days before departure for milestone ${idx + 1}">
          <input type="text" class="me-label" data-edit-label="${idx}" maxlength="32" value="${escapeAttr(m.label)}" placeholder="Short action…" autocomplete="off" aria-label="Milestone ${idx + 1} label">
          <button type="button" class="me-del" data-del-idx="${idx}" title="Remove milestone" aria-label="Remove milestone ${idx + 1}">&times;</button>
        </div>
      `)
      .join("");
  }

  function renderPrompts() {
    const ordered = sortedMilestones();
    const longDate = formatLongDate(state.date);
    const fromCode = (state.fromCode.trim() || "SFO").toUpperCase();
    const toCode = (state.toCode.trim() || "HND").toUpperCase();
    const fromCity = state.fromCity.trim() || "Origin";
    const toCity = state.toCity.trim() || "Destination";
    const listText = ordered.map((m) => `- ${formatTag(m.days)}: ${m.label.trim() || "Untitled step"}`).join("\n");

    $("planPrompt").textContent =
      `I am planning for my trip from ${fromCity} (${fromCode}) to ${toCity} (${toCode}) departing ${longDate}. ` +
      `Ask me three quick questions about my schedule, then build a backward T-minus plan (${ordered.map((m) => formatTag(m.days)).join(", ")}). ` +
      `Keep each milestone under five words.`;

    $("designPrompt").textContent =
      `Design a minimalist Swiss boarding pass lock screen for a ${state.device === "phone" ? "9:19.5 phone" : "16:9 laptop"} screen on a matte ${state.palette} background. ` +
      `Leave the top 30% clean for the native clock and bottom 14% clean for buttons. ` +
      `Show route ${fromCode} -> ${toCode}, date stamp ${formatStampDate(state.date)}, flight ${(state.flight.trim() || "NH007").toUpperCase()}, and these ordered milestones with checkboxes:\n${listText}`;

    $("reminderPrompt").textContent =
      `Add each milestone from my ${fromCode} to ${toCode} countdown (${longDate}) to Google Calendar at ${state.reminderTime}, ` +
      `and send a daily check-in at ${state.reminderTime} with any step due today or tomorrow.`;
  }

  function renderAll() {
    const diff = daysUntilTarget();
    const topCountdown = formatTopCountdown(diff);
    const stamp = formatStampDate(state.date);
    const fromCode = (state.fromCode.trim() || "SFO").toUpperCase();
    const toCode = (state.toCode.trim() || "HND").toUpperCase();
    const fromCity = (state.fromCity.trim() || "ORIGIN").toUpperCase();
    const toCity = (state.toCity.trim() || "DESTINATION").toUpperCase();
    const flight = (state.flight.trim() || "NH007").toUpperCase();
    const depTime = state.depTime.trim() || "14:25";
    const gate = (state.gate.trim() || "A14").toUpperCase();
    const doneCount = state.milestones.filter((m) => m.done).length;
    const totalCount = state.milestones.length;

    ["phoneScreen", "desktopScreen"].forEach((id) => {
      const el = $(id);
      el.classList.remove("palette-slate", "palette-cobalt", "palette-frost");
      el.classList.add(`palette-${state.palette}`);
      el.classList.toggle("hide-chrome", !state.showOsChrome);
      el.classList.toggle("show-safe", state.showSafeZones);
    });

    $("phoneTopTminus").textContent = topCountdown;
    $("pFromCode").textContent = fromCode;
    $("pFromCity").textContent = fromCity;
    $("pToCode").textContent = toCode;
    $("pToCity").textContent = toCity;
    $("pStamp").textContent = stamp;
    $("pFlight").textContent = flight;
    $("pDepTime").textContent = depTime;
    $("pGate").textContent = gate;
    $("pStubCode").textContent = flight;

    $("dTopTminus").textContent = topCountdown;
    $("dFromCode").textContent = fromCode;
    $("dFromCity").textContent = fromCity;
    $("dToCode").textContent = toCode;
    $("dToCity").textContent = toCity;
    $("dStamp").textContent = stamp;
    $("dFlight").textContent = flight;
    $("dDepTime").textContent = depTime;
    $("dGate").textContent = gate;
    $("dProgress").textContent = `${doneCount} / ${totalCount}`;
    $("dSideCount").textContent = `${doneCount}/${totalCount}`;
    $("dStubCode").textContent = `${fromCode}-${toCode}`;
    $("dTripName").textContent = `${toCity} DEPARTURE PASS`;

    $("liveSummaryMeta").textContent = `${topCountdown} \u00b7 ${doneCount} of ${totalCount} done`;

    const seed = `${fromCode}-${toCode}-${state.date}-${flight}`;
    renderBarcodeSvg($("phoneBarcode"), seed, "#0f1115");
    renderBarcodeSvg($("desktopBarcode"), seed, "#0f1115");

    renderMilestoneList($("phoneMilestones"));
    renderMilestoneList($("desktopMilestones"));

    $("phonePreviewWrap").classList.toggle("hidden", state.device !== "phone");
    $("desktopPreviewWrap").classList.toggle("hidden", state.device !== "desktop");
    $("downloadPngLabel").textContent =
      state.device === "phone" ? "Download Phone PNG" : "Download Laptop PNG";

    document.querySelectorAll(".seg-btn").forEach((b) => {
      const active = b.dataset.device === state.device;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".swatch").forEach((b) => {
      const active = b.dataset.palette === state.palette;
      b.classList.toggle("active", active);
      b.setAttribute("aria-checked", String(active));
    });
    document.querySelectorAll(".preset-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.preset === state.activePreset);
    });

    renderPrompts();
  }

  function syncInputsFromState() {
    $("inFromCode").value = state.fromCode;
    $("inFromCity").value = state.fromCity;
    $("inToCode").value = state.toCode;
    $("inToCity").value = state.toCity;
    $("inDate").value = state.date;
    $("inDepTime").value = state.depTime;
    $("inFlight").value = state.flight;
    $("inGate").value = state.gate;
    $("inReminderTime").value = state.reminderTime;
    $("inDailyPing").checked = state.dailyPing;
    renderMilestoneEditor();
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCanvasBarcode(ctx, x, y, w, h, seedStr, color) {
    const bars = buildBarcodeWidths(seedStr);
    const total = bars.reduce((a, b) => a + b, 0);
    const unit = w / total;
    let cx = x;
    ctx.fillStyle = color;
    bars.forEach((bw, idx) => {
      if (idx % 2 === 0) {
        ctx.fillRect(cx, y, Math.max(1, bw * unit), h);
      }
      cx += bw * unit;
    });
  }

  function drawStamp(ctx, text, cx, cy, fontSize, padX, padY, borderW) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-4 * Math.PI) / 180);
    ctx.font = `800 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
    const tw = ctx.measureText(text).width;
    const bw = tw + padX * 2;
    const bh = fontSize + padY * 2;
    roundedRectPath(ctx, -bw / 2, -bh / 2, bw, bh, Math.round(fontSize * 0.35));
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = borderW;
    ctx.stroke();
    ctx.fillStyle = "#dc2626";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 2);
    ctx.restore();
  }

  function drawClippedText(ctx, text, x, y, maxW) {
    if (ctx.measureText(text).width <= maxW) {
      ctx.fillText(text, x, y);
      return ctx.measureText(text).width;
    }
    let trimmed = text;
    while (trimmed.length > 1 && ctx.measureText(trimmed + "\u2026").width > maxW) {
      trimmed = trimmed.slice(0, -1);
    }
    const out = trimmed + "\u2026";
    ctx.fillText(out, x, y);
    return ctx.measureText(out).width;
  }

  async function renderPhonePng() {
    await document.fonts.ready;
    const W = 1290;
    const H = 2796;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[state.palette];
    const topCountdown = formatTopCountdown(daysUntilTarget());
    const fromCode = (state.fromCode.trim() || "SFO").toUpperCase();
    const toCode = (state.toCode.trim() || "HND").toUpperCase();
    const fromCity = (state.fromCity.trim() || "ORIGIN").toUpperCase();
    const toCity = (state.toCity.trim() || "DESTINATION").toUpperCase();
    const flight = (state.flight.trim() || "NH007").toUpperCase();
    const depTime = state.depTime.trim() || "14:25";
    const gate = (state.gate.trim() || "A14").toUpperCase();
    const stamp = formatStampDate(state.date);
    const ordered = sortedMilestones().slice(0, 6);
    const nextIdx = ordered.find((m) => !m.done)?._idx ?? -1;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, pal.bgTop);
    bgGrad.addColorStop(1, pal.bgBot);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const ruleX = 96;
    const ruleW = W - ruleX * 2;
    const ruleY = 835;
    ctx.fillStyle = pal.ruleTop;
    ctx.fillRect(ruleX, ruleY, ruleW, 6);
    ctx.fillStyle = pal.ruleBot;
    ctx.fillRect(ruleX, ruleY + 64, ruleW, 3);

    ctx.font = '700 32px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = pal.headerText;
    ctx.fillText("BOARDING PASS", ruleX, ruleY + 35);

    ctx.textAlign = "right";
    ctx.fillStyle = pal.headerAccent;
    ctx.fillText(topCountdown, ruleX + ruleW, ruleY + 35);

    const cardX = 84;
    const cardW = W - cardX * 2;
    const rowH = 112;
    const listPadTop = 44;
    const listPadBot = 36;
    const headH = 345;
    const stubH = 148;
    const stripeH = 22;
    const cardH = stripeH + headH + listPadTop + ordered.length * rowH + listPadBot + stubH;
    const cardY = Math.round(970 + Math.max(0, (1370 - cardH) / 2));
    const cardR = 52;

    ctx.save();
    ctx.shadowColor = pal.cardShadow;
    ctx.shadowBlur = 72;
    ctx.shadowOffsetY = 28;
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.clip();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cardX, cardY, cardW, cardH);

    ctx.fillStyle = "#dc2626";
    ctx.fillRect(cardX, cardY, cardW, stripeH);

    const padX = 64;
    const headerTop = cardY + stripeH;
    ctx.fillStyle = "#0f1115";
    ctx.font = '800 122px "Inter", -apple-system, sans-serif';
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(fromCode, cardX + padX, headerTop + 44);

    ctx.textAlign = "right";
    ctx.fillText(toCode, cardX + cardW - padX, headerTop + 44);

    ctx.fillStyle = "#64748b";
    ctx.font = '600 32px "Inter", -apple-system, sans-serif';
    ctx.textAlign = "left";
    ctx.fillText(fromCity, cardX + padX, headerTop + 178);
    ctx.textAlign = "right";
    ctx.fillText(toCity, cardX + cardW - padX, headerTop + 178);

    drawStamp(ctx, stamp, W / 2, headerTop + 114, 38, 28, 16, 6);

    const metaY = headerTop + 246;
    ctx.fillStyle = "#eef2f6";
    ctx.fillRect(cardX + padX, metaY, cardW - padX * 2, 3);

    ctx.textBaseline = "top";
    const metaTextY = metaY + 26;

    ctx.textAlign = "left";
    ctx.font = '600 31px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "#64748b";
    ctx.fillText("FLT ", cardX + padX, metaTextY);
    const fltW = ctx.measureText("FLT ").width;
    ctx.fillStyle = "#0f1115";
    ctx.font = '700 31px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(flight, cardX + padX + fltW, metaTextY);

    ctx.font = '600 31px "JetBrains Mono", ui-monospace, monospace';
    const depLblW = ctx.measureText("DEP ").width;
    ctx.font = '700 31px "JetBrains Mono", ui-monospace, monospace';
    const depValW = ctx.measureText(depTime).width;
    const depStart = W / 2 - (depLblW + depValW) / 2;
    ctx.textAlign = "left";
    ctx.font = '600 31px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "#64748b";
    ctx.fillText("DEP ", depStart, metaTextY);
    ctx.font = '700 31px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "#0f1115";
    ctx.fillText(depTime, depStart + depLblW, metaTextY);

    ctx.font = '700 31px "JetBrains Mono", ui-monospace, monospace';
    const gateValW = ctx.measureText(gate).width;
    ctx.font = '600 31px "JetBrains Mono", ui-monospace, monospace';
    const gateLblW = ctx.measureText("GATE ").width;
    const gateStart = cardX + cardW - padX - gateLblW - gateValW;
    ctx.textAlign = "left";
    ctx.fillStyle = "#64748b";
    ctx.fillText("GATE ", gateStart, metaTextY);
    ctx.font = '700 31px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "#0f1115";
    ctx.fillText(gate, gateStart + gateLblW, metaTextY);

    const perfY = headerTop + headH;
    ctx.save();
    ctx.strokeStyle = "rgba(15,17,21,0.22)";
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(cardX + 32, perfY);
    ctx.lineTo(cardX + cardW - 32, perfY);
    ctx.stroke();
    ctx.restore();

    let rowY = perfY + listPadTop;
    const maxLabelW = cardW - padX * 2 - 210;
    ordered.forEach((m) => {
      const cy = rowY + rowH / 2;
      const boxSize = 48;
      const boxX = cardX + padX;
      const boxY = cy - boxSize / 2;

      roundedRectPath(ctx, boxX, boxY, boxSize, boxSize, 11);
      if (m.done) {
        ctx.fillStyle = "#0f1115";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(boxX + 12, boxY + 25);
        ctx.lineTo(boxX + 21, boxY + 34);
        ctx.lineTo(boxX + 37, boxY + 15);
        ctx.stroke();
      } else {
        ctx.strokeStyle = m._idx === nextIdx ? "#dc2626" : "#0f1115";
        ctx.lineWidth = 5;
        ctx.stroke();
      }

      ctx.font = '800 35px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = m.done ? "#94a3b8" : "#dc2626";
      ctx.fillText(formatTag(m.days), boxX + boxSize + 30, cy + 2);

      ctx.font = '600 41px "Inter", -apple-system, sans-serif';
      ctx.fillStyle = m.done ? "#94a3b8" : "#0f1115";
      const labelX = boxX + boxSize + 158;
      const lw = drawClippedText(ctx, m.label.trim() || "Untitled step", labelX, cy + 2, maxLabelW);
      if (m.done) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(labelX, cy + 1, lw, 3);
      }

      rowY += rowH;
    });

    const stubY = cardY + cardH - stubH;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(cardX, stubY, cardW, stubH);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(cardX, stubY, cardW, 3);

    const seed = `${fromCode}-${toCode}-${state.date}-${flight}`;
    drawCanvasBarcode(ctx, cardX + padX, stubY + 38, cardW - padX * 2 - 170, 72, seed, "#0f1115");

    ctx.font = '700 33px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(flight, cardX + cardW - padX, stubY + stubH / 2 + 2);

    ctx.restore();

    if (pal.cardBorder) {
      roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.strokeStyle = pal.cardBorder;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.fillStyle = pal.notch;
    ctx.beginPath();
    ctx.arc(cardX, perfY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cardX + cardW, perfY, 26, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toDataURL("image/png");
  }

  async function renderDesktopPng() {
    await document.fonts.ready;
    const W = 3840;
    const H = 2160;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[state.palette];
    const topCountdown = formatTopCountdown(daysUntilTarget());
    const fromCode = (state.fromCode.trim() || "SFO").toUpperCase();
    const toCode = (state.toCode.trim() || "HND").toUpperCase();
    const fromCity = (state.fromCity.trim() || "ORIGIN").toUpperCase();
    const toCity = (state.toCity.trim() || "DESTINATION").toUpperCase();
    const flight = (state.flight.trim() || "NH007").toUpperCase();
    const depTime = state.depTime.trim() || "14:25";
    const gate = (state.gate.trim() || "A14").toUpperCase();
    const stamp = formatStampDate(state.date);
    const ordered = sortedMilestones().slice(0, 6);
    const doneCount = state.milestones.filter((m) => m.done).length;
    const totalCount = state.milestones.length;
    const nextIdx = ordered.find((m) => !m.done)?._idx ?? -1;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, pal.bgTop);
    bgGrad.addColorStop(1, pal.bgBot);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const tx = 440;
    const ty = 690;
    const tw = 2960;
    const th = 1070;
    const tr = 44;
    const splitX = tx + Math.round(tw * 0.575);

    ctx.save();
    ctx.shadowColor = pal.cardShadow;
    ctx.shadowBlur = 90;
    ctx.shadowOffsetY = 34;
    roundedRectPath(ctx, tx, ty, tw, th, tr);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRectPath(ctx, tx, ty, tw, th, tr);
    ctx.clip();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(tx, ty, tw, th);

    const stripeH = 24;
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(tx, ty, tw, stripeH);

    const lx = tx + 88;
    const lw = splitX - tx - 176;
    const topY = ty + stripeH + 58;

    ctx.font = '800 34px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = "#0f1115";
    ctx.fillText("BOARDING PASS", lx, topY);
    ctx.textAlign = "right";
    ctx.fillStyle = "#dc2626";
    ctx.fillText(topCountdown, lx + lw, topY);

    ctx.fillStyle = "#0f1115";
    ctx.fillRect(lx, topY + 54, lw, 6);

    const routeY = topY + 128;
    ctx.font = '800 184px "Inter", -apple-system, sans-serif';
    ctx.fillStyle = "#0f1115";
    ctx.textAlign = "left";
    ctx.fillText(fromCode, lx, routeY);
    ctx.textAlign = "right";
    ctx.fillText(toCode, lx + lw, routeY);

    ctx.font = '600 38px "Inter", -apple-system, sans-serif';
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";
    ctx.fillText(fromCity, lx, routeY + 206);
    ctx.textAlign = "right";
    ctx.fillText(toCity, lx + lw, routeY + 206);

    const midX = lx + lw / 2;
    drawStamp(ctx, stamp, midX, routeY + 86, 42, 32, 18, 6);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(midX - 180, routeY + 166, 360, 4);

    const metaY = routeY + 318;
    ctx.fillStyle = "#eef2f6";
    ctx.fillRect(lx, metaY, lw, 4);

    const cols = [
      ["FLIGHT", flight],
      ["DEPARTURE", depTime],
      ["GATE", gate],
      ["PROGRESS", `${doneCount} / ${totalCount}`]
    ];
    cols.forEach(([k, v], i) => {
      const cx = lx + (lw / 4) * i;
      ctx.textAlign = "left";
      ctx.font = '600 28px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = "#64748b";
      ctx.fillText(k, cx, metaY + 32);
      ctx.font = '700 44px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = "#0f1115";
      ctx.fillText(v, cx, metaY + 74);
    });

    const stubH = 186;
    const stubY = ty + th - stubH;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(tx, stubY, splitX - tx, stubH);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(tx, stubY, splitX - tx, 4);

    const seed = `${fromCode}-${toCode}-${state.date}-${flight}`;
    drawCanvasBarcode(ctx, lx, stubY + 46, lw - 260, 94, seed, "#0f1115");

    ctx.font = '700 36px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${fromCode}-${toCode}`, lx + lw, stubY + stubH / 2 + 2);

    ctx.save();
    ctx.strokeStyle = "rgba(15,17,21,0.24)";
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    ctx.moveTo(splitX, ty + stripeH + 20);
    ctx.lineTo(splitX, ty + th - 20);
    ctx.stroke();
    ctx.restore();

    const rx = splitX + 76;
    const rw = tx + tw - rx - 76;

    ctx.textBaseline = "top";
    ctx.font = '800 34px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = "left";
    ctx.fillStyle = "#0f1115";
    ctx.fillText("PRE-FLIGHT PLAN", rx, topY);
    ctx.textAlign = "right";
    ctx.fillStyle = "#dc2626";
    ctx.fillText(`${doneCount}/${totalCount}`, rx + rw, topY);

    ctx.fillStyle = "#0f1115";
    ctx.fillRect(rx, topY + 54, rw, 6);

    const listZoneTop = topY + 92;
    const listZoneBot = ty + th - 124;
    const listZoneH = listZoneBot - listZoneTop;
    const rRowH = Math.min(138, Math.floor(listZoneH / Math.max(1, ordered.length)));
    let ry = Math.round(listZoneTop + (listZoneH - rRowH * ordered.length) / 2);
    const maxRightLabelW = rw - 200;

    ordered.forEach((m) => {
      const cy = ry + rRowH / 2;
      const bSize = 46;
      const bx = rx;
      const by = cy - bSize / 2;

      roundedRectPath(ctx, bx, by, bSize, bSize, 10);
      if (m.done) {
        ctx.fillStyle = "#0f1115";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(bx + 11, by + 24);
        ctx.lineTo(bx + 20, by + 33);
        ctx.lineTo(bx + 35, by + 14);
        ctx.stroke();
      } else {
        ctx.strokeStyle = m._idx === nextIdx ? "#dc2626" : "#0f1115";
        ctx.lineWidth = 5;
        ctx.stroke();
      }

      ctx.font = '800 34px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = m.done ? "#94a3b8" : "#dc2626";
      ctx.fillText(formatTag(m.days), bx + bSize + 28, cy + 2);

      ctx.font = '600 40px "Inter", -apple-system, sans-serif';
      ctx.fillStyle = m.done ? "#94a3b8" : "#0f1115";
      const labelX = bx + bSize + 150;
      const lw2 = drawClippedText(ctx, m.label.trim() || "Untitled step", labelX, cy + 2, maxRightLabelW);
      if (m.done) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(labelX, cy + 1, lw2, 3);
      }

      ry += rRowH;
    });

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(rx, ty + th - 108, rw, 4);
    ctx.font = '700 30px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${toCity} DEPARTURE PASS`, rx, ty + th - 54);

    ctx.restore();

    if (pal.cardBorder) {
      roundedRectPath(ctx, tx, ty, tw, th, tr);
      ctx.strokeStyle = pal.cardBorder;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.fillStyle = pal.notch;
    ctx.beginPath();
    ctx.arc(splitX, ty, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(splitX, ty + th, 34, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toDataURL("image/png");
  }

  function triggerDownload(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatIcsLocal(dt, hh, mm) {
    return `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}T${pad2(hh)}${pad2(mm)}00`;
  }

  function buildIcsContent() {
    const target = parseISODate(state.date);
    const [hh, mm] = (state.reminderTime || "09:00").split(":").map(Number);
    const fromCode = (state.fromCode.trim() || "SFO").toUpperCase();
    const toCode = (state.toCode.trim() || "HND").toUpperCase();
    const toCity = state.toCity.trim() || "Destination";
    const flight = (state.flight.trim() || "NH007").toUpperCase();
    const gate = (state.gate.trim() || "A14").toUpperCase();
    const depTime = state.depTime.trim() || "14:25";
    const stampNow = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//T-Minus Boarding Pass//Countdown Lock Screen//EN",
      "CALSCALE:GREGORIAN",
      `X-WR-CALNAME:${fromCode} to ${toCode} Countdown`
    ];

    sortedMilestones().forEach((m, i) => {
      const dt = new Date(target.getTime());
      dt.setDate(dt.getDate() - (Number(m.days) || 0));
      const start = formatIcsLocal(dt, hh, mm);
      const end = formatIcsLocal(dt, hh, Math.min(59, mm + 30));
      const label = m.label.trim() || "Milestone";
      lines.push(
        "BEGIN:VEVENT",
        `UID:tminus-${fromCode}-${toCode}-m${i}-${start}@boardingpass.local`,
        `DTSTAMP:${stampNow}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:[${formatTag(m.days)}] ${label} (${fromCode} -> ${toCode})`,
        `DESCRIPTION:Flight ${flight} to ${toCity} on ${state.date}. Update your boarding pass lock screen once done.`,
        "BEGIN:VALARM",
        "TRIGGER:-PT0M",
        "ACTION:DISPLAY",
        `DESCRIPTION:${formatTag(m.days)}: ${label}`,
        "END:VALARM",
        "END:VEVENT"
      );
    });

    const depStart = formatIcsLocal(target, hh, mm);
    const depEnd = formatIcsLocal(target, Math.min(23, hh + 1), mm);
    lines.push(
      "BEGIN:VEVENT",
      `UID:tminus-${fromCode}-${toCode}-dep-${depStart}@boardingpass.local`,
      `DTSTAMP:${stampNow}`,
      `DTSTART:${depStart}`,
      `DTEND:${depEnd}`,
      `SUMMARY:[T-00] Departure Day: ${fromCode} -> ${toCode} (${flight})`,
      `DESCRIPTION:Safe flight to ${toCity}. Gate ${gate}, departure ${depTime}.`,
      "BEGIN:VALARM",
      "TRIGGER:-PT60M",
      "ACTION:DISPLAY",
      `DESCRIPTION:Departure Day: ${fromCode} -> ${toCode}`,
      "END:VALARM",
      "END:VEVENT"
    );

    if (state.dailyPing) {
      const today = new Date();
      const until = `${target.getFullYear()}${pad2(target.getMonth() + 1)}${pad2(target.getDate())}T235959`;
      const firstStart = formatIcsLocal(today, hh, mm);
      const firstEnd = formatIcsLocal(today, hh, Math.min(59, mm + 15));
      lines.push(
        "BEGIN:VEVENT",
        `UID:tminus-${fromCode}-${toCode}-daily@boardingpass.local`,
        `DTSTAMP:${stampNow}`,
        `DTSTART:${firstStart}`,
        `DTEND:${firstEnd}`,
        `RRULE:FREQ=DAILY;UNTIL=${until}`,
        `SUMMARY:Daily Countdown Check-In (${fromCode} -> ${toCode})`,
        `DESCRIPTION:Check today's T-minus step for your ${toCity} boarding pass.`,
        "BEGIN:VALARM",
        "TRIGGER:-PT0M",
        "ACTION:DISPLAY",
        `DESCRIPTION:Check your ${fromCode} -> ${toCode} countdown lock screen`,
        "END:VALARM",
        "END:VEVENT"
      );
    }

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function encodeShareHash() {
    const payload = {
      p: state.palette,
      fc: state.fromCode,
      fn: state.fromCity,
      tc: state.toCode,
      tn: state.toCity,
      dt: state.date,
      fl: state.flight,
      tm: state.depTime,
      gt: state.gate,
      ms: state.milestones.map((m) => [m.days, m.label, m.done ? 1 : 0])
    };
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return "#pass=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function loadFromShareHash() {
    if (!location.hash.startsWith("#pass=")) return;
    try {
      const b64 = location.hash.slice(6).replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (data.p && PALETTES[data.p]) state.palette = data.p;
      if (data.fc) state.fromCode = String(data.fc).slice(0, 4);
      if (data.fn) state.fromCity = String(data.fn).slice(0, 18);
      if (data.tc) state.toCode = String(data.tc).slice(0, 4);
      if (data.tn) state.toCity = String(data.tn).slice(0, 18);
      if (data.dt) state.date = String(data.dt);
      if (data.fl) state.flight = String(data.fl).slice(0, 8);
      if (data.tm) state.depTime = String(data.tm).slice(0, 8);
      if (data.gt) state.gate = String(data.gt).slice(0, 8);
      if (Array.isArray(data.ms) && data.ms.length > 0) {
        state.milestones = data.ms.slice(0, 6).map(([days, label, done]) => ({
          days: Number(days) || 0,
          label: String(label || "").slice(0, 32),
          done: Boolean(done)
        }));
      }
      state.activePreset = "";
    } catch {
      // Ignore malformed hash
    }
  }

  let toastTimer = null;
  function showToast(msg, withUndo = false) {
    $("toastText").textContent = msg;
    $("toastUndo").classList.toggle("hidden", !withUndo);
    const el = $("toast");
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("show");
      if (!withUndo) lastDeleted = null;
    }, withUndo ? 4500 : 2400);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  function bindEvents() {
    document.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.device = btn.dataset.device;
        renderAll();
      });
    });

    $("toggleOsChrome").addEventListener("change", (e) => {
      state.showOsChrome = e.target.checked;
      renderAll();
    });
    $("toggleSafeZones").addEventListener("change", (e) => {
      state.showSafeZones = e.target.checked;
      renderAll();
    });

    document.querySelectorAll(".swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.palette = btn.dataset.palette;
        renderAll();
      });
    });

    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.preset;
        const p = PRESETS[key];
        if (!p) return;
        state.activePreset = key;
        state.fromCode = p.fromCode;
        state.fromCity = p.fromCity;
        state.toCode = p.toCode;
        state.toCity = p.toCity;
        state.date = dateOffsetISO(p.daysAhead);
        state.flight = p.flight;
        state.depTime = p.depTime;
        state.gate = p.gate;
        state.milestones = p.milestones.map((m) => ({ ...m }));
        syncInputsFromState();
        renderAll();
      });
    });

    const fieldMap = [
      ["inFromCode", "fromCode"],
      ["inFromCity", "fromCity"],
      ["inToCode", "toCode"],
      ["inToCity", "toCity"],
      ["inDate", "date"],
      ["inDepTime", "depTime"],
      ["inFlight", "flight"],
      ["inGate", "gate"],
      ["inReminderTime", "reminderTime"]
    ];
    fieldMap.forEach(([id, prop]) => {
      $(id).addEventListener("input", (e) => {
        state[prop] = e.target.value;
        state.activePreset = "";
        renderAll();
      });
    });

    $("inDailyPing").addEventListener("change", (e) => {
      state.dailyPing = e.target.checked;
      renderPrompts();
    });

    ["phoneMilestones", "desktopMilestones"].forEach((id) => {
      $(id).addEventListener("click", (e) => {
        const row = e.target.closest("[data-toggle-idx]");
        if (!row) return;
        const idx = Number(row.dataset.toggleIdx);
        if (state.milestones[idx]) {
          state.milestones[idx].done = !state.milestones[idx].done;
          renderMilestoneEditor();
          renderAll();
        }
      });
    });

    $("milestoneEditor").addEventListener("input", (e) => {
      if (e.target.dataset.editDays !== undefined) {
        const idx = Number(e.target.dataset.editDays);
        state.milestones[idx].days = Math.max(0, Math.min(365, Number(e.target.value) || 0));
        renderAll();
      } else if (e.target.dataset.editLabel !== undefined) {
        const idx = Number(e.target.dataset.editLabel);
        state.milestones[idx].label = e.target.value;
        renderAll();
      }
    });

    $("milestoneEditor").addEventListener("change", (e) => {
      if (e.target.dataset.editDone !== undefined) {
        const idx = Number(e.target.dataset.editDone);
        state.milestones[idx].done = e.target.checked;
        renderAll();
      }
    });

    $("milestoneEditor").addEventListener("click", (e) => {
      if (e.target.dataset.delIdx !== undefined) {
        if (state.milestones.length <= 1) {
          showToast("Keep at least 1 milestone on the pass");
          return;
        }
        const idx = Number(e.target.dataset.delIdx);
        lastDeleted = { idx, item: { ...state.milestones[idx] } };
        state.milestones.splice(idx, 1);
        renderMilestoneEditor();
        renderAll();
        showToast("Milestone removed", true);
      }
    });

    $("toastUndo").addEventListener("click", () => {
      if (!lastDeleted) return;
      state.milestones.splice(lastDeleted.idx, 0, lastDeleted.item);
      lastDeleted = null;
      renderMilestoneEditor();
      renderAll();
      showToast("Milestone restored");
    });

    $("btnAddMilestone").addEventListener("click", () => {
      if (state.milestones.length >= 6) {
        showToast("Keep 6 or fewer milestones so the lock screen stays clear");
        return;
      }
      state.milestones.push({ days: 5, label: "Confirm airport transit", done: false });
      renderMilestoneEditor();
      renderAll();
    });

    $("btnDownloadPng").addEventListener("click", async () => {
      const slug = `${state.fromCode.trim() || "sfo"}-${state.toCode.trim() || "hnd"}`.toLowerCase();
      const btn = $("downloadPngLabel");
      const prev = btn.textContent;
      btn.textContent = "Exporting\u2026";
      try {
        if (state.device === "phone") {
          const url = await renderPhonePng();
          triggerDownload(url, `boarding-pass-phone-${slug}.png`);
          showToast("Saved 1290\u00d72796 phone PNG");
        } else {
          const url = await renderDesktopPng();
          triggerDownload(url, `boarding-pass-laptop-${slug}.png`);
          showToast("Saved 3840\u00d72160 laptop PNG");
        }
      } finally {
        btn.textContent = prev;
      }
    });

    $("btnDownloadBoth").addEventListener("click", async () => {
      const slug = `${state.fromCode.trim() || "sfo"}-${state.toCode.trim() || "hnd"}`.toLowerCase();
      const phoneUrl = await renderPhonePng();
      triggerDownload(phoneUrl, `boarding-pass-phone-${slug}.png`);
      setTimeout(async () => {
        const deskUrl = await renderDesktopPng();
        triggerDownload(deskUrl, `boarding-pass-laptop-${slug}.png`);
        showToast("Saved phone & laptop PNGs");
      }, 220);
    });

    $("btnDownloadIcs").addEventListener("click", () => {
      const content = buildIcsContent();
      const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const slug = `${state.fromCode.trim() || "sfo"}-${state.toCode.trim() || "hnd"}`.toLowerCase();
      triggerDownload(url, `countdown-${slug}.ics`);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Saved calendar reminders (.ics)");
    });

    $("btnShareLink").addEventListener("click", async () => {
      const hash = encodeShareHash();
      history.replaceState(null, "", hash);
      try {
        await navigator.clipboard.writeText(location.href);
        showToast("Copied group pass link");
      } catch {
        showToast("Updated URL hash for sharing");
      }
    });

    document.querySelectorAll(".copy-mini").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = $(btn.dataset.copy).textContent;
        try {
          await navigator.clipboard.writeText(text);
          showToast("Copied Gemini prompt");
        } catch {
          showToast("Select and copy the prompt text");
        }
      });
    });
  }

  window.__boardingPassExport = {
    renderPhonePng,
    renderDesktopPng,
    setDevice: (d) => {
      state.device = d;
      renderAll();
    },
    setPalette: (p) => {
      state.palette = p;
      renderAll();
    }
  };

  loadFromShareHash();
  syncInputsFromState();
  bindEvents();
  renderLiveClocks();
  renderAll();
  setInterval(renderLiveClocks, 15000);
})();
