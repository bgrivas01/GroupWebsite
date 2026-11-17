(() => {
  'use strict';
  const scene = document.querySelector('#scene');
  const container = document.querySelector('#fireworks');
  const zero = document.querySelector('#zero');
  const orbit = document.querySelector('#orbit');
  const motion = document.querySelector('#motion-control');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  let clicks = 0;
  let timer = null;
  let engine = null;

  // Agen has generous font metrics. Align to the painted glyph, not its line box.
  function positionOrbit() {
    const style = getComputedStyle(zero);
    const context = document.createElement('canvas').getContext('2d');
    context.font = `${style.fontSize} ${style.fontFamily}`;
    const metrics = context.measureText('0');
    const advance = metrics.width + parseFloat(style.letterSpacing);
    const stretch = parseFloat(style.getPropertyValue('--zero-stretch')) || 1;
    const baseline = (zero.offsetHeight - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent;
    orbit.style.left = `${zero.offsetLeft + zero.offsetWidth / 2 + (-metrics.actualBoundingBoxLeft - advance / 2) * stretch}px`;
    orbit.style.width = `${(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) * stretch}px`;
    orbit.style.top = `${baseline - metrics.actualBoundingBoxAscent}px`;
    orbit.style.height = `${metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent}px`;
  }
  positionOrbit();
  document.fonts.ready.then(positionOrbit);
  new ResizeObserver(positionOrbit).observe(zero);

  for (const member of orbit.querySelectorAll('.member')) {
    member.addEventListener('click', event => event.stopPropagation());
  }

  try {
    const Fireworks = window.Fireworks?.Fireworks || window.Fireworks?.default;
    if (!Fireworks) throw new Error('Fireworks library unavailable');
    engine = new Fireworks(container, {
      autoresize: true, particles: innerWidth < 650 ? 36 : 55,
      acceleration: 1.035, friction: 0.97, gravity: 1.25,
      explosion: innerWidth < 650 ? 3 : 5, traceLength: 3, traceSpeed: 7, opacity: 0.35,
      flickering: 35, intensity: 12, decay: { min: 0.012, max: 0.022 },
      hue: { min: 0, max: 360 }, brightness: { min: 65, max: 88 },
      rocketsPoint: { min: 15, max: 85 },
      lineWidth: { explosion: { min: 1, max: 2 }, trace: { min: 1, max: 1.5 } },
      mouse: { click: false, move: false, max: 1 }, sound: { enabled: false }
    });
  } catch (error) {
    console.warn('The scene is available, but fireworks could not load.', error);
  }

  function renderStatus() {
    scene.dataset.mode = paused ? 'paused' : clicks >= 5 ? 'automatic' : 'manual';
    scene.dataset.bursts = String(clicks);
    motion.setAttribute('aria-pressed', String(paused));
    document.querySelector('#motion-label').textContent = paused ? 'Resume motion' : 'Pause motion';
    document.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
  }

  function launch(x, y) {
    if (!engine || paused || document.hidden) return;
    // launch() runs until the particles fade, avoiding an idle animation loop.
    engine.updateOptions({ mouse: { move: x !== undefined } });
    if (!engine.isRunning) engine.start();
    if (x !== undefined) {
      container.querySelector('canvas').dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }));
    }
    engine.launch(1);
  }

  function schedule() {
    clearInterval(timer);
    timer = null;
    if (engine && clicks >= 5 && !paused && !document.hidden) {
      timer = setInterval(() => launch(), 1350);
    }
  }
  function celebrate(event) {
    if (!engine || paused || document.hidden) return;
    if (event.target.closest('a,button,header,nav')) return;
    launch(event.type === 'click' ? event.clientX : undefined, event.type === 'click' ? event.clientY : undefined);
    clicks = Math.min(5, clicks + 1);
    renderStatus();
    // Later clicks must not postpone the next automatic burst.
    if (clicks >= 5 && timer === null) schedule();
  }
  scene.addEventListener('click', celebrate);
  scene.addEventListener('keydown', event => {
    if (event.target !== scene || event.repeat || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    celebrate(event);
  });
  motion.addEventListener('click', () => {
    paused = !paused;
    scene.dataset.motionOptIn = String(!paused);
    if (paused) engine?.stop();
    schedule();
    renderStatus();
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      paused = true;
      scene.dataset.motionOptIn = 'false';
      engine?.stop();
      schedule();
      renderStatus();
    }
  });
  document.addEventListener('visibilitychange', () => {
    scene.dataset.suspended = String(document.hidden);
    if (document.hidden) engine?.stop();
    schedule();
  });
  window.addEventListener('pagehide', () => { clearInterval(timer); engine?.stop(); });
  window.addEventListener('pageshow', schedule);
  renderStatus();
})();
