const DOM = {
  yesBtn: document.getElementById("yesBtn"),
  noBtn: document.getElementById("noBtn"),
  actions: document.getElementById("actions"),
  status: document.getElementById("status"),
  card: document.querySelector(".card"),
  bunny: document.querySelector(".bunny"),
  title: document.getElementById("title"),
  bunnyField: document.querySelector(".bunny-field"),
  kissContainer: document.querySelector(".kiss-stamps"),
};

const CONFIG = {
  kissCount: 20,
  kissDelayMax: 0.6,
  kissArea: { xMin: 10, xMax: 90, yMin: 12, yMax: 88 },
  fadeOverlapPct: 3, // Increase/decrease to test smoother pose changes.
  celebrateMs: 5000,
  pauseMinBase: 4,
  pauseJitter: 4,
  runMin: 18,
  runMax: 24,
  runMinTail: 12,
};

const runnerTimers = new WeakMap();
let celebrateTimer;

const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const randomBetween = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const toMs = (value) => {
  if (!value) return 0;
  const trimmed = value.trim();
  if (trimmed.endsWith("ms")) return parseFloat(trimmed);
  return parseFloat(trimmed) * 1000;
};

const scatterKisses = () => {
  if (!DOM.kissContainer) return;
  DOM.kissContainer.innerHTML = "";
  for (let i = 0; i < CONFIG.kissCount; i += 1) {
    const span = document.createElement("span");
    span.textContent = "💋";
    const x = randomBetween(CONFIG.kissArea.xMin, CONFIG.kissArea.xMax);
    const y = randomBetween(CONFIG.kissArea.yMin, CONFIG.kissArea.yMax);
    const rotation = randomBetween(-25, 25);
    const delay = randomBetween(0, CONFIG.kissDelayMax);
    span.style.setProperty("--x", `${x.toFixed(2)}%`);
    span.style.setProperty("--y", `${y.toFixed(2)}%`);
    span.style.setProperty("--r", `${rotation.toFixed(1)}deg`);
    span.style.setProperty("--d", `${delay.toFixed(2)}s`);
    DOM.kissContainer.appendChild(span);
  }
};

const triggerCelebrate = () => {
  scatterKisses();
  DOM.card?.classList.remove("kissed");
  void DOM.card?.offsetWidth;
  DOM.card?.classList.add("kissed");

  if (!DOM.bunnyField) return;
  DOM.bunnyField.classList.add("celebrate");
  window.clearTimeout(celebrateTimer);
  celebrateTimer = window.setTimeout(() => {
    DOM.bunnyField.classList.remove("celebrate");
  }, CONFIG.celebrateMs);
};

const accept = () => {
  DOM.card?.classList.add("accepted");
  DOM.yesBtn?.classList.add("is-active");
  DOM.noBtn?.classList.remove("is-active");
  if (DOM.status) DOM.status.textContent = "Χεχεχεχε, είσαι δικιά μου και μόνο δικιά μου!";
  if (DOM.title) {
    DOM.title.innerHTML = "Yaaay!<br>Σε αγαπώ πολύ Μαρία!!!";
  }
  triggerCelebrate();
};

const buildTimeline = (minPause) => {
  const pause1 = randomBetween(minPause, minPause + CONFIG.pauseJitter);
  const pause2 = randomBetween(minPause, minPause + CONFIG.pauseJitter);
  let run1 = randomBetween(CONFIG.runMin, CONFIG.runMax);
  let run2 = randomBetween(CONFIG.runMin, CONFIG.runMax);
  let run3 = 100 - (pause1 + pause2 + run1 + run2);
  if (run3 < CONFIG.runMinTail) {
    const deficit = CONFIG.runMinTail - run3;
    run1 -= deficit / 2;
    run2 -= deficit / 2;
    run3 = CONFIG.runMinTail;
  }

  const t1 = run1;
  const t2 = t1 + pause1;
  const t3 = t2 + run2;
  const t4 = t3 + pause2;

  return { t1, t2, t3, t4, pause1, pause2 };
};

const buildRunnerAnimation = (direction) => {
  const isRight = direction === "right";
  const startX = isRight ? 130 : -30;
  const endX = isRight ? -30 : 130;
  const stop1 = isRight ? randomBetween(60, 95) : randomBetween(10, 35);
  const stop2 = isRight ? randomBetween(10, 45) : randomBetween(50, 80);
  const minPause = Math.max(4, CONFIG.fadeOverlapPct * 2 + 1);
  const timeline = buildTimeline(minPause);
  const pct = (value) => `${clamp(value, 0, 100).toFixed(2)}%`;

  const keyframes = `
@keyframes {MOVE} {
  0% { transform: translateX(${startX}vw); }
  ${pct(timeline.t1)} { transform: translateX(${stop1.toFixed(2)}vw); }
  ${pct(timeline.t2)} { transform: translateX(${stop1.toFixed(2)}vw); }
  ${pct(timeline.t3)} { transform: translateX(${stop2.toFixed(2)}vw); }
  ${pct(timeline.t4)} { transform: translateX(${stop2.toFixed(2)}vw); }
  100% { transform: translateX(${endX}vw); }
}
`;

  return { keyframes, timeline };
};

const clearRunnerTimers = (runner) => {
  const timers = runnerTimers.get(runner);
  if (!timers) return;
  timers.forEach((id) => window.clearTimeout(id));
  runnerTimers.delete(runner);
};

