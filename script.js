/* =========================================================================
   Yiwen Tan — portfolio interactions
   -------------------------------------------------------------------------
   Two small effects, both kept simple on purpose:
     1) the flashlight beam in the hero follows your mouse
     2) sections fade in as you scroll to them
   Both are disabled automatically if the visitor has "reduce motion" on.
   ========================================================================= */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- 1. flashlight beam follows the pointer in the hero --------------- */
  // The CSS reads two variables, --mx and --my, to position the glow.
  // We update them on mousemove. On touch devices (no fine pointer) we leave
  // the CSS default position so the beam just sits there.
  var hero = document.getElementById("hero");
  var hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (hero && hasFinePointer && !reduceMotion) {
    hero.addEventListener("pointermove", function (e) {
      var rect = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", (e.clientX - rect.left) + "px");
      hero.style.setProperty("--my", (e.clientY - rect.top) + "px");
    });
  }

  /* --- 2. fade sections in as they scroll into view -------------------- */
  // Anything with class "reveal" starts invisible (see style.css) and gets
  // class "in" added when it enters the viewport.
  var revealItems = document.querySelectorAll(".reveal");

  // If motion is reduced, or the browser is too old for IntersectionObserver,
  // just show everything immediately.
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (el) { el.classList.add("in"); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        observer.unobserve(entry.target); // reveal once, then stop watching
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach(function (el) { observer.observe(el); });
})();
