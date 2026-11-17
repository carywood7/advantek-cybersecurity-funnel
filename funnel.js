/* Menu, scroll state, video playback and the existing preview-only two-step demo flow. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Navigation: mobile menu is hidden by CSS until activated. Preserve hash links.
  const menu = $(".menu-toggle");
  const nav = $("#site-nav");
  const navLinks = $$("a[href^='#']", nav);
  const closeMenu = () => {
    nav.classList.remove("is-open");
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open navigation");
  };
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    nav.classList.toggle("is-open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      closeMenu();
      menu.focus();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu();
  });
  navLinks.forEach((link) => link.addEventListener("click", closeMenu));
  const navTargets = navLinks.map((link) => ({ link, section: $(link.getAttribute("href")) })).filter(({section}) => section);
  let scrollScheduled = false;
  function updateNav() {
    scrollScheduled = false;
    const position = window.scrollY + 160;
    let current = null;
    for (const entry of navTargets) if (entry.section.offsetTop <= position) current = entry;
    for (const entry of navTargets) {
      if (entry === current) entry.link.setAttribute("aria-current", "location");
      else entry.link.removeAttribute("aria-current");
    }
  }
  window.addEventListener("scroll", () => {
    if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateNav); }
  }, { passive: true });
  window.addEventListener("resize", updateNav);
  updateNav();

  // Mobile CTA stays visible while browsing, then yields to the real demo form.
  const mobileDock = $("#mobile-demo-dock");
  const demoSection = $("#demo");
  if (mobileDock && demoSection && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      mobileDock.classList.toggle("is-near-form", Boolean(entry?.isIntersecting));
    }, { threshold: 0, rootMargin: "0px 0px -30% 0px" }).observe(demoSection);
  }
  mobileDock?.querySelector("a")?.addEventListener("click", closeMenu);

  // Hide on meaningful downward scrolling, reveal on upward scrolling (desktop + touch).
  // Preserve access when the header has focus or the mobile menu is open.
  const header = $("#page-top");
  let lastY = Math.max(0, window.scrollY);
  let direction = 0;
  let distance = 0;
  let headerFrame = 0;
  function updateHeader() {
    headerFrame = 0;
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    const nextDirection = Math.sign(delta);
    const keyboardFocusInHeader = header.contains(document.activeElement) && document.activeElement.matches(":focus-visible");
    const protectedHeader = keyboardFocusInHeader || nav.classList.contains("is-open");
    if (y <= 12 || protectedHeader) {
      header.classList.remove("is-scrolled-away");
      distance = 0;
      direction = 0;
    } else if (nextDirection) {
      if (nextDirection !== direction) { distance = 0; direction = nextDirection; }
      distance += Math.abs(delta);
      if (direction > 0 && y > header.offsetHeight + 40 && distance >= 18) {
        header.classList.add("is-scrolled-away");
        distance = 0;
      } else if (direction < 0 && distance >= 10) {
        header.classList.remove("is-scrolled-away");
        distance = 0;
      }
    }
    lastY = y;
  }
  window.addEventListener("scroll", () => {
    if (!headerFrame) headerFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  header.addEventListener("focusin", () => header.classList.remove("is-scrolled-away"));
  menu.addEventListener("click", () => {
    header.classList.remove("is-scrolled-away");
    distance = 0;
  });

  // Any-hover mouse devices get an immediate preview; native click/touch and keyboard stay functional.
  const fineHover = matchMedia("(any-hover: hover)");
  function hoverAccordions(selector) {
    const items = $$(selector);
    items.forEach((item) => {
      let hoverOpened = false;
      let closeTimeout;
      item.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "mouse" || !fineHover.matches) return;
        clearTimeout(closeTimeout);
        if (!item.open) { item.open = true; hoverOpened = true; }
        items.forEach((other) => { if (other !== item) other.open = false; });
      });
      item.addEventListener("pointerleave", (event) => {
        if (event.pointerType !== "mouse" || !hoverOpened) return;
        closeTimeout = setTimeout(() => {
          if (!item.matches(":hover") && !item.contains(document.activeElement)) {
            item.open = false;
            hoverOpened = false;
          }
        }, 240);
      });
      item.querySelector("summary")?.addEventListener("click", (event) => {
        if (!hoverOpened) return; // Touch / keyboard retains normal native details semantics.
        event.preventDefault(); // Clicking after hover pins the open answer instead of closing it.
        hoverOpened = false;
        clearTimeout(closeTimeout);
        item.open = true;
      });
      item.addEventListener("focusin", () => clearTimeout(closeTimeout));
    });
  }
  hoverAccordions(".challenge-lines details");
  hoverAccordions(".faq-questions details");

  // Visibility-aware automatic visual changes: pause for hover, focus, hidden tabs,
  // and reduced-motion preference. Explicit pointer/touch clicks always keep working.
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  function autoRotate(region, count, delay, select) {
    if (!region) return () => {};
    let current = 0;
    let visible = !("IntersectionObserver" in window);
    let hovered = false;
    let keyboardFocus = false;
    let timer;
    const canRotate = () => visible && !hovered && !keyboardFocus && !document.hidden && !reducedMotion.matches;
    const schedule = () => {
      clearTimeout(timer);
      if (!canRotate()) return;
      timer = setTimeout(() => { current = (current + 1) % count; select(current); schedule(); }, delay);
    };
    const choose = (index) => { current = index; select(index); schedule(); };
    region.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") { hovered = true; clearTimeout(timer); }
    });
    region.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") { hovered = false; schedule(); }
    });
    region.addEventListener("focusin", (event) => {
      keyboardFocus = event.target.matches(":focus-visible");
      schedule();
    });
    region.addEventListener("focusout", () => requestAnimationFrame(() => {
      if (!region.contains(document.activeElement)) { keyboardFocus = false; schedule(); }
    }));
    document.addEventListener("visibilitychange", schedule);
    reducedMotion.addEventListener?.("change", schedule);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        schedule();
      }, { threshold: 0.2 }).observe(region);
    }
    select(0);
    schedule();
    return choose;
  }

  // One open accordion per section, including keyboard/touch toggles.
  for (const selector of [".faq-questions details", ".challenge-lines details"]) {
    const items = $$(selector);
    items.forEach((item) => item.addEventListener("toggle", () => {
      if (item.open) items.forEach((other) => { if (other !== item) other.open = false; });
    }));
  }

  // Real product footage, never auto-enable sound. Autoplay is best-effort and nonessential.
  const film = $("#workflow-film");
  const filmButton = $(".film-play");
  if (film && filmButton) {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const userRequestedDataSaving = navigator.connection && navigator.connection.saveData;
    let hasAutoPlayed = false;
    let hasStarted = false;
    const syncFilm = () => {
      filmButton.hidden = hasStarted && !film.ended;
      film.controls = true;
    };
    filmButton.addEventListener("click", async () => {
      film.muted = true;
      try { await film.play(); } catch (_) { film.controls = true; }
      syncFilm();
    });
    film.addEventListener("play", () => { hasStarted = true; syncFilm(); });
    for (const type of ["pause", "ended"]) film.addEventListener(type, syncFilm);
    // Controls remain accessible even if autoplay is blocked or the poster fails.
    film.controls = true;
    if ("IntersectionObserver" in window && !reduceMotion.matches && !userRequestedDataSaving) {
      const observer = new IntersectionObserver((entries) => {
        const visible = entries[0]?.isIntersecting;
        if (visible && !hasAutoPlayed) {
          hasAutoPlayed = true;
          film.muted = true;
          film.play().catch(() => { film.controls = true; syncFilm(); });
        } else if (!visible && !film.paused) {
          film.pause();
        }
      }, { threshold: .6 });
      observer.observe(film);
    }
    syncFilm();
  }

  // One visual before/after comparison, without another text-based tab report.
  const viewButtons = $$(".view-toggle");
  const viewScenes = $$(".compare-scene");
  function showView(view) {
    viewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
    viewScenes.forEach((scene) => {
      const selected = scene.dataset.scene === view;
      scene.hidden = !selected;
      scene.classList.toggle("is-active", selected);
    });
  }
  const chooseComparison = autoRotate($(".solution-visual"), 2, 6000,
    (index) => showView(index === 0 ? "before" : "after"));
  viewButtons.forEach((button, index) => {
    button.addEventListener("click", () => chooseComparison(index));
    button.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse" && fineHover.matches) chooseComparison(index);
    });
  });

  // Three-step progression: small active detail, no duplicate reports.
  const stepButtons = $$("[data-step-select]");
  const stepDetail = $("#process-detail");
  const stepDescriptions = {
    "01": "Start with the question your team needs to answer.",
    "02": "Review available context and identify what still needs verification.",
    "03": "Agree on the owner, validation, and next action."
  };
  const chooseStep = autoRotate($(".process-track"), stepButtons.length, 4800, (index) => {
    const button = stepButtons[index];
    if (!button) return;
    const choice = button.dataset.stepSelect;
    stepButtons.forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
      item.closest(".process-step")?.classList.toggle("is-active", item === button);
    });
    if (stepDetail) stepDetail.textContent = stepDescriptions[choice];
  });
  stepButtons.forEach((button, index) => {
    button.addEventListener("click", () => chooseStep(index));
    button.closest(".process-step")?.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse" && fineHover.matches) chooseStep(index);
    });
  });

  // Qualification: no collection in this local preview. Preserve existing field names and schedule path.
  const form = $("#qualification-form");
  if (!form) return;
  const step1 = $("#contact-step");
  const step2 = $("#organization-step");
  const next = $("#form-next-step");
  const back = $("#form-back");
  const steps = $$(".form-steps li");
  const progress = $("#form-progress");
  let currentStep = 1;
  function displayStep(nextStep, focus = true) {
    currentStep = nextStep;
    step1.hidden = step1.disabled = currentStep !== 1;
    step2.hidden = step2.disabled = currentStep !== 2;
    next.hidden = currentStep !== 1;
    steps.forEach((item, index) => {
      if (index + 1 === currentStep) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    progress.textContent = currentStep === 1 ? "Step 1 of 2: About you" : "Step 2 of 2: Security priorities";
    if (focus) $(currentStep === 1 ? "#full-name" : "#company_size").focus();
  }
  const requiredFieldsIn = (fieldset) => $$("input[required], select[required]", fieldset);
  function validate(fieldset) {
    const fields = requiredFieldsIn(fieldset);
    for (const field of fields) {
      if (field.tagName === "INPUT" && field.value.trim() === "") {
        field.setCustomValidity("Please complete this field.");
      } else {
        field.setCustomValidity("");
      }
    }
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.focus();
        field.reportValidity();
        return false;
      }
    }
    return true;
  }
  $$('input[required], select[required]', form).forEach((field) => {
    for (const type of ["input", "change"]) field.addEventListener(type, () => field.setCustomValidity(""));
  });
  next.addEventListener("click", () => { if (validate(step1)) displayStep(2); });
  back.addEventListener("click", () => displayStep(1));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (currentStep === 1) {
      if (validate(step1)) displayStep(2);
      return;
    }
    if (!validate(step2)) return;
    // Keep only minimal context in this tab for the scheduling prototype.
    // No email, phone, or complete form data is stored or submitted.
    try {
      const name = $("#full-name").value.trim();
      sessionStorage.setItem("advantek.previewLead.v4", JSON.stringify({
        firstName: name.split(/\s+/)[0].slice(0,60),
        priority: $("#priority").value
      }));
    } catch (_) { /* Session storage can be disabled; preview still works. */ }
    window.location.assign("schedule/?preview=1");
  });
  // A use-case CTA carries only the selected priority into the form; no data is sent.
  $$("a[data-priority]").forEach((link) => link.addEventListener("click", () => {
    const priority = $("#priority");
    if (priority && [...priority.options].some(option => option.value === link.dataset.priority)) {
      priority.value = link.dataset.priority;
      priority.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }));
  displayStep(1, false);
})();
