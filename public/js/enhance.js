/* ===========================================================================
   enhance.js — ANIMATION + MASCOT LAYER ONLY
   This file does NOT touch the site logic (nav, password, feed, delete) —
   that all lives in the original app.js + its modules. This layer adds:
     1. Scroll-reveal that RE-RUNS every time a page (view) is opened
     2. Pop-in animation for dynamically injected cards / rows / feed items
     3. The mascot 掃掃 (entrance, blink, wave, point, speech)
   Runs as a classic script before the deferred app.js module.
   =========================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------- */
  /* 1. Scroll-reveal (re-armable per view)                                  */
  /* ---------------------------------------------------------------------- */
  let io = null;

  function setStagger(scope) {
    $$("[data-reveal]", scope).forEach((p) => {
      $$("[data-reveal-child]", p).forEach((k, i) => {
        k.style.setProperty("--d", (i * 0.08).toFixed(2) + "s");
      });
    });
  }

  function revealEl(el) {
    el.classList.add("is-in");
    $$("[data-reveal-child]", el).forEach((k) => k.classList.add("is-in"));
  }

  function initObserver() {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      $$("[data-reveal]").forEach(revealEl);
      return;
    }
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { revealEl(e.target); io.unobserve(e.target); }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
  }

  /* Re-arm a view: reset its reveals (no flash) and observe again so they
     animate fresh. Called the first time and on EVERY time the view opens. */
  function armView(view) {
    if (!view) return;
    const items = $$("[data-reveal]", view);
    if (reduceMotion || !io) { items.forEach(revealEl); return; }
    items.forEach((el) => {
      el.classList.add("reveal-reset");
      el.classList.remove("is-in");
      $$("[data-reveal-child]", el).forEach((k) => k.classList.remove("is-in"));
    });
    void view.offsetWidth; // flush the reset with transitions disabled
    requestAnimationFrame(() => {
      items.forEach((el) => { el.classList.remove("reveal-reset"); io.observe(el); });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 2. Pop-in for dynamically injected content (feed / table / carousel)    */
  /* ---------------------------------------------------------------------- */
  function popIn(nodes) {
    if (reduceMotion) return;
    let i = 0;
    nodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      n.classList.remove("js-pop");
      void n.offsetWidth;
      n.style.animationDelay = (i++ * 0.06).toFixed(2) + "s";
      n.classList.add("js-pop");
    });
  }

  function watchInjected(id) {
    const host = document.getElementById(id);
    if (!host) return;
    const mo = new MutationObserver((muts) => {
      const added = [];
      muts.forEach((m) => m.addedNodes.forEach((n) => added.push(n)));
      if (added.length) popIn(added);
    });
    mo.observe(host, { childList: true });
  }

  /* ---------------------------------------------------------------------- */
  /* 3. Watch view visibility → re-run animations on every page open         */
  /* ---------------------------------------------------------------------- */
  function watchViews() {
    ["view-home", "view-report", "view-chief"].forEach((id) => {
      const v = document.getElementById(id);
      if (!v) return;
      const mo = new MutationObserver((muts) => {
        muts.forEach((m) => {
          if (m.attributeName === "hidden" && !v.hidden) {
            armView(v);
            if (mascot) idleSay(v);
          }
        });
      });
      mo.observe(v, { attributes: true, attributeFilter: ["hidden"] });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 4. Mascot 掃掃                                                          */
  /* ---------------------------------------------------------------------- */
  const mascot = $("#mascot");
  const bubbleText = $("#mascot-bubble-text");
  const stage = $("#mascot-stage");
  let talkTimer = null, pointTimer = null, lastSay = "";

  const CLICK_LINES = [
    "記得清廚餘、倒積水，病媒就不來！",
    "發現髒亂？點上方「通報問題」就能回報唷！",
    "乾淨的社區，大家一起維護 ✨",
    "掃掃會一直陪你守護精忠里！",
    "封好孔洞、收好雜物，老鼠最怕囉～",
  ];

  function say(text, { point = false } = {}) {
    if (!mascot || !text) return;
    bubbleText.textContent = text;
    mascot.classList.add("is-talking");
    clearTimeout(talkTimer);
    talkTimer = setTimeout(() => mascot.classList.remove("is-talking"), 4600);
    if (point && !reduceMotion) {
      mascot.dataset.state = "point";
      clearTimeout(pointTimer);
      pointTimer = setTimeout(() => (mascot.dataset.state = "idle"), 1400);
    }
  }

  function wave() {
    if (!mascot || reduceMotion) return;
    mascot.classList.remove("is-waving");
    void mascot.offsetWidth;
    mascot.classList.add("is-waving");
  }

  /* Say the line for the first sayable element in the freshly-opened view */
  function idleSay(view) {
    const first = view.querySelector("[data-mascot-say]");
    if (first && first.dataset.mascotSay && first.dataset.mascotSay !== lastSay) {
      lastSay = first.dataset.mascotSay;
      wave();
      say(lastSay, { point: true });
    }
  }

  function initMascot() {
    if (!mascot) return;
    setTimeout(() => {
      mascot.classList.add("is-ready");
      setTimeout(() => { wave(); say("嗨！我是掃掃，一起守護精忠里乾淨整潔！"); }, 480);
    }, 600);

    stage.addEventListener("click", () => {
      wave();
      const pool = CLICK_LINES.filter((l) => l !== lastSay);
      lastSay = pool[Math.floor(Math.random() * pool.length)];
      say(lastSay);
    });

    if (!reduceMotion && "IntersectionObserver" in window) {
      let active = null;
      const sObs = new IntersectionObserver(
        (entries) => {
          let best = null, bestRatio = 0;
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio > bestRatio) { best = e.target; bestRatio = e.intersectionRatio; }
          });
          if (best && best !== active && bestRatio > 0.35) {
            active = best;
            const msg = best.dataset.mascotSay;
            if (msg && msg !== lastSay) { lastSay = msg; say(msg, { point: true }); }
          }
        },
        { threshold: [0.35, 0.6] }
      );
      $$("[data-mascot-say]").forEach((s) => sObs.observe(s));
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Boot                                                                    */
  /* ---------------------------------------------------------------------- */
  setStagger(document);
  initObserver();
  watchViews();
  ["resident-feed", "featured-track", "report-tbody"].forEach(watchInjected);
  // Arm whichever view is visible at load (home by default)
  $$("main.view").forEach((v) => { if (!v.hidden) armView(v); });
  initMascot();
})();
