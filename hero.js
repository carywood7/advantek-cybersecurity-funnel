/* The illustrative hero sample cycles only while visible; no fake live analysis. */
(() => {
  "use strict";
  const samples = [
    { question: "What should we review first?", finding: "Check exposure and asset ownership before prioritizing.", action: "Validate the affected systems." },
    { question: "Where are our access-review gaps?", finding: "The policy scope and review ownership need clarification.", action: "Confirm in-scope systems and review owners." },
    { question: "How should we brief leadership?", finding: "Exposure is concentrated in two systems with known exploits.", action: "Share a board-ready summary and a prioritized plan." }
  ];
  const button = document.getElementById("cycle-scenario");
  const question = document.getElementById("hero-sample-question");
  const finding = document.getElementById("hero-sample-finding");
  const action = document.getElementById("hero-sample-action");
  const counter = document.getElementById("scenario-count");
  const region = document.querySelector(".hero-art");
  if (!button || !question || !finding || !action || !region) return;
  let index = 0;
  let timer;
  let visible = !("IntersectionObserver" in window);
  let hovering = false;
  let keyboardFocus = false;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function showScenario(next) {
    index = (next + samples.length) % samples.length;
    const sample = samples[index];
    question.textContent = sample.question;
    finding.textContent = sample.finding;
    action.textContent = sample.action;
    if (counter) counter.textContent = `Scenario ${index + 1} of ${samples.length}`;
    const workspace = region.querySelector(".interface-body");
    if (workspace && !reduceMotion.matches) {
      workspace.classList.remove("sample-swapped");
      void workspace.offsetWidth;
      workspace.classList.add("sample-swapped");
    }
  }
  const canCycle = () => visible && !hovering && !keyboardFocus && !document.hidden && !reduceMotion.matches;
  function schedule() {
    clearTimeout(timer);
    if (!canCycle()) return;
    timer = setTimeout(() => { showScenario(index + 1); schedule(); }, 5300);
  }
  button.addEventListener("click", () => { showScenario(index + 1); schedule(); });
  region.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") { hovering = true; clearTimeout(timer); }
  });
  region.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") { hovering = false; schedule(); }
  });
  region.addEventListener("focusin", (event) => {
    keyboardFocus = event.target.matches(":focus-visible");
    schedule();
  });
  region.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!region.contains(document.activeElement)) { keyboardFocus = false; schedule(); }
    });
  });
  document.addEventListener("visibilitychange", schedule);
  reduceMotion.addEventListener?.("change", schedule);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      schedule();
    }, { threshold: 0.25 }).observe(region);
  }
  showScenario(0);
  schedule();
})();
