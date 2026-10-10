const navLinks = [...document.querySelectorAll('nav a')];
const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          const active = link.getAttribute('href') === '#' + entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    }
  }, { rootMargin: '-8% 0px -60% 0px', threshold: 0 });
  sections.forEach(section => section && observer.observe(section));
}
document.getElementById('year').textContent = new Date().getFullYear();

const markCanvas = document.querySelector('[data-mark]');
if (markCanvas) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]];
  const edges = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const d = Math.hypot(vertices[i][0] - vertices[j][0], vertices[i][1] - vertices[j][1], vertices[i][2] - vertices[j][2]);
      if (Math.abs(d - 2) < 1e-6) edges.push([i, j]);
    }
  }
  const ctx = markCanvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let angleY = 0.5, angleX = 0.3, speed = 1, targetSpeed = 1, size = 0;

  const fitCanvas = () => {
    size = markCanvas.clientWidth || 44;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    markCanvas.width = size * dpr;
    markCanvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fitCanvas();
  new ResizeObserver(fitCanvas).observe(markCanvas);

  const styles = getComputedStyle(document.documentElement);
  const inkColor = styles.getPropertyValue('--ink').trim();
  const accentColor = styles.getPropertyValue('--accent').trim();

  const header = markCanvas.closest('.header');
  header.addEventListener('pointerenter', () => targetSpeed = 6);
  header.addEventListener('pointerleave', () => targetSpeed = 1);
  let lastScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    speed += Math.min(Math.abs(window.scrollY - lastScroll) * 0.02, 3);
    lastScroll = window.scrollY;
  }, { passive: true });

  const draw = () => {
    ctx.clearRect(0, 0, size, size);
    const cy = Math.cos(angleY), sy = Math.sin(angleY), cx = Math.cos(angleX), sx = Math.sin(angleX);
    const scale = size * 0.26, center = size / 2;
    const projected = vertices.map(([x, y, z]) => {
      const ry = y * cy - z * sy, rz = y * sy + z * cy;
      const rx = x * cx + ry * sx, rz2 = -x * sx + ry * cx;
      return [center + rx * scale, center + ry * scale, rz2];
    });
    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const depth = (projected[a][2] + projected[b][2]) / 2;
      ctx.strokeStyle = inkColor;
      ctx.globalAlpha = 0.25 + 0.6 * ((depth + phi) / (2 * phi));
      ctx.beginPath();
      ctx.moveTo(projected[a][0], projected[a][1]);
      ctx.lineTo(projected[b][0], projected[b][1]);
      ctx.stroke();
    }
    let front = 0;
    projected.forEach((p, i) => p[2] > projected[front][2] && (front = i));
    ctx.globalAlpha = 1;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(projected[front][0], projected[front][1], 2, 0, Math.PI * 2);
    ctx.fill();
  };

  if (reduceMotion) draw();
  else {
    const tick = () => {
      speed += (targetSpeed - speed) * 0.05;
      angleY += 0.006 * speed;
      angleX += 0.009 * speed;
      draw();
      requestAnimationFrame(tick);
    };
    tick();
  }
}


const writingFilters = [...document.querySelectorAll('[data-writing-filter]')];
const writingEntries = [...document.querySelectorAll('.writing-entry')];
writingFilters.forEach(button => {
  button.addEventListener('click', () => {
    const type = button.dataset.writingFilter;
    writingFilters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    let count = 0;
    writingEntries.forEach(entry => {
      entry.hidden = type !== 'all' && entry.dataset.type !== type;
      if (!entry.hidden) count++;
    });
    document.getElementById('writing-count').textContent = `${count} ${count === 1 ? 'article' : 'articles'}`;
    document.getElementById('writing-empty').hidden = count > 0;
  });
});
