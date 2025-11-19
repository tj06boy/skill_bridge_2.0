// Main UI behaviors: mode toggle, reveal animations, scrollytelling, and UI helpers
document.addEventListener('DOMContentLoaded', () => {
  const reveals = document.querySelectorAll('.reveal');
  let revealIO = null;

  function initReveal(){
    if (revealIO || !('IntersectionObserver' in window) || !reveals.length) return;
    revealIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, {threshold: 0.12});
    reveals.forEach(r => { r.classList.remove('active'); revealIO.observe(r); });
  }

  initReveal();

    // Small animation: floating effect for hero text
    const hero = document.getElementById('hero');
    if (hero) {
      let t = 0;
      setInterval(() => {
        t += 0.01;
        hero.style.transform = `translateY(${Math.sin(t) * 2}px)`;
      }, 30);

      // Per-letter micro-parallax that supports the .concept-two structure
      const heroContainer = hero.querySelector('.concept-two') || hero.querySelector('h1');
      if (heroContainer) {
        // collect all heading cells (support both .hover > h1 and fallback spans)
        const letterEls = heroContainer.querySelectorAll('.hover h1, h1 span, h1');

        function onHeroPointer(e){
          letterEls.forEach(el => {
            const r = el.getBoundingClientRect();
            const elCx = r.left + r.width / 2;
            const elCy = r.top + r.height / 2;
            const dx = e.clientX - elCx;
            const dy = e.clientY - elCy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const max = 120; // effect radius
            const strength = Math.max(0, (max - dist) / max);
            const tx = (dx / max) * 6 * strength;
            const ty = (dy / max) * 6 * strength;
            const rz = (dx / max) * 6 * strength;
            el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rz}deg)`;
          });
        }
        function resetLetters(){
          letterEls.forEach(el => el.style.transform = 'none');
        }

        heroContainer.addEventListener('pointermove', onHeroPointer, {passive:true});
        heroContainer.addEventListener('pointerleave', resetLetters);

        // Make each .hover interactive: add focusability and toggle fill on enter/leave
        const hoverBlocks = heroContainer.querySelectorAll('.hover');
        hoverBlocks.forEach(block => {
          // ensure focusable for keyboard users
          if (!block.hasAttribute('tabindex')) block.setAttribute('tabindex', '0');
          const heading = block.querySelector('h1');
          if (!heading) return;
          block.addEventListener('pointerenter', () => heading.classList.add('fill'));
          block.addEventListener('pointerleave', () => heading.classList.remove('fill'));
          block.addEventListener('focus', () => heading.classList.add('fill'));
          block.addEventListener('blur', () => heading.classList.remove('fill'));
        });
      }
    }

  // Mouse-following background: update CSS variables for bg-orbit
  const root = document.documentElement;
  let raf = null;
  function onPointerMove(e){
    // normalized percentage values
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      root.style.setProperty('--mx', x + '%');
      root.style.setProperty('--my', y + '%');
    });
  }
  window.addEventListener('pointermove', onPointerMove, {passive:true});

  // Header hide on scroll: hide when scrolling down, show when scrolling up
  let lastScroll = window.scrollY;
  const header = document.querySelector('header');
  let tickingHeader = false;
  function onScrollHeader(){
    if (!header) return;
    const current = window.scrollY;
    if (!tickingHeader) {
      window.requestAnimationFrame(() => {
        if (current > lastScroll + 10 && current > 120) {
          // scrolling down
          header.classList.add('hide-header');
        } else if (current < lastScroll - 10) {
          // scrolling up
          header.classList.remove('hide-header');
        }
        lastScroll = current;
        tickingHeader = false;
      });
      tickingHeader = true;
    }
  }
  window.addEventListener('scroll', onScrollHeader, {passive:true});

  // -----------------------------
  // Magic-line menu (vanilla JS replacement for the jQuery snippet)
  // -----------------------------
  (function magicLine(){
    const menu = document.querySelector('.menu');
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll('.menu-item'));
    const wee = menu.querySelector('.wee');
    let current = menu.querySelector('.current-menu-item') || items[0];

    function positionLineTo(el){
      if (!wee || !el) return;
      // compute left relative to menu container
      const menuRect = menu.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const left = elRect.left - menuRect.left + elRect.width*0.0; // align to left of item
      wee.style.left = `${left}px`;
      wee.style.width = `${elRect.width}px`;
    }

    // initial placement
    positionLineTo(current);

    // attach hover/focus handlers
    items.forEach(item => {
      item.addEventListener('mouseenter', () => positionLineTo(item));
      item.addEventListener('focusin', () => positionLineTo(item));
      item.addEventListener('mouseleave', () => positionLineTo(current));
      item.addEventListener('focusout', () => positionLineTo(current));
      // make items focusable if they contain links (improves keyboard nav)
      const link = item.querySelector('a');
      if (link && !link.hasAttribute('tabindex')) link.setAttribute('tabindex','0');
    });

    // on window resize, re-position the line
    let rt; window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => positionLineTo(current), 120);
    });

    // update current when a link is clicked (so line stays with selected)
    menu.addEventListener('click', (ev) => {
      const item = ev.target.closest('.menu-item');
      if (!item) return;
      items.forEach(it => it.classList.remove('current-menu-item'));
      item.classList.add('current-menu-item');
      current = item;
      positionLineTo(current);
    });
  })();

  // Scroll-driven slider removed: Workshops Showcase and slider markup deleted.

  // -----------------------------
  // Scrollytelling logic
  // -----------------------------
  (function scrolly(){
    const scrolly = document.querySelector('.scrolly-workshops, .scrolly');
    if (!scrolly) return;
    const graphicText = scrolly.querySelector('.scrolly-graphic .graphic-content');
    const sessionCard = scrolly.querySelector('.session-card');
    const titleEl = sessionCard && sessionCard.querySelector('.session-title');
    const metaEl = sessionCard && sessionCard.querySelector('.session-meta');
    const descEl = sessionCard && sessionCard.querySelector('.session-desc');
    const prevBtn = scrolly.querySelector('.scrolly-prev');
    const nextBtn = scrolly.querySelector('.scrolly-next');

    const steps = Array.from(scrolly.querySelectorAll('.scrolly-step'));

    // build simple session data from steps (fallback to text content)
    const sessionData = steps.map(s => ({
      title: s.querySelector('h3')?.textContent || 'Session',
      desc: s.querySelector('p')?.textContent || '',
      meta: s.getAttribute('data-meta') || '3 hours • Intermediate • 30 seats'
    }));

    let currentIndex = -1; // -1 means none selected yet

    // default message in graphic panel (no workshop selected yet)
    if (graphicText) {
      graphicText.textContent = 'Click on the workshops to learn more';
      // make the default prompt visible so users see it before selecting a workshop
      graphicText.classList.add('visible');
      graphicText.classList.add('prompt');
    }
    if (sessionCard) {
      sessionCard.classList.remove('visible');
      sessionCard.setAttribute('aria-hidden', 'true');
    }

    // showDetails updates the graphic panel and session card. When setCurrent=true it
    // also marks the step as the current selected item. When temporary=true it won't
    // change the persisted currentIndex (used for hover previews).
    function showDetails(idx, {setCurrent = false, temporary = false, scrollIntoView = false} = {}){
      idx = Math.max(0, Math.min(steps.length - 1, idx));
      const el = steps[idx];

      // when setting current, update active classes
      if (setCurrent){
        currentIndex = idx;
        steps.forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        el.classList.add('pop');
        window.setTimeout(() => el.classList.remove('pop'), 520);
      }

      // update graphic label (animated)
      const name = sessionData[idx].title || '';
      if (graphicText){
        graphicText.classList.remove('prompt');
        graphicText.classList.remove('visible');
        void graphicText.offsetWidth;
        graphicText.textContent = name;
        window.requestAnimationFrame(() => graphicText.classList.add('visible'));
      }

      // update session card content
      if (sessionCard && titleEl && metaEl && descEl){
        titleEl.textContent = sessionData[idx].title;
        metaEl.textContent = sessionData[idx].meta;
        descEl.textContent = sessionData[idx].desc;
        // animate reveal for non-minimal
        sessionCard.classList.remove('visible');
        void sessionCard.offsetWidth;
        sessionCard.classList.add('visible');
        sessionCard.setAttribute('aria-hidden','false');
      }

      if (scrollIntoView && el && el.scrollIntoView){
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
      }
    }

    // wire up prev/next
    if (prevBtn){ prevBtn.addEventListener('click', () => showDetails(currentIndex - 1, {setCurrent:true, scrollIntoView:true})); }
    if (nextBtn){ nextBtn.addEventListener('click', () => showDetails(currentIndex + 1, {setCurrent:true, scrollIntoView:true})); }

    // keyboard navigation when the scrolly area is focused
    scrolly.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); showDetails(currentIndex - 1, {setCurrent:true, scrollIntoView:true}); }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); showDetails(currentIndex + 1, {setCurrent:true, scrollIntoView:true}); }
    });

    // make steps interactive: click (or Enter/Space) shows details in panel
    steps.forEach((s, i) => {
      if (!s.hasAttribute('tabindex')) s.setAttribute('tabindex','0');
      s.style.cursor = 'pointer';
      // click to show details (sets current)
      s.addEventListener('click', () => showDetails(i, {setCurrent:true, scrollIntoView:false}));
      // keyboard activation
      s.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); showDetails(i, {setCurrent:true, scrollIntoView:false}); }
      });
    });

    // No scroll-driven step activation: user clicks a workshop to view details.
  })();
});
