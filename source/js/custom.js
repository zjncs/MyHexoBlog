/* ==========================================================================
   Custom JS Interactions
   Desktop-first, animated, but rate-limited.
   ========================================================================== */

console.log(
  '%c Hacker OS %c Cinematic ',
  'background: #05060a; padding: 1px; border-radius: 3px 0 0 3px; color: #00eaff',
  'background: linear-gradient(90deg, #00eaff, #ff3cac); padding: 1px; border-radius: 0 3px 3px 0; color: #05060a'
);

const hackerUI = (() => {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const allowEnhancedMotion = () => !reducedMotion.matches && finePointer.matches && window.innerWidth >= 1100;
  const allowAmbientMotion = () => !reducedMotion.matches && window.innerWidth >= 993;

  const ensureCardLayers = card => {
    if (!card.querySelector('.card-grid-overlay')) {
      const grid = document.createElement('div');
      grid.className = 'card-grid-overlay';
      card.appendChild(grid);
    }

    if (!card.querySelector('.card-neon')) {
      const neon = document.createElement('div');
      neon.className = 'card-neon';
      card.appendChild(neon);
    }

    if (!card.querySelector('.card-glow')) {
      const glow = document.createElement('div');
      glow.className = 'card-glow';
      card.appendChild(glow);
    }
  };

  const setupNavScroll = () => {
    const nav = document.getElementById('nav');
    if (!nav) return;

    const toggle = () => {
      nav.classList.toggle('nav-scrolled', window.scrollY > 50);
    };

    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
  };

  const setupScrollIndicator = () => {
    const bar = document.querySelector('#scroll-indicator');
    if (bar) bar.remove();
  };

  const setupCardTilt = () => {
    const cards = document.querySelectorAll('#recent-posts > .recent-post-items > .recent-post-item, #recent-posts > .recent-post-item');
    if (!cards.length) return;

    cards.forEach(ensureCardLayers);
    if (!allowEnhancedMotion()) return;

    const maxTilt = 5;

    cards.forEach(card => {
      let rafId = 0;
      let lastEvent = null;

      const update = () => {
        if (!lastEvent) return;

        const rect = card.getBoundingClientRect();
        const x = lastEvent.clientX - rect.left;
        const y = lastEvent.clientY - rect.top;
        const midX = rect.width / 2;
        const midY = rect.height / 2;
        const percentX = clamp((x - midX) / midX, -1, 1);
        const percentY = clamp((y - midY) / midY, -1, 1);

        card.style.setProperty('--tilt-x', `${percentY * maxTilt * -1}deg`);
        card.style.setProperty('--tilt-y', `${percentX * maxTilt}deg`);
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
        rafId = 0;
      };

      const onMove = event => {
        lastEvent = event;
        if (rafId) return;
        rafId = requestAnimationFrame(update);
      };

      const reset = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        lastEvent = null;
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
        card.style.setProperty('--mouse-x', '50%');
        card.style.setProperty('--mouse-y', '50%');
      };

      card.addEventListener('pointermove', onMove, { passive: true });
      card.addEventListener('pointerleave', reset, { passive: true });
    });
  };

  const setupCursorPulse = () => {
    if (!allowEnhancedMotion()) return;

    let lastPulse = 0;
    let pulseCount = 0;

    const spawnPulse = (x, y, className = '') => {
      const pulse = document.createElement('span');
      pulse.className = className ? `cursor-pulse ${className}` : 'cursor-pulse';
      pulse.style.left = `${x}px`;
      pulse.style.top = `${y}px`;
      document.body.appendChild(pulse);
      window.setTimeout(() => pulse.remove(), className ? 1400 : 1100);
    };

    window.addEventListener('pointermove', event => {
      const now = performance.now();
      if (now - lastPulse < 78) return;
      lastPulse = now;
      pulseCount += 1;

      spawnPulse(event.clientX, event.clientY);
      if (pulseCount % 2 === 0) {
        window.setTimeout(() => {
          spawnPulse(event.clientX - 10, event.clientY - 6, 'cursor-pulse--echo');
        }, 22);
      }
    }, { passive: true });
  };

  const setupParallaxHeader = () => {
    if (!allowEnhancedMotion()) return;

    const layers = document.querySelectorAll('.parallax-layer');
    if (!layers.length) return;

    let rafId = 0;
    let lastEvent = null;

    const render = () => {
      if (!lastEvent) return;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = (lastEvent.clientX - centerX) / centerX;
      const dy = (lastEvent.clientY - centerY) / centerY;

      layers.forEach(layer => {
        const depth = parseFloat(layer.dataset.depth || '0.2');
        layer.style.setProperty('--parallax-x', `${-dx * depth * 18}px`);
        layer.style.setProperty('--parallax-y', `${-dy * depth * 18}px`);
      });

      rafId = 0;
    };

    window.addEventListener('pointermove', event => {
      lastEvent = event;
      if (rafId) return;
      rafId = requestAnimationFrame(render);
    }, { passive: true });
  };

  const setupLiveTime = () => {
    const target = document.querySelector('[data-live-time]');
    if (!target) return;

    const start = new Date(target.dataset.liveTime);
    if (!start.getTime()) return;

    const update = () => {
      const diff = Date.now() - start.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      target.textContent = `${days}d ${hours}h ${mins}m online`;
    };

    update();
    window.setInterval(update, 60 * 1000);
  };

  const setupFloatingChips = () => {
    const chips = document.querySelectorAll('.chip-ghost');
    if (!chips.length) return;

    chips.forEach((chip, index) => {
      chip.style.animationDelay = `${index * 0.08}s`;
    });
  };

  const setupRipples = () => {
    if (!allowEnhancedMotion()) return;

    const targets = document.querySelectorAll('.btn-ripple, .button, button');
    if (!targets.length) return;

    const spawn = (event, target) => {
      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      const rect = target.getBoundingClientRect();
      wave.style.left = `${event.clientX - rect.left}px`;
      wave.style.top = `${event.clientY - rect.top}px`;
      target.appendChild(wave);
      window.setTimeout(() => wave.remove(), 750);
    };

    targets.forEach(target => {
      target.classList.add('btn-ripple');
      target.addEventListener('pointerdown', event => spawn(event, target), { passive: true });
    });
  };

  const setupAutoGlow = () => {
    const cards = document.querySelectorAll('#recent-posts > .recent-post-items > .recent-post-item, #recent-posts > .recent-post-item');
    if (!cards.length) return;

    cards.forEach(ensureCardLayers);
    if (!allowEnhancedMotion()) return;

    let index = 0;
    window.setInterval(() => {
      const card = cards[index % cards.length];
      const glow = card.querySelector('.card-glow');
      if (!glow) return;

      glow.style.left = `${18 + Math.random() * 64}%`;
      glow.style.top = `${14 + Math.random() * 68}%`;
      glow.style.transform = 'translate(-50%, -50%)';
      glow.classList.add('is-active');
      window.setTimeout(() => glow.classList.remove('is-active'), 850);
      index += 1;
    }, 2600);
  };

  const setupNoiseOverlay = () => {
    if (!allowAmbientMotion()) return;
    if (document.querySelector('.noise-overlay')) return;

    const noise = document.createElement('div');
    noise.className = 'noise-overlay';
    document.body.appendChild(noise);
  };

  const init = () => {
    setupNavScroll();
    setupScrollIndicator();
    setupCardTilt();
    setupCursorPulse();
    setupParallaxHeader();
    setupLiveTime();
    setupFloatingChips();
    setupRipples();
    setupAutoGlow();
    setupNoiseOverlay();
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  hackerUI.init();
});
