document.addEventListener('DOMContentLoaded', () => {
  const shaderCanvas = document.querySelector('.shader-canvas');
  const bgImage = document.querySelector('.background-image');

  // ── Hamburger / mobile nav ──────────────────────────────────────────────
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks  = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      // Prevent body scroll while drawer is open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close drawer when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close drawer on backdrop click (outside menu)
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('open') &&
          !navLinks.contains(e.target) &&
          !hamburger.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ── rAF-throttled parallax on mousemove ────────────────────────────────
  let rafPending = false;
  let mouseX = 0.5, mouseY = 0.5;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        const moveX = (mouseX - 0.5) * -20;
        const moveY = (mouseY - 0.5) * -20;
        if (shaderCanvas) shaderCanvas.style.transform = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
        if (bgImage)      bgImage.style.transform      = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
        rafPending = false;
      });
    }
  });

  // ── Three.js shader (desktop only — skip on mobile for perf) ────────────
  if (typeof THREE !== 'undefined' && shaderCanvas && window.innerWidth > 900) {
    const scene    = new THREE.Scene();
    const camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    const width  = window.innerWidth * 1.1;
    const height = window.innerHeight * 1.1;
    renderer.setSize(width, height);
    shaderCanvas.appendChild(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime:       { value: 0 },
        iResolution: { value: new THREE.Vector2(width, height) }
      },
      vertexShader: `
            void main() {
              gl_Position = vec4(position, 1.0);
            }
          `,
      fragmentShader: `
            uniform float iTime;
            uniform vec2 iResolution;
    
            #define NUM_OCTAVES 3
    
            float rand(vec2 n) {
              return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }
    
            float noise(vec2 p) {
              vec2 ip = floor(p);
              vec2 u = fract(p);
              u = u*u*(3.0-2.0*u);
    
              float res = mix(
                mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
                mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
              return res * res;
            }
    
            float fbm(vec2 x) {
              float v = 0.0;
              float a = 0.3;
              vec2 shift = vec2(100);
              mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
              for (int i = 0; i < NUM_OCTAVES; ++i) {
                v += a * noise(x);
                x = rot * x * 2.0 + shift;
                a *= 0.4;
              }
              return v;
            }
    
            void main() {
              vec2 shake = vec2(sin(iTime * 1.2) * 0.005, cos(iTime * 2.1) * 0.005);
              vec2 p = ((gl_FragCoord.xy + shake * iResolution.xy) - iResolution.xy * 0.5) / iResolution.y * mat2(6.0, -4.0, 4.0, 6.0);
              vec2 v;
              vec4 o = vec4(0.0);
    
              float f = 2.0 + fbm(p + vec2(iTime * 5.0, 0.0)) * 0.5;
    
              for (float i = 0.0; i < 35.0; i++) {
                v = p + cos(i * i + (iTime + p.x * 0.08) * 0.025 + i * vec2(13.0, 11.0)) * 3.5 + vec2(sin(iTime * 3.0 + i) * 0.003, cos(iTime * 3.5 - i) * 0.003);
                float tailNoise = fbm(v + vec2(iTime * 0.5, i)) * 0.3 * (1.0 - (i / 35.0));
                vec4 auroraColors = vec4(
                  0.1 + 0.3 * sin(i * 0.2 + iTime * 0.4),
                  0.3 + 0.5 * cos(i * 0.3 + iTime * 0.5),
                  0.7 + 0.3 * sin(i * 0.4 + iTime * 0.3),
                  1.0
                );
                vec4 currentContribution = auroraColors * exp(sin(i * i + iTime * 0.8)) / length(max(v, vec2(v.x * f * 0.015, v.y * 1.5)));
                float thinnessFactor = smoothstep(0.0, 1.0, i / 35.0) * 0.6;
                o += currentContribution * (1.0 + tailNoise * 0.8) * thinnessFactor;
              }
    
              o = tanh(pow(o / 100.0, vec4(1.6)));
              gl_FragColor = o * 2.5;
            }
          `
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh     = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const animate = () => {
      material.uniforms.iTime.value += 0.016;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const newWidth  = window.innerWidth * 1.1;
      const newHeight = window.innerHeight * 1.1;
      renderer.setSize(newWidth, newHeight);
      material.uniforms.iResolution.value.set(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);
  }

  // ── Countdown Timer ────────────────────────────────────────────────────
  const daysEl    = document.getElementById('cd-days');
  const hoursEl   = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');

  if (daysEl && hoursEl && minutesEl && secondsEl) {
    const targetDate = new Date('2026-07-10T15:00:00+05:30');
    let isFirstCall  = true;

    function updateNumberWithBlur(el, newVal) {
      if (isFirstCall) { el.textContent = newVal; return; }
      if (el.textContent !== newVal) {
        el.classList.remove('blur-in');
        el.classList.add('blur-out');
        setTimeout(() => {
          el.textContent = newVal;
          el.classList.remove('blur-out');
          el.classList.add('blur-in');
          setTimeout(() => el.classList.remove('blur-in'), 450);
        }, 450);
      }
    }

    function updateCountdown() {
      const now        = new Date();
      const difference = targetDate - now;

      if (difference <= 0) {
        updateNumberWithBlur(daysEl,    '00');
        updateNumberWithBlur(hoursEl,   '00');
        updateNumberWithBlur(minutesEl, '00');
        updateNumberWithBlur(secondsEl, '00');
        isFirstCall = false;
        return;
      }

      const days    = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours   = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      const fmt     = (n) => n.toString().padStart(2, '0');

      updateNumberWithBlur(daysEl,    fmt(days));
      updateNumberWithBlur(hoursEl,   fmt(hours));
      updateNumberWithBlur(minutesEl, fmt(minutes));
      updateNumberWithBlur(secondsEl, fmt(seconds));
      isFirstCall = false;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);

    // Add to Calendar
    const calendarBtn = document.querySelector('.calendar-btn');
    if (calendarBtn) {
      calendarBtn.addEventListener('click', () => {
        const pad = (n) => n < 10 ? '0' + n : n;
        const fmt = (d) =>
          d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
          pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
        const startDate  = fmt(targetDate);
        const endDate    = fmt(new Date(targetDate.getTime() + 2 * 60 * 60 * 1000));
        const title      = encodeURIComponent('Event Horizon Launch');
        const details    = encodeURIComponent('Step into a world of cyber battles, strategic challenges, and unforgettable adventures.');
        window.open(
          `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`,
          '_blank'
        );
      });
    }

    // ── Scroll Stack (desktop only — skip pinning on mobile) ────────────
    const isMobile   = () => window.innerWidth <= 900;
    const stackCards = Array.from(document.querySelectorAll('.scroll-stack-card'));
    const wrappers   = Array.from(document.querySelectorAll('.scroll-stack-card-wrapper'));

    let lenis;
    if (typeof Lenis !== 'undefined') {
      lenis = new Lenis({
        duration:      1.2,
        easing:        t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel:   true,
        touchMultiplier: 2
      });

      // Smooth scroll for all internal anchor links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          const targetId = this.getAttribute('href');
          if (targetId === '#') return;
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            e.preventDefault();
            lenis.scrollTo(targetEl, { offset: -80 });
          }
        });
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    if (stackCards.length && wrappers.length && lenis) {
      let wrapperTops = [];
      let viewportHeight = 0;
      let stickyTop = 0;

      const updateMetrics = () => {
        viewportHeight = window.innerHeight;
        // Sticky offset (matches the top property in CSS)
        stickyTop = isMobile() ? viewportHeight * 0.02 : viewportHeight * 0.05;
        
        // Ensure z-index is set natively so they overlap correctly
        wrappers.forEach((wrapper, i) => {
          wrapper.style.zIndex = i + 1;
        });

        // We calculate absolute positions of wrappers. 
        // Because they use position: sticky and margin-bottom, their native flow 
        // position never changes even when they stick!
        wrapperTops = wrappers.map(w => w.getBoundingClientRect().top + window.scrollY);
      };

      const updateCardTransforms = () => {
        const scrollY = window.scrollY;

        wrappers.forEach((wrapper, i) => {
          const card = stackCards[i];
          const absoluteTop = wrapperTops[i];
          
          // distancePastSticky: how far the user has scrolled past this card's pinning point
          const distancePastSticky = (scrollY + stickyTop) - absoluteTop;

          if (distancePastSticky > 0) {
            // The card is pinned natively by CSS position: sticky.
            // We use JS purely to scale it down and push it up as subsequent cards scroll over it.
            
            // Determine distance to next card to calculate relative progression
            // Default to 40vh scroll distance if it's the last card
            const nextWrapperTop = i < wrappers.length - 1 ? wrapperTops[i + 1] : wrapperTops[i] + viewportHeight * 0.4;
            const distanceToNextCard = nextWrapperTop - absoluteTop;
            
            // progress: 0 when just pinned, 1 when next card reaches its sticky point
            const progress = distancePastSticky / distanceToNextCard;
            
            // Don't limit progress to 1 so older cards keep sinking deeply
            const clampedProgress = Math.max(0, progress);

            // Calculate scale and translateY to create the 3D stack offset
            const scale = 1 - (clampedProgress * 0.05); 
            const translateY = clampedProgress * -20; 
            const opacity = 1 - (clampedProgress * 0.2); // Fades out slowly as it gets buried

            // Floor values so they don't disappear completely or reverse scale
            const finalScale = Math.max(0.8, scale);
            const finalOpacity = Math.max(0, opacity);

            card.style.transform = `translate3d(0, ${translateY}px, 0) scale(${finalScale})`;
            card.style.opacity = finalOpacity;
          } else {
            // Card hasn't reached sticky point yet (normal flow coming up from bottom)
            card.style.transform = `translate3d(0, 0, 0) scale(1)`;
            card.style.opacity = 1;
          }
        });
      };

      // Initialize metrics
      updateMetrics();
      
      let lastWindowWidth = window.innerWidth;
      window.addEventListener('resize', () => {
        // On mobile, ignore vertical resizes (address bar hiding/showing) to prevent jitter
        if (isMobile() && window.innerWidth === lastWindowWidth) {
          return;
        }
        lastWindowWidth = window.innerWidth;
        
        // Temporarily clear transforms to get pure native layout metrics
        stackCards.forEach(card => {
          card.style.transform = '';
        });
        
        updateMetrics();
        updateCardTransforms();
      });

      lenis.on('scroll', updateCardTransforms);
      updateCardTransforms();
    }
  }
});
