/* NYK System Blueprints / interactive step-through, no backend calls.
   All content and controls are keyboard accessible. */
(() => {
  "use strict";
  const buttons = Array.from(document.querySelectorAll(".flow-step[data-title]"));
  const title = document.getElementById("stepTitle");
  const explanation = document.getElementById("stepExplanation");
  const input = document.getElementById("stepInput");
  const output = document.getElementById("stepOutput");
  const count = document.getElementById("stepCounter");
  const next = document.getElementById("nextStep");
  if (!buttons.length || !title || !explanation || !input || !output) return;
  let current = 0;
  function show(index, focus = false) {
    current = ((index % buttons.length) + buttons.length) % buttons.length;
    buttons.forEach((button, i) => {
      button.classList.toggle("is-active", i === current);
      button.setAttribute("aria-pressed", String(i === current));
    });
    const node = buttons[current];
    title.textContent = node.dataset.title || "";
    explanation.textContent = node.dataset.description || "";
    input.textContent = node.dataset.input || "";
    output.textContent = node.dataset.output || "";
    if (count) count.textContent = "Step " + (current+1) + " of " + buttons.length;
    if (focus) node.focus();
  }
  buttons.forEach((button, i) => {
    button.addEventListener("click", () => show(i));
    button.addEventListener("keydown", event => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        show(i + (event.key === "ArrowRight" ? 1 : -1), true);
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault(); show(event.key === "Home" ? 0 : buttons.length-1,true);
      }
    });
  });
  next?.addEventListener("click", () => show(current+1));
  show(0);
})();
