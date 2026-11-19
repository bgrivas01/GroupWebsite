(() => {
  'use strict';
  const scene = document.querySelector('#scene');
  const container = document.querySelector('#fireworks');
  const orbit = document.querySelector('.portfolios');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  let clicks = 0;
  let timer = null;
  let engine = null;

  // All images and hit targets share the supplied 1920 x 1080 artboard.
  let hovered = null;
  const states = [...document.querySelectorAll('.hover-state')];
  function showMember() {
    const member = hovered || (orbit.contains(document.activeElement) ? document.activeElement : null);
    for (const image of states) {
      image.classList.toggle('is-active', image.dataset.state === member?.dataset.state && image.complete && image.naturalWidth > 0);
    }
  }
  for (const image of states) image.addEventListener('load', showMember);
  for (const member of orbit.querySelectorAll('.member')) {
    member.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') { hovered = member; showMember(); }
    });
    member.addEventListener('pointerleave', () => { hovered = null; showMember(); });
    member.addEventListener('click', event => {
      event.stopPropagation();
      if (member.getAttribute('aria-disabled') === 'true') event.preventDefault();
    });
  }
  orbit.addEventListener('focusin', () => { hovered = null; showMember(); });
  orbit.addEventListener('focusout', () => queueMicrotask(showMember));

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
  }

  function launch(x, y) {
    if (!engine || paused || document.hidden) return;
    // launch() runs until the particles fade, avoiding an idle animation loop.
    engine.updateOptions({ mouse: { move: x !== undefined } });
    if (!engine.isRunning) engine.start();
    if (x !== undefined) {
      const canvas = container.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      // The library subtracts offsetLeft/Top, so account for our centered artboard.
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: x - rect.left + canvas.offsetLeft, clientY: y - rect.top + canvas.offsetTop }));
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
  reducedMotion.addEventListener('change', event => {
    paused = event.matches;
    if (paused) engine?.stop();
    schedule();
    renderStatus();
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
