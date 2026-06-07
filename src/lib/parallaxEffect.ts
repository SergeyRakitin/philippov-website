/**
 * Кинематографичный параллакс при скролле для Hero.
 * Фон плавно уезжает вверх + zoom-out, поверх — затемнение через fadeSelector,
 * контент и скролл-индикатор гаснут.
 *
 * Цвет затемнения задаётся в CSS (класс fadeSelector), JS пишет только opacity.
 * Возвращает cleanup-callback (на случай SPA-переходов; в этом проекте не нужен).
 */

export interface ParallaxConfig {
  bgSelector: string;
  fadeSelector: string;
  contentSelector?: string;
  indicatorSelector?: string;
  wrapperSelector: string;
}

const PARALLAX_DESKTOP = 0.25;
const PARALLAX_MOBILE = 0.12;
const SCALE_DESKTOP = 0.03;
const SCALE_MOBILE = 0.015;
const THRESHOLD = 0.26;
const MOBILE_BP = 768;

export function initParallax(config: ParallaxConfig): () => void {
  const bg = document.querySelector(config.bgSelector) as HTMLElement | null;
  const fade = document.querySelector(config.fadeSelector) as HTMLElement | null;
  const content = config.contentSelector
    ? (document.querySelector(config.contentSelector) as HTMLElement | null)
    : null;
  const indicator = config.indicatorSelector
    ? (document.querySelector(config.indicatorSelector) as HTMLElement | null)
    : null;
  const wrapper = document.querySelector(config.wrapperSelector) as HTMLElement | null;

  if (!bg || !fade || !wrapper) return () => {};

  // Кэшируем viewH — на mobile address bar прыгает, не пересчитываем на каждом scroll.
  let viewH = window.innerHeight;
  let isMobile = window.innerWidth <= MOBILE_BP;
  let parallax = isMobile ? PARALLAX_MOBILE : PARALLAX_DESKTOP;
  let scaleFactor = isMobile ? SCALE_MOBILE : SCALE_DESKTOP;

  let resizeTimer: ReturnType<typeof setTimeout>;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      viewH = window.innerHeight;
      isMobile = window.innerWidth <= MOBILE_BP;
      parallax = isMobile ? PARALLAX_MOBILE : PARALLAX_DESKTOP;
      scaleFactor = isMobile ? SCALE_MOBILE : SCALE_DESKTOP;
    }, 150);
  }

  let ticking = false;

  function update() {
    const scrolled = window.scrollY;
    const scrollRange = wrapper!.offsetHeight - viewH;
    const progress = Math.min(Math.max(scrolled / scrollRange, 0), 1);

    const scale = 1 - progress * scaleFactor;
    bg!.style.transform = `translateY(${-scrolled * parallax}px) scale(${scale})`;

    // Квадратичный easing после порога — плавное «втекание» в фон.
    const raw = progress <= THRESHOLD ? 0 : (progress - THRESHOLD) / (1 - THRESHOLD);
    fade!.style.opacity = String(raw * raw);

    if (content) {
      content.style.opacity = String(Math.max(1 - progress * 0.30, 0));
      content.style.transform = `translateY(${-scrolled * 0.28}px)`;
    }

    if (indicator) {
      indicator.style.opacity = String(Math.max(1 - scrolled / (viewH * 0.25), 0));
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  // Первичная отрисовка (на случай восстановления скролла при перезагрузке).
  update();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
  };
}
