
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
  status: {href:'mailto:pavitrapatil333@gmail.com', label:'Email Pavitra'},
  resume: {href:'assets/Pavitra-Patil-Resume.pdf', label:'View Pavitra\'s resume (PDF)'},
  'project-1': {href:'lunacaption.html', label:'LunaCaption project'},
  'project-2': {href:'games.html', label:'Games projects'},
  'project-3': {href:'refit.html', label:'RefIt project'},
  'project-4': {href:'uhd-tools.html', label:'UHD Extension and Course Planner project'}
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
      if (state.name === 'connect' || state.name === 'resume') { wrapper.target='_blank'; wrapper.rel='noopener noreferrer'; }
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
  root.querySelectorAll('.gallery-tile').forEach(tile=>{
    tile.href='gallery.html';tile.tabIndex=0;tile.setAttribute('aria-label','Art Gallery');
  });
  for(const [selector,name] of [['.ui-aCoJp','connect'],['.ui-PNQnN','status']]){
    const link=root.querySelector(selector),destination=destinations[name];
    if(link){link.href=destination.href;link.tabIndex=0;link.setAttribute('aria-label',destination.label);}
  }
  installStates();installHeroCursor();tick();paintWeather();
  if(focusedPreview)root.querySelector(`[data-preview="${focusedPreview}"]`)?.focus({preventScroll:true});
  if (firstRender) animateEntrance();
}
const HOUSTON={timeZone:'America/Chicago'};
function tick(){
  const now=new Date();
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{...HOUSTON,hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(now).map(p=>[p.type,p.value]));
  const hour=Number(new Intl.DateTimeFormat('en-US',{...HOUSTON,hour:'numeric',hourCycle:'h23'}).format(now));
  const greeting=hour<5?'Good night':hour<12?'Good morning':hour<17?'Good afternoon':hour<22?'Good evening':'Good night';
  const date=now.toLocaleDateString('en-US',{...HOUSTON,weekday:'short',month:'short',day:'numeric'});
  root.querySelectorAll('[data-clock]').forEach(e=>{
    const ampm=document.createElement('span');ampm.className='hero-ampm';ampm.textContent=parts.dayPeriod;
    e.replaceChildren(`${parts.hour}:${parts.minute}`,ampm);e.dateTime=now.toISOString();
  });
  root.querySelectorAll('[data-greeting]').forEach(e=>e.textContent=greeting);
  root.querySelectorAll('[data-date]').forEach(e=>e.textContent=date);
}

// Houston weather from Open-Meteo (no API key). Hidden if the request fails.
let weather=null;
const weatherIcons={
  clear:'<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  night:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  cloud:'<path d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.3A3.4 3.4 0 0 0 7 18z"/>',
  rain:'<path d="M7 15h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.3A3.4 3.4 0 0 0 7 15z"/><path d="M8.5 18.5l-1 2M12.5 18.5l-1 2M16.5 18.5l-1 2"/>',
  storm:'<path d="M7 14h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.3A3.4 3.4 0 0 0 7 14z"/><path d="M12.5 15.5l-2 3.5h3l-2 3.5"/>',
  fog:'<path d="M4 9h16M6 13h12M4 17h16"/>',
  snow:'<path d="M12 4v16M5 8l14 8M19 8L5 16"/>'
};
function describeWeather(code,isDay){
  if(code===0||code===1)return [isDay?'Clear':'Clear night',isDay?'clear':'night'];
  if(code<=3)return ['Cloudy','cloud'];
  if(code<=48)return ['Foggy','fog'];
  if(code<=67||(code>=80&&code<=82))return ['Rainy','rain'];
  if(code<=77||code===85||code===86)return ['Snowy','snow'];
  return ['Stormy','storm'];
}
function paintWeather(){
  if(!weather)return;
  root.querySelectorAll('[data-weather]').forEach(e=>{e.textContent=`${weather.temp}°F ${weather.label}`;e.hidden=false;});
  root.querySelectorAll('[data-weather-icon]').forEach(e=>{e.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${weatherIcons[weather.icon]}</svg>`;});
}
function loadWeather(){
  fetch('https://api.open-meteo.com/v1/forecast?latitude=29.76&longitude=-95.37&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=America%2FChicago')
    .then(r=>{if(!r.ok)throw Error('Weather unavailable');return r.json();})
    .then(d=>{const [label,icon]=describeWeather(d.current.weather_code,d.current.is_day===1);weather={temp:Math.round(d.current.temperature_2m),label,icon};paintWeather();})
    .catch(()=>{});
}
render();addEventListener('resize',render);setInterval(tick,1000);
loadWeather();setInterval(loadWeather,30*60*1000);
// Loaded via <script src="hover-states.js"> (not fetch) so it also works when opened from file://
states = hoverStates; installStates();
reducedMotion.addEventListener('change',()=>{
  root.getAnimations({subtree:true}).forEach(a=>a.cancel());
  root.querySelectorAll('[data-animated]').forEach(el=>delete el.dataset.animated);
  installGradient();
});
