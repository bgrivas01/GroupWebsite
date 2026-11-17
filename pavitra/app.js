
const root = document.querySelector('#portfolio-root');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let mode = '', states = [];
const properties = ['transform', 'opacity', 'left', 'top', 'width', 'height', 'borderRadius'];


const spring = Array.from({length: 41}, (_, i) => {
  const t = i / 40 * .8;
  return i === 40 ? 1 : 1 - 1.25 * Math.exp(-10*t) + .25 * Math.exp(-50*t);
});
const easing = `linear(${spring.join(',')})`;
function styleValues(el) {
  const css = getComputedStyle(el);
  return Object.fromEntries(properties.map(key => [key, css[key]]));
}
function animateState(base, target, entering, preserveCurrent = true) {
  for (const el of [...target.children]) {
    const className = [...el.classList].find(c => c.startsWith('ui-'));
    const counterpart = className && base.querySelector('.' + className);
    if (!counterpart) continue;
    const running = el.getAnimations().filter(animation => animation.id === 'hover-state');
    const current = running.length && preserveCurrent ? styleValues(el) : null;
    running.forEach(animation => animation.cancel());
    if (reducedMotion.matches) continue;
    const a = styleValues(counterpart), b = styleValues(el);
    for (const key of properties) if (a[key] === 'auto' || b[key] === 'auto') { delete a[key]; delete b[key]; }
    if (current) for (const key of Object.keys(current)) if (!(key in a)) delete current[key];
    const animation = el.animate([current || (entering ? a : b), entering ? b : a], {duration:800, easing});
    animation.id = 'hover-state';
  }
}
function installStates() {
  for (const state of states) {
    const base = root.querySelector(state.selector);
    if (!base || base.closest('.portfolio-interaction')) continue;
    const wrapper = document.createElement('div');
    wrapper.className = 'portfolio-interaction';
    wrapper.dataset.preview = state.name;
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', state.name + ' preview');
    base.before(wrapper); wrapper.append(base);

    base.querySelectorAll('a').forEach(a => a.tabIndex = -1);
    if (base.matches('a')) base.tabIndex = -1;
    const overlay = document.createElement('div');
    overlay.className = 'portfolio-hover';
    overlay.innerHTML = state.html;
    overlay.setAttribute('aria-hidden','true');
    overlay.querySelectorAll('audio').forEach(a => a.remove());
    overlay.querySelectorAll('a').forEach(a => { a.tabIndex=-1; a.addEventListener('click', e=>e.preventDefault()); });
    if (state.name === 'status') overlay.querySelector('.ui-l9xn0j').style.opacity='1';
    wrapper.append(overlay);
    let active=false;
    const show=()=>{
      if(active)return;
      active=true;
      const visible = Number(getComputedStyle(overlay).opacity) > 0;
      animateState(base, overlay.firstElementChild, true, visible);
      overlay.style.opacity='1';
    };
    const hide=e=>{
      if(wrapper.contains(e.relatedTarget)||!active)return;
      active=false;
      animateState(base,overlay.firstElementChild,false);

      overlay.style.opacity='0';
    };
    wrapper.addEventListener('pointerover',show);
    wrapper.addEventListener('mouseover',show);
    wrapper.addEventListener('focusin',show);
    wrapper.addEventListener('pointerout',hide);
    wrapper.addEventListener('mouseout',hide);
    wrapper.addEventListener('focusout',hide);
  }
  installGradient();
}
function installGradient() {
  root.querySelectorAll('[style*="conic-gradient"]').forEach(el=>{
    if(el.dataset.animated||reducedMotion.matches)return;
    el.dataset.animated='true';

    el.animate([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration:14400,iterations:Infinity,easing:'linear'});
  });
}
function installHeroCursor() {
  document.querySelector('.portfolio-cursor')?.remove();
  const hero=root.querySelector('.ui-197087o');
  if(!hero||!matchMedia('(pointer:fine)').matches)return;
  const cursor=document.createElement('div');
  cursor.className='portfolio-cursor';cursor.textContent='about →';cursor.setAttribute('aria-hidden','true');
  document.body.append(cursor);
  hero.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    cursor.hidden=false;
    cursor.style.left=Math.min(innerWidth-115, Math.max(0,e.clientX+12))+'px';
    cursor.style.top=Math.min(innerHeight-76, Math.max(0,e.clientY+12))+'px';
  });
  hero.addEventListener('pointerleave',()=>cursor.hidden=true);
  cursor.hidden=true;
}
function animateEntrance() {
  if (reducedMotion.matches) return;
  const startTime = document.timeline.currentTime;
  for (const entry of entranceAnimations[mode]) {
    const el = root.querySelector(`[data-ui-appear-id="${entry.id}"]`);
    if (!el || !el.getClientRects().length) continue;
    for (const {property, values, timing} of entry.tracks) {
      const animation = el.animate({[property]: values}, timing);
      animation.id = `entrance-${entry.id}-${property}`;
      animation.startTime = startTime;
    }
  }
}
function render() {
  const next=innerWidth<810?'mobile':innerWidth<1200?'tablet':'desktop';
  if(next===mode)return;
  const firstRender = !mode;
  mode=next;
  root.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
  root.replaceChildren(document.querySelector('#view-'+mode).content.cloneNode(true));
  root.querySelectorAll('a').forEach(a=>{
    a.dataset.originalHref=a.getAttribute('href')||'';
    a.removeAttribute('target');a.href='#';a.addEventListener('click',e=>e.preventDefault());
  });
  installStates();installHeroCursor();tick();
  if (firstRender) animateEntrance();
}
function tick(){

  const time=new Date().toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true});
  root.querySelectorAll('h4').forEach(e=>{if(/^\d{1,2}:\d{2}:\d{2}\s[AP]M$/.test(e.textContent.trim()))e.textContent=time;});
}
render();addEventListener('resize',render);setInterval(tick,1000);
fetch('hover-states.json').then(r=>{if(!r.ok)throw Error('Hover states unavailable');return r.json();}).then(data=>{states=data;installStates();}).catch(console.error);
reducedMotion.addEventListener('change',()=>{
  root.getAnimations({subtree:true}).forEach(a=>a.cancel());
  root.querySelectorAll('[data-animated]').forEach(el=>delete el.dataset.animated);
  installGradient();
});
