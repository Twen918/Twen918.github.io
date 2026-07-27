/* ==========================================================================
   YIWEN TAN — portfolio motion system
   Agency-grade choreography on GSAP + ScrollTrigger:
   · Opening: curtain lift → title lines rise inside masks with a
     squash-and-settle (scaleY 1.4 → 1) → photo de-zooms → cards clip-reveal
   · Scroll: each section's big title storms in first, items stagger after
   · Images: reveal (scale-in-mask) + gentle scrub parallax
   One easing vocabulary: expo.out entrances, power4.inOut for the curtain.
   Transforms/opacity/clip-path only. Reduced motion = static page.
   ========================================================================== */

/* ==========================================================================
   FLOWING GRADIENT FOG — tiny purpose-built WebGL layer ("grain + gradient")
   Guards: renders at 0.4× resolution (upscale = free blur), capped at 30fps,
   low-power context, rAF auto-pauses in hidden tabs, reduced-motion gets a
   single static frame, and a missing WebGL context falls back to the solid
   <html> background color. Independent of GSAP.
   ========================================================================== */
(function () {
  "use strict";

  const canvas = document.querySelector(".bg-flow");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power"
  });
  if (!gl) { canvas.remove(); return; }

  const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_t;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 1.6;
  float t = u_t * 0.018;

  /* domain-warped fbm: the fog's slow, fluid drift */
  vec2 warp = vec2(fbm(p + t), fbm(p - t * 0.8 + 3.7));
  float f = fbm(p + warp * 1.4 + vec2(t * 0.5, -t * 0.3));

  /* palette: charcoal base, dark olive whisper, umber ember, muted orange */
  vec3 base  = vec3(0.062, 0.055, 0.050);
  vec3 moss  = vec3(0.095, 0.105, 0.060);
  vec3 ember = vec3(0.210, 0.090, 0.035);
  vec3 glow  = vec3(0.520, 0.210, 0.075);

  vec3 col = base;
  col = mix(col, moss,  smoothstep(0.25, 0.70, warp.x) * 0.32);
  col = mix(col, ember, smoothstep(0.40, 0.90, f) * 0.55);
  col = mix(col, glow,  smoothstep(0.75, 1.00, f) * 0.18);

  /* soft vignette + static dither (kills banding without shimmer) */
  vec2 q = uv - 0.5;
  col *= 1.0 - dot(q, q) * 0.7;
  col += (hash(gl_FragCoord.xy) - 0.5) * (2.0 / 255.0);

  gl_FragColor = vec4(col, 1.0);
}`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  /* fullscreen triangle */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "u_res");
  const uT = gl.getUniformLocation(prog, "u_t");

  const SCALE = 0.4; /* render low-res; CSS upscale doubles as free blur */
  const resize = () => {
    canvas.width = Math.max(2, Math.round(innerWidth * SCALE));
    canvas.height = Math.max(2, Math.round(innerHeight * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  addEventListener("resize", resize, { passive: true });

  const draw = (sec) => {
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, sec);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    draw(12.0); /* one static, fully-formed frame */
    return;
  }

  let last = 0;
  const frame = (ms) => {
    if (ms - last > 33) { last = ms; draw(ms / 1000); } /* ~30fps cap */
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();

(function () {
  "use strict";

  /* Failsafe contract with the inline <head> script */
  if (!window.gsap || !window.ScrollTrigger) {
    document.documentElement.classList.remove("motion");
    return;
  }
  window.__signalReady = true;

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- motion tokens ---------- */
  const T = {
    ease: "expo.out",          // silky entrances
    easeHard: "power4.inOut",  // curtain / big wipes
    slow: 1.3,
    base: 1.0,
    stagger: 0.11
  };
  gsap.defaults({ ease: T.ease, duration: T.base });

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: reduce)", () => {
    document.documentElement.classList.remove("motion");
  });

  mm.add("(prefers-reduced-motion: no-preference)", () => {

    /* ==================================================================
       OPENING SEQUENCE — runs once fonts settle (capped at 900ms)
       ================================================================== */
    const runIntro = () => {
      const intro = gsap.timeline();

      /* curtain lifts, then is removed so it stops holding a GPU layer */
      intro.to(".curtain", {
        yPercent: -101,
        duration: 1.05,
        ease: T.easeHard,
        onComplete() { gsap.set(".curtain", { display: "none" }); }
      }, 0);

      /* hero title: lines rise inside masks, squashed, then settle */
      intro.fromTo(".intro-title .mask > span",
        { yPercent: 120, scaleY: 1.4, transformOrigin: "0% 100%" },
        { yPercent: 0, scaleY: 1, duration: T.slow, stagger: 0.14 },
        0.45);

      /* profile card slides up while the photo de-zooms inside it */
      intro.fromTo(".intro-card",
        { y: 56, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1.2 },
        0.55);
      intro.fromTo(".avatar-photo",
        { scale: 1.35 },
        { scale: 1.12, duration: 1.7 },
        0.55);

      /* lede + stats rise */
      intro.fromTo(".hero .lede",
        { y: 34, autoAlpha: 0 },
        { y: 0, autoAlpha: 1 },
        0.85);
      intro.fromTo(".stats",
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.6 },
        0.95);
      intro.fromTo(".stat",
        { y: 26, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, stagger: 0.1 },
        0.95);

      /* counters run inside the intro */
      gsap.utils.toArray(".count").forEach((el, i) => {
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const suffix = el.dataset.suffix || "";
        const proxy = { v: 0 };
        const fmt = (v) => v.toFixed(decimals) + suffix;
        el.textContent = fmt(0);
        intro.to(proxy, {
          v: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => { el.textContent = fmt(proxy.v); }
        }, 1.0 + i * 0.1);
      });

      /* bento cards: clip-reveal upward, content settles */
      intro.fromTo(".bento",
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.5 },
        1.05);
      intro.fromTo(".bento-card",
        { clipPath: "inset(100% 0% 0% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, stagger: 0.14 },
        1.05);
      intro.fromTo(".bento-card p",
        { y: 26, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.14 },
        1.25);

      /* nav drops in last */
      intro.fromTo(".pill-nav",
        { y: -18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8 },
        1.2);
    };

    /* ==================================================================
       SCROLL CHOREOGRAPHY — title storms in first, items follow
       ================================================================== */
    const buildSections = () => {

      const sectionTimeline = (root, itemSelector, itemVars) => {
        const el = document.querySelector(root);
        if (!el) return null;
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top 72%", once: true }
        });
        tl.from(el.querySelectorAll(".stack-title .mask > span"), {
          yPercent: 120,
          scaleY: 1.4,
          transformOrigin: "0% 100%",
          duration: T.slow,
          stagger: 0.14
        }, 0);
        if (itemSelector) {
          tl.from(el.querySelectorAll(itemSelector), Object.assign({
            y: 70,
            autoAlpha: 0,
            duration: 1.1,
            stagger: T.stagger
          }, itemVars || {}), 0.55);
        }
        return tl;
      };

      /* projects: rows rise while each plate de-zooms inside its mask.
         Animating the <li> (not .project) keeps a card and its secondary
         link, if any, moving as one block. */
      const workTl = sectionTimeline("#work", ".project-list > li");
      if (workTl) {
        workTl.from("#work .plate-bg", {
          scale: 1.45,
          duration: 1.5,
          stagger: T.stagger
        }, 0.55);
      }

      sectionTimeline("#experience", ".exp");
      sectionTimeline("#skills", ".tool", { y: 46, stagger: 0.07 });

      /* contact: title first, then lede → CTA → links */
      const contactTl = sectionTimeline("#contact", null);
      if (contactTl) {
        contactTl
          .from("#contact .lede", { y: 40, autoAlpha: 0 }, 0.5)
          .from(".cta-mail", {
            clipPath: "inset(0% 100% 0% 0%)",
            duration: 1.1,
            ease: T.easeHard
          }, 0.65)
          .from(".contact-links li", {
            y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.06
          }, 0.95)
          .from(".site-foot", { autoAlpha: 0, duration: 0.8 }, 1.2);
      }

      /* ================================================================
         PARALLAX LAYERS (scrub, transform-only)
         ================================================================ */

      /* profile photo drifts inside its frame */
      gsap.fromTo(".avatar-photo",
        { yPercent: -4 },
        {
          yPercent: 4,
          ease: "none",
          scrollTrigger: {
            trigger: ".layout",
            start: "top top",
            end: "+=900",
            scrub: 1.2
          }
        });

      /* project plates drift inside their thumbs */
      gsap.utils.toArray("#work .thumb .plate-bg").forEach((bg) => {
        gsap.fromTo(bg,
          { yPercent: -8 },
          {
            yPercent: 8,
            ease: "none",
            scrollTrigger: {
              trigger: bg.closest(".project"),
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2
            }
          });
      });

      /* ghost title lines drift sideways for depth */
      gsap.utils.toArray(".stack-title .t-ghost").forEach((ghost) => {
        gsap.fromTo(ghost,
          { x: 56 },
          {
            x: -28,
            ease: "none",
            scrollTrigger: {
              trigger: ghost.closest(".stack-title"),
              start: "top bottom",
              end: "bottom top",
              scrub: 1.4
            }
          });
      });

      ScrollTrigger.refresh();
    };

    /* ---------- boot: wait for fonts (capped) so masks measure right */
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      runIntro();
      buildSections();
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start);
      setTimeout(start, 900);
    } else {
      start();
    }
  });
})();
