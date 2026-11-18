
const root = document.querySelector('#portfolio-root');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let mode = '', states = [];
const properties = ['transform', 'opacity', 'left', 'top', 'width', 'height', 'borderRadius'];


const spring = Array.from({length: 41}, (_, i) => {
  const t = i / 40 * .8;
  return i === 40 ? 1 : 1 - 1.25 * Math.exp(-10*t) + .25 * Math.exp(-50*t);
});
const easing = `linear(${spring.join(',')})`;
const destinations = {
  connect: {href:'https://www.linkedin.com/in/pavipatil/', label:'Connect with Pavitra on LinkedIn'},
  status: {href:'mailto:pavitrapatil333@gmail.com', label:'Email Pavitra'}
};
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
    let base = root.querySelector(state.selector);
    if (!base || base.closest('.portfolio-interaction')) continue;
    const destination = destinations[state.name];
    if(destination && base.matches('a')){
      const surface=document.createElement('div');
      for(const attribute of base.attributes)if(!['href','tabindex'].includes(attribute.name))surface.setAttribute(attribute.name,attribute.value);
      surface.append(...base.childNodes);base.replaceWith(surface);base=surface;
    }
    const wrapper = document.createElement(destination ? 'a' : 'div');
    wrapper.className = 'portfolio-interaction';
    wrapper.dataset.preview = state.name;
    wrapper.tabIndex = 0;
    if (destination) {
      wrapper.href = destination.href;
      wrapper.setAttribute('aria-label', destination.label);
      if (state.name === 'connect') { wrapper.target='_blank'; wrapper.rel='noopener noreferrer'; }
    } else {
      wrapper.setAttribute('role', 'button');
      wrapper.setAttribute('aria-pressed', 'false');
      wrapper.setAttribute('aria-label', state.name.replace('-', ' ') + ' preview; details coming soon');
    }
    base.before(wrapper); wrapper.append(base);

    base.querySelectorAll('a').forEach(a => a.tabIndex = -1);
    if (base.matches('a')) base.tabIndex = -1;
    const overlay = document.createElement('div');
    overlay.className = 'portfolio-hover';
    overlay.innerHTML = state.html;
    if(destination)overlay.querySelectorAll('a').forEach(link=>{
      const surface=document.createElement('div');
      for(const attribute of link.attributes)if(!['href','target','tabindex'].includes(attribute.name))surface.setAttribute(attribute.name,attribute.value);
      surface.append(...link.childNodes);link.replaceWith(surface);
    });
    overlay.setAttribute('aria-hidden','true');
    overlay.querySelectorAll('audio').forEach(a => a.remove());
    overlay.querySelectorAll('a').forEach(a => { a.tabIndex=-1; a.addEventListener('click', e=>e.preventDefault()); });
    if (state.name === 'status') overlay.querySelector('.ui-l9xn0j').style.opacity='1';
    wrapper.append(overlay);
    let active=false, hovered=false, focused=false, pinned=false, dismissed=false;
    const show=()=>{
      if(active)return;
      active=true;
      wrapper.dataset.hoverActive='true';
      if (!destination) wrapper.setAttribute('aria-pressed','true');
      const visible = Number(getComputedStyle(overlay).opacity) > 0;
      animateState(base, overlay.firstElementChild, true, visible);
      overlay.style.opacity='1';
    };
    const hide=()=>{
      if(!active)return;
      active=false;
      wrapper.dataset.hoverActive='false';
      if (!destination) wrapper.setAttribute('aria-pressed','false');
      animateState(base,overlay.firstElementChild,false);

      overlay.style.opacity='0';
    };
    const update=()=>{if((hovered||focused||pinned)&&!dismissed)show();else hide();};
    wrapper.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;hovered=true;dismissed=false;update();});
    wrapper.addEventListener('pointerleave',()=>{hovered=false;update();});
    wrapper.addEventListener('focusin',()=>{focused=true;dismissed=false;update();});
    wrapper.addEventListener('focusout',e=>{if(wrapper.contains(e.relatedTarget))return;focused=false;pinned=false;dismissed=false;update();});
    const toggle=()=>{pinned=!pinned;dismissed=!pinned;update();};
    if (!destination) wrapper.addEventListener('click',toggle);
    wrapper.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();pinned=false;dismissed=true;update();}
      if(!destination&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggle();}
    });
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
  const focusedPreview = document.activeElement?.closest('[data-preview]')?.dataset.preview;
  mode=next;
  root.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
  root.replaceChildren(document.querySelector('#view-'+mode).content.cloneNode(true));
  root.querySelectorAll('a').forEach(a=>{
    a.removeAttribute('target');a.removeAttribute('href');a.tabIndex=-1;
  });
  root.querySelectorAll('.portfolio-hero').forEach(hero=>{
    hero.href='about.html';hero.tabIndex=0;hero.setAttribute('aria-label','About Pavitra Patil');
  });
  for(const [selector,name] of [['.ui-aCoJp','connect'],['.ui-PNQnN','status']]){
    const link=root.querySelector(selector),destination=destinations[name];
    if(link){link.href=destination.href;link.tabIndex=0;link.setAttribute('aria-label',destination.label);}
  }
  installStates();installHeroCursor();tick();
  if(focusedPreview)root.querySelector(`[data-preview="${focusedPreview}"]`)?.focus({preventScroll:true});
  if (firstRender) animateEntrance();
}
function tick(){

  const time=new Date().toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true});
  root.querySelectorAll('[data-clock]').forEach(e=>{e.textContent=time;e.dateTime=new Date().toISOString();});
}
render();addEventListener('resize',render);setInterval(tick,1000);
fetch('hover-states.json').then(r=>{if(!r.ok)throw Error('Hover states unavailable');return r.json();}).then(data=>{states=data;installStates();}).catch(console.error);
reducedMotion.addEventListener('change',()=>{
  root.getAnimations({subtree:true}).forEach(a=>a.cancel());
  root.querySelectorAll('[data-animated]').forEach(el=>delete el.dataset.animated);
  installGradient();
});
