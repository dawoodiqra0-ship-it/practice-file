(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stagger content into view without making it wait on every external asset.
  const revealItems = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  revealItems.forEach((item) => revealObserver.observe(item));

  // Mobile navigation.
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (menuButton && mobileMenu) {
    const closeMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open menu');
      mobileMenu.classList.remove('open');
      document.body.classList.remove('menu-open');
    };
    menuButton.addEventListener('click', () => {
      const opening = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(opening));
      menuButton.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
      mobileMenu.classList.toggle('open', opening);
      document.body.classList.toggle('menu-open', opening);
    });
    mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    window.addEventListener('keydown', (event) => event.key === 'Escape' && closeMenu());
  }

  // A tiny opt-in interface tone — no audio is created until a visitor asks for it.
  const soundButton = document.querySelector('.sound-toggle');
  let audioContext;
  let soundOn = false;
  const playTone = (frequency = 420, duration = 0.045) => {
    if (!soundOn) return;
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.025, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };
  soundButton?.addEventListener('click', () => {
    soundOn = !soundOn;
    soundButton.setAttribute('aria-pressed', String(soundOn));
    soundButton.querySelector('.sound-label').textContent = soundOn ? 'Sound on' : 'Sound off';
    if (soundOn) playTone(530, 0.12);
  });
  document.querySelectorAll('a, button, .drag-card').forEach((target) => {
    if (target !== soundButton) target.addEventListener('pointerup', () => playTone(390));
  });

  // Desktop cursor follows immediately but scales only over interactive objects.
  const cursor = document.querySelector('.cursor-dot');
  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (event) => {
      cursor.style.transform = `translate(${event.clientX - 5}px, ${event.clientY - 5}px)`;
      cursor.style.opacity = '1';
    });
    document.querySelectorAll('a, button, .drag-card').forEach((item) => {
      item.addEventListener('pointerenter', () => cursor.classList.add('active'));
      item.addEventListener('pointerleave', () => cursor.classList.remove('active'));
    });
    document.documentElement.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
  }

  // Make the dashboard fragments genuinely draggable while keeping them inside the stage.
  const stage = document.querySelector('#drag-stage');
  stage?.querySelectorAll('.draggable').forEach((card) => {
    let dragState = null;

    const placeCard = (left, top) => {
      const maxLeft = Math.max(0, stage.clientWidth - card.offsetWidth);
      const maxTop = Math.max(0, stage.clientHeight - card.offsetHeight);
      card.style.left = `${Math.min(maxLeft, Math.max(0, left))}px`;
      card.style.top = `${Math.min(maxTop, Math.max(0, top))}px`;
      card.style.right = 'auto';
    };

    card.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const cardRect = card.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      dragState = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        left: cardRect.left - stageRect.left,
        top: cardRect.top - stageRect.top
      };
      placeCard(dragState.left, dragState.top);
      card.classList.add('dragging');
      card.setPointerCapture(event.pointerId);
      playTone(480, 0.06);
    });

    card.addEventListener('pointermove', (event) => {
      if (!dragState) return;
      placeCard(
        dragState.left + event.clientX - dragState.pointerX,
        dragState.top + event.clientY - dragState.pointerY
      );
    });

    const release = (event) => {
      if (!dragState) return;
      dragState = null;
      card.classList.remove('dragging');
      if (card.hasPointerCapture(event.pointerId)) card.releasePointerCapture(event.pointerId);
      playTone(340, 0.08);
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);

    card.addEventListener('keydown', (event) => {
      const directions = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
      if (!directions[event.key]) return;
      event.preventDefault();
      const cardRect = card.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      placeCard(
        cardRect.left - stageRect.left + directions[event.key][0],
        cardRect.top - stageRect.top + directions[event.key][1]
      );
    });
  });

  // Animated dot field used as the atmospheric layer in the hero panel.
  const canvas = document.querySelector('#field-canvas');
  const panel = document.querySelector('.hero-canvas');
  if (canvas && panel) {
    const context = canvas.getContext('2d', { alpha: true });
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let rafId;
    let time = 0;
    const pointer = { x: .72, y: .35, active: false };

    const resize = () => {
      const rect = panel.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const spacing = width < 600 ? 19 : 16;
      const centerX = width * pointer.x;
      const centerY = height * pointer.y;
      const radius = Math.min(width, height) * .29;
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) {
          const distance = Math.hypot(x - centerX, y - centerY);
          const field = Math.max(0, 1 - distance / radius);
          const wave = (Math.sin(x * .025 + time) + Math.cos(y * .023 - time * .72)) * .5;
          const size = .55 + field * (1.9 + wave * .8);
          const alpha = .12 + field * .2;
          context.beginPath();
          context.fillStyle = `rgba(53, 21, 86, ${alpha})`;
          context.arc(x, y, Math.max(.45, size), 0, Math.PI * 2);
          context.fill();
        }
      }
      time += reducedMotion ? 0 : .012;
      rafId = requestAnimationFrame(draw);
    };

    panel.addEventListener('pointermove', (event) => {
      const rect = panel.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
      pointer.active = true;
    });
    panel.addEventListener('pointerleave', () => { pointer.active = false; });
    new ResizeObserver(resize).observe(panel);
    resize();
    draw();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else draw();
    });
  }

  // Count up the confidence metric once it is in view.
  const countElement = document.querySelector('[data-count]');
  if (countElement) {
    const countObserver = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      const target = Number(countElement.dataset.count);
      if (reducedMotion) {
        countElement.textContent = target;
      } else {
        const started = performance.now();
        const tick = (now) => {
          const progress = Math.min(1, (now - started) / 1200);
          const eased = 1 - Math.pow(1 - progress, 4);
          countElement.textContent = Math.round(target * eased);
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
      countObserver.disconnect();
    }, { threshold: .4 });
    countObserver.observe(countElement);
  }

  // Restart network movement on demand.
  document.querySelector('.network-card .icon-button')?.addEventListener('click', () => {
    const map = document.querySelector('.network-map');
    map.style.animation = 'none';
    map.offsetHeight;
    map.style.animation = 'networkKick .65s cubic-bezier(.22,1,.36,1)';
  });

  // Restrained magnetic movement for major circular and pill actions.
  if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach((item) => {
      item.addEventListener('pointermove', (event) => {
        const rect = item.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .12;
        const y = (event.clientY - rect.top - rect.height / 2) * .12;
        item.style.transform = `translate(${x}px, ${y}px)`;
      });
      item.addEventListener('pointerleave', () => { item.style.transform = ''; });
    });
  }
})();
