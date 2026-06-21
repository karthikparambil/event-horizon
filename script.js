document.addEventListener('DOMContentLoaded', () => {
  const shaderCanvas = document.querySelector('.shader-canvas');
  const bgImage = document.querySelector('.background-image');

  // Subtle parallax effect on mouse move
  document.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    // Move image slightly in opposite direction of mouse
    const moveX = (x - 0.5) * -20;
    const moveY = (y - 0.5) * -20;

    if (shaderCanvas) shaderCanvas.style.transform = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
    if (bgImage) bgImage.style.transform = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
  });

  if (typeof THREE !== 'undefined' && shaderCanvas) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    const width = window.innerWidth * 1.1;
    const height = window.innerHeight * 1.1;
    renderer.setSize(width, height);
    shaderCanvas.appendChild(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
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
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const animate = () => {
      material.uniforms.iTime.value += 0.016;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const newWidth = window.innerWidth * 1.1;
      const newHeight = window.innerHeight * 1.1;
      renderer.setSize(newWidth, newHeight);
      material.uniforms.iResolution.value.set(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);
  }

  // Countdown Timer Logic
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');

  if (daysEl && hoursEl && minutesEl && secondsEl) {
    // Set target date for the countdown (e.g., 30 days from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    let isFirstCall = true;

    function updateNumberWithBlur(el, newVal) {
      if (isFirstCall) {
        el.textContent = newVal;
        return;
      }
      if (el.textContent !== newVal) {
        el.classList.remove('blur-in');
        el.classList.add('blur-out');
        setTimeout(() => {
          el.textContent = newVal;
          el.classList.remove('blur-out');
          el.classList.add('blur-in');
          setTimeout(() => {
            el.classList.remove('blur-in');
          }, 450);
        }, 450);
      }
    }

    function updateCountdown() {
      const now = new Date();
      const difference = targetDate - now;

      if (difference <= 0) {
        updateNumberWithBlur(daysEl, '00');
        updateNumberWithBlur(hoursEl, '00');
        updateNumberWithBlur(minutesEl, '00');
        updateNumberWithBlur(secondsEl, '00');
        isFirstCall = false;
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const format = (num) => num.toString().padStart(2, '0');

      updateNumberWithBlur(daysEl, format(days));
      updateNumberWithBlur(hoursEl, format(hours));
      updateNumberWithBlur(minutesEl, format(minutes));
      updateNumberWithBlur(secondsEl, format(seconds));
      
      isFirstCall = false;
    }

    updateCountdown(); // Initial call
    setInterval(updateCountdown, 1000);

    // Add to Calendar Logic
    const calendarBtn = document.querySelector('.calendar-btn');
    if (calendarBtn) {
      calendarBtn.addEventListener('click', () => {
        const pad = (n) => n < 10 ? '0' + n : n;
        const formatDateForICS = (date) => {
          return date.getUTCFullYear() +
                 pad(date.getUTCMonth() + 1) +
                 pad(date.getUTCDate()) + 'T' +
                 pad(date.getUTCHours()) +
                 pad(date.getUTCMinutes()) +
                 pad(date.getUTCSeconds()) + 'Z';
        };

        const startDate = formatDateForICS(targetDate);
        const endDateObj = new Date(targetDate.getTime() + 2 * 60 * 60 * 1000);
        const endDate = formatDateForICS(endDateObj);

        const title = encodeURIComponent('Event Horizon Launch');
        const details = encodeURIComponent('Step into a world of cyber battles, strategic challenges, and unforgettable adventures. The orbital infrastructure is ready.');
        
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
        
        window.open(googleCalendarUrl, '_blank');
      });
    }

    // Scroll Stack Logic (from React Bits)
    const stackCards = Array.from(document.querySelectorAll('.scroll-stack-card'));
    const wrappers = Array.from(document.querySelectorAll('.scroll-stack-card-wrapper'));
    if (stackCards.length && wrappers.length && typeof Lenis !== 'undefined') {
      const endElement = document.querySelector('.scroll-stack-end');
      
      const itemDistance = window.innerHeight * 0.10; // Exactly 10vh gap so the next card sits right below the screen
      const itemScale = 0.04;
      const itemStackDistance = 50; // How much they overlap when stacked
      const baseScale = 0.85;
      
      stackCards.forEach((card, i) => {
        if (i < stackCards.length - 1) {
          card.style.marginBottom = `${itemDistance}px`;
        }
      });

      const getElementOffset = (el) => {
        return el.getBoundingClientRect().top + window.scrollY;
      };

      const calculateProgress = (scrollTop, start, end) => {
        if (scrollTop < start) return 0;
        if (scrollTop > end) return 1;
        return (scrollTop - start) / (end - start);
      };

      let lastTransforms = new Map();

      const updateCardTransforms = () => {
        const scrollTop = window.scrollY;
        const containerHeight = window.innerHeight;
        const stackPositionPx = containerHeight * 0.10; // 10% to perfectly center 80vh card
        const scaleEndPositionPx = containerHeight * 0.05; // 5%
        
        const endElementTop = endElement ? getElementOffset(endElement) : 0;

        stackCards.forEach((card, i) => {
          const wrapper = wrappers[i];
          if (!wrapper) return;
          
          const cardTop = getElementOffset(wrapper);
          const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
          const triggerEnd = cardTop - scaleEndPositionPx;
          const pinStart = cardTop - stackPositionPx - itemStackDistance * i;
          const pinEnd = endElementTop - containerHeight / 2;

          const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
          const targetScale = baseScale + i * itemScale;
          const scale = 1 - scaleProgress * (1 - targetScale);

          let translateY = 0;
          const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

          if (isPinned) {
            translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
          } else if (scrollTop > pinEnd) {
            translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
          }

          const newTransform = {
            translateY: Math.round(translateY * 100) / 100,
            scale: Math.round(scale * 1000) / 1000,
          };

          const lastTransform = lastTransforms.get(i);
          const hasChanged = !lastTransform ||
            Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
            Math.abs(lastTransform.scale - newTransform.scale) > 0.001;

          if (hasChanged) {
            card.style.transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale})`;
            lastTransforms.set(i, newTransform);
          }
        });
      };

      const lenis = new Lenis({
        duration: 1.2,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2
      });

      // Smooth scroll for all internal anchor links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const targetId = this.getAttribute('href');
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            lenis.scrollTo(targetEl, { offset: -80 });
          }
        });
      });

      lenis.on('scroll', updateCardTransforms);

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      // Initial call
      updateCardTransforms();
    }
  }
});