const setRunnerPose = (runner, pose) => {
  runner.classList.toggle("is-back", pose === "back");
};

const scheduleRunnerPoses = (runner, durationMs, offsetMs, timeline) => {
  clearRunnerTimers(runner);
  const timers = [];
  const phasePct = (offsetMs / durationMs) * 100;
  const isStopped =
    (phasePct >= timeline.t1 && phasePct < timeline.t2) ||
    (phasePct >= timeline.t3 && phasePct < timeline.t4);
  setRunnerPose(runner, isStopped ? "back" : "run");

  const minPauseMs = Math.min(timeline.pause1, timeline.pause2) * (durationMs / 100);
  const desiredFade = durationMs * (CONFIG.fadeOverlapPct / 100);
  const fadeMs = Math.min(desiredFade, Math.max(120, minPauseMs * 0.6));
  runner.style.setProperty("--pose-fade", `${Math.round(fadeMs)}ms`);

  const events = [
    { t: timeline.t1, pose: "back" },
    { t: timeline.t2, pose: "run" },
    { t: timeline.t3, pose: "back" },
    { t: timeline.t4, pose: "run" },
  ];

  events.forEach((event) => {
    let time = (durationMs * event.t) / 100 - offsetMs;
    while (time < 0) time += durationMs;
    const id = window.setTimeout(() => {
      setRunnerPose(runner, event.pose);
    }, time);
    timers.push(id);
  });

  runnerTimers.set(runner, timers);
};

const applyRunnerAnimation = (runner, name, duration, delay) => {
  runner.style.animationName = name;
  runner.style.animationDuration = duration;
  runner.style.animationDelay = delay;
  runner.style.animationTimingFunction = "linear";
  runner.style.animationIterationCount = "infinite";
  runner.style.animationFillMode = "both";
};

const setupRandomRunners = () => {
  if (prefersReducedMotion) return;
  const runners = Array.from(document.querySelectorAll(".runner"));
  if (!runners.length) return;

  let counter = 0;
  const styleTag =
    document.getElementById("runner-dynamic") || document.createElement("style");
  styleTag.id = "runner-dynamic";
  if (!styleTag.parentNode) document.head.appendChild(styleTag);
  const rules = new Map();

  const updateRunner = (runner, index, useInitialDelay) => {
    counter += 1;
    const direction = runner.classList.contains("from-right") ? "right" : "left";
    const name = `runner-move-${index}-${counter}`;
    const { keyframes, timeline } = buildRunnerAnimation(direction);
    rules.set(index, keyframes.replace("{MOVE}", name));
    styleTag.textContent = Array.from(rules.values()).join("\n");

    const computed = getComputedStyle(runner);
    const duration = computed.getPropertyValue("--run-duration").trim() || "22s";
    const initialDelay =
      computed.getPropertyValue("--run-delay").trim() || "0s";
    const delay = useInitialDelay ? initialDelay : "0s";
    const durationMs = toMs(duration);
    const delayMs = toMs(delay);
    const offsetMs =
      delayMs < 0 ? ((-delayMs) % durationMs + durationMs) % durationMs : 0;
    const startDelayMs = delayMs > 0 ? delayMs : 0;

    applyRunnerAnimation(runner, name, duration, delay);
    scheduleRunnerPoses(runner, durationMs, offsetMs, timeline);
    if (startDelayMs > 0) {
      clearRunnerTimers(runner);
      const id = window.setTimeout(() => {
        scheduleRunnerPoses(runner, durationMs, 0, timeline);
      }, startDelayMs);
      runnerTimers.set(runner, [id]);
    }
  };

  runners.forEach((runner, index) => {
    updateRunner(runner, index, true);
    runner.addEventListener("animationiteration", (event) => {
      if (event.target !== runner) return;
      updateRunner(runner, index, false);
    });
  });
};

const initButtons = () => {
  if (!DOM.yesBtn || !DOM.noBtn) return;
  DOM.yesBtn.addEventListener("click", accept);
  DOM.noBtn.addEventListener("click", () => {
    DOM.actions?.classList.toggle("swapped");
    accept();
  });
};

const initPointerTracking = () => {
  if (!DOM.bunny) return;
  let pending = false;
  let targetX = 0;
  let targetY = 0;

  const updateLook = () => {
    pending = false;
    const rect = DOM.bunny.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = targetX - centerX;
    const dy = targetY - centerY;
    const dist = Math.hypot(dx, dy) || 1;
    const maxOffset = 6;
    const strength = Math.min(maxOffset, dist / 12);
    DOM.bunny.style.setProperty("--look-x", `${(dx / dist) * strength}px`);
    DOM.bunny.style.setProperty("--look-y", `${(dy / dist) * strength}px`);
  };

  const queueLook = () => {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(updateLook);
  };

  const handlePointer = (x, y) => {
    targetX = x;
    targetY = y;
    queueLook();
  };

  window.addEventListener("pointermove", (event) => {
    handlePointer(event.clientX, event.clientY);
  });

  window.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches && event.touches[0]) {
        handlePointer(event.touches[0].clientX, event.touches[0].clientY);
      }
    },
    { passive: true }
  );
};

setupRandomRunners();
initButtons();
initPointerTracking();
