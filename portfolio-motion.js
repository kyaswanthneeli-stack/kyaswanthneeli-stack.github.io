/* Enhancements are progressive; the portfolio remains fully usable without JS. */
(() => {
  "use strict";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const hero = document.querySelector(".hero-visual");
  const cards = Array.from(document.querySelectorAll(".project-card"));
  const meter = document.querySelector(".scroll-meter");
  let scrollScheduled = false;

  function updateMeter() {
    scrollScheduled = false;
    if (!meter) return;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const percent = total > 0 ? Math.min(100, Math.max(0, 100 * window.scrollY / total)) : 0;
    meter.style.setProperty("--page-progress", percent.toFixed(2) + "%");
  }
  window.addEventListener("scroll", () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    window.requestAnimationFrame(updateMeter);
  }, { passive: true });
  window.addEventListener("resize", updateMeter, { passive: true });
  updateMeter();

  if (!reducedMotion.matches && "IntersectionObserver" in window) {
    const sections = document.querySelectorAll(
      ".proofbar, .section-heading, .project-card, .evidence, .small-card, .case-card, .exp, .contact"
    );
    sections.forEach(el => el.classList.add("reveal-target"));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px 48px 0px" });
    sections.forEach(el => observer.observe(el));
    document.body.classList.add("motion-ready");
  }

  if (!precisePointer.matches || reducedMotion.matches) return;

  if (hero) {
    let frame = null;
    hero.addEventListener("pointermove", event => {
      if (frame !== null) return;
      const x = event.clientX;
      const y = event.clientY;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const rect = hero.getBoundingClientRect();
        const horizontal = (x - rect.left) / Math.max(rect.width, 1) - 0.5;
        const vertical = (y - rect.top) / Math.max(rect.height, 1) - 0.5;
        hero.style.setProperty("--hero-ry", (horizontal * 5).toFixed(2) + "deg");
        hero.style.setProperty("--hero-rx", (-vertical * 5).toFixed(2) + "deg");
      });
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--hero-ry", "0deg");
      hero.style.setProperty("--hero-rx", "0deg");
    });
  }

  cards.forEach(card => {
    let cardFrame = null;
    card.addEventListener("pointermove", event => {
      if (cardFrame !== null) return;
      const x = event.clientX;
      const y = event.clientY;
      cardFrame = window.requestAnimationFrame(() => {
        cardFrame = null;
        const rect = card.getBoundingClientRect();
        const px = Math.min(1, Math.max(0, (x - rect.left) / Math.max(rect.width, 1)));
        const py = Math.min(1, Math.max(0, (y - rect.top) / Math.max(rect.height, 1)));
        card.style.setProperty("--card-rx", ((0.5 - py) * 3.5).toFixed(2) + "deg");
        card.style.setProperty("--card-ry", ((px - 0.5) * 3.5).toFixed(2) + "deg");
        card.style.setProperty("--spot-x", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--spot-y", (py * 100).toFixed(1) + "%");
      });
    }, { passive: true });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--card-rx", "0deg");
      card.style.setProperty("--card-ry", "0deg");
      card.style.setProperty("--spot-x", "50%");
      card.style.setProperty("--spot-y", "50%");
    });
  });
})();