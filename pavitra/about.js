(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const elements = [...document.querySelectorAll([
    '.about-row > .about-visual', '.about-copy > *', '.about-signoff',
    '.about-section > h2', '.side-projects > article', '.camera-column > *',
    '.language-card', '.loves-list', '.about-contact > a', '.about-footer > *'
  ].join(','))];
  const pending = new Set(elements);
  const running = new Map();

  // Sample an overdamped spring: stiffness 150, damping 40, mass 1.
  const slow = (-40 + Math.sqrt(40 ** 2 - 4 * 150)) / 2;
  const fast = (-40 - Math.sqrt(40 ** 2 - 4 * 150)) / 2;
  const frames = Array.from({ length: 91 }, (_, index) => {
    const t = index / 90 * 1.8;
    const value = index === 90 ? 1 : 1 + (fast * Math.exp(slow * t) - slow * Math.exp(fast * t)) / (slow - fast);
    return { opacity: value, transform: `translateY(${80 * (1 - value)}px)`, offset: index / 90 };
  });

  function settle(element) {
    pending.delete(element);
    observer.unobserve(element);
    element.classList.remove('about-reveal-pending');
    const animation = running.get(element);
    running.delete(element);
    animation?.cancel();
  }

  function reveal(element) {
    if (!pending.delete(element)) return;
    observer.unobserve(element);
    try {
      const animation = element.animate(frames, { duration: 1800, delay: 100, fill: 'both' });
      animation.id = 'about-reveal';
      running.set(element, animation);
      animation.finished.then(() => {
        if (running.get(element) === animation) settle(element);
      }, () => {});
    } catch {
      settle(element);
    }
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
  }, { threshold: 0.15 });

  function showAll() {
    observer.disconnect();
    elements.forEach(settle);
  }

  try {
    elements.forEach(element => {
      element.classList.add('about-reveal-pending');
      observer.observe(element);
    });
  } catch {
    showAll();
  }
  // Keyboard navigation must never land on an invisible contact link.
  document.addEventListener('focusin', event => {
    const target = event.target.closest('.about-reveal-pending');
    if (target) settle(target);
  });
  motion.addEventListener('change', event => { if (event.matches) showAll(); });
  window.addEventListener('beforeprint', showAll);
})();
