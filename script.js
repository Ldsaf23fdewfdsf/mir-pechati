/* =========================================================
   МИР Печати — скрипты
   ========================================================= */

/* ---------- НАСТРОЙКИ ----------
   MyReviews (myreviews.ru): единый виджет отзывов Яндекс + 2ГИС,
   такой же, как у ВауПаспорт. Чтобы включить:
   1) зарегистрируйтесь на myreviews.ru (7 дней бесплатно),
   2) добавьте ссылки на Яндекс Карты и 2ГИС (см. README.md),
   3) создайте виджет «Блок» и скопируйте из кода uuid и name сюда.
   Пока uuid пустой, показываются вкладки Яндекс / 2ГИС. */
const MYREVIEWS = {
  uuid: '',   // например: 'ee6e080c-d466-4cd5-be7f-55f9cd7db355'
  name: '',   // например: 'g67325151'
};

/* Часы работы (время Мурманска = московское, UTC+3). 0 = воскресенье. */
const HOURS = {
  0: [11, 18], 1: [11, 19], 2: [11, 19], 3: [11, 19],
  4: [11, 19], 5: [11, 19], 6: [11, 18],
};

document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_OUT = 'cubic-bezier(.16, 1, .3, 1)';

/* ---------- Бургер ---------- */
const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');
if (burger && nav) {
  const close = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ---------- Открыто / закрыто ----------
   Считается по московскому времени при открытии страницы
   и пересчитывается раз в минуту, пока страница открыта. */
(function openStatus() {
  const nodes = document.querySelectorAll('[data-open-status]');
  if (!nodes.length) return;

  const update = () => {
    // Текущее время в Москве, независимо от часового пояса посетителя
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Moscow', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const now = Number(get('hour')) + Number(get('minute')) / 60;

    const [from, to] = HOURS[day];
    let text, cls;
    if (now >= from && now < to) {
      text = `Сейчас открыто · Работаем до ${to}:00 по МСК`;
      cls = 'is-open';
    } else if (now < from) {
      text = `Сейчас закрыто · Работаем сегодня с ${from}:00 по МСК`;
      cls = 'is-closed';
    } else {
      const next = HOURS[(day + 1) % 7][0];
      text = `Сегодня закрыто · Работаем завтра с ${next}:00 по МСК`;
      cls = 'is-closed';
    }
    nodes.forEach((n) => {
      n.textContent = text;
      n.classList.toggle('is-open', cls === 'is-open');
      n.classList.toggle('is-closed', cls === 'is-closed');
    });
  };

  update();
  setInterval(update, 60 * 1000);
})();

/* ---------- Отзывы ---------- */
(function reviews() {
  const tabsBox = document.getElementById('reviews-tabs');
  const unified = document.getElementById('myreviews');
  const rv = document.getElementById('rv');

  // Вариант 1: единый виджет MyReviews
  if (MYREVIEWS.uuid && unified && tabsBox) {
    tabsBox.hidden = true;
    if (rv) rv.hidden = true;
    unified.hidden = false;
    const s = document.createElement('script');
    s.src = 'https://myreviews.dev/widget/dist/index.js';
    s.async = true;
    s.onload = () => {
      try {
        new window.myReviews.BlockWidget({
          uuid: MYREVIEWS.uuid, name: MYREVIEWS.name,
          additionalFrame: 'none', lang: 'ru', widgetId: '0',
        }).init();
      } catch (err) {
        // виджет не поднялся — возвращаем вкладки
        unified.hidden = true;
        tabsBox.hidden = false;
        if (rv) rv.hidden = false;
      }
    };
    s.onerror = () => { unified.hidden = true; tabsBox.hidden = false; if (rv) rv.hidden = false; };
    document.body.appendChild(s);
    return;
  }

  // Вариант 2: своя карусель из reviews.js
  const list = Array.isArray(window.REVIEWS) ? window.REVIEWS.filter((r) => r && r.text) : [];
  if (rv && list.length) {
    reviewCarousel(rv, list, window.REVIEW_TAGS || []);
    if (tabsBox) tabsBox.hidden = true;
    return;
  }

  // Вариант 3: вкладки Яндекс / 2ГИС
  if (!tabsBox) return;
  const tabs = [...tabsBox.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      select(next); next.focus();
    });
  });

  // Виджет Яндекса грузим, только когда блок рядом с экраном
  const frame = tabsBox.querySelector('iframe[data-src]');
  if (frame) {
    const load = () => { frame.src = frame.dataset.src; frame.removeAttribute('data-src'); };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { load(); io.disconnect(); }
      }, { rootMargin: '600px 0px' });
      io.observe(tabsBox);
    } else {
      load();
    }
  }
})();

/* ---------- Карусель отзывов ---------- */
function reviewCarousel(root, all, tags) {
  const body = root.querySelector('.rv-body');
  const track = root.querySelector('.rv-track');
  const chipsBox = root.querySelector('.rv-chips');
  const dotsBox = root.querySelector('.rv-dots');
  const prev = root.querySelector('.rv-arrow--prev');
  const next = root.querySelector('.rv-arrow--next');
  body.hidden = false;

  const SOURCES = {
    yandex: { label: 'Яндекс Картах', short: 'Я', url: 'https://yandex.ru/maps/org/mir_pechati/25478937082/reviews/' },
    '2gis': { label: '2ГИС', short: '2Г', url: 'https://2gis.ru/snezhnogorsk/firm/70000001083035959/tab/reviews' },
  };
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const GRADIENTS = [
    ['#7ee8c3', '#3fb8f0'], ['#a6b4ff', '#f3a6d8'], ['#f7a6a6', '#f5c26b'],
    ['#9fe3ff', '#7d8bff'], ['#ffd36e', '#ff8fb1'], ['#b8f08f', '#40c9a2'],
  ];

  const fmtDate = (iso) => {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso || '';
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
  };
  const hash = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const card = (r) => {
    const src = SOURCES[r.source] || SOURCES.yandex;
    const name = (r.name || 'Гость').trim();
    const [g1, g2] = GRADIENTS[hash(name) % GRADIENTS.length];

    const li = el('li', 'rv-card');
    const head = el('div', 'rv-card__head');
    const ava = el('span', 'rv-card__ava', name[0].toUpperCase());
    ava.style.background = `linear-gradient(135deg, ${g1}, ${g2})`;
    ava.setAttribute('aria-hidden', 'true');
    const badge = el('span', `rv-card__badge rv-card__badge--${r.source === '2gis' ? 'gis' : 'ya'}`, src.short);
    ava.append(badge);

    const who = el('div', 'rv-card__who');
    who.append(el('b', null, name));
    const meta = el('span', 'rv-card__meta', `${fmtDate(r.date)} на `);
    const a = el('a', null, src.label);
    a.href = src.url; a.target = '_blank'; a.rel = 'noopener';
    meta.append(a);
    who.append(meta);
    head.append(ava, who);

    const rating = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
    const stars = el('span', 'rv-card__stars', '★'.repeat(rating) + '☆'.repeat(5 - rating));
    stars.setAttribute('aria-label', `Оценка ${rating} из 5`);

    const text = el('p', 'rv-card__text', r.text.trim());
    const more = el('button', 'rv-card__more', 'Читать дальше');
    more.type = 'button';
    more.hidden = true;
    more.addEventListener('click', () => {
      const open = li.classList.toggle('is-open');
      more.textContent = open ? 'Свернуть' : 'Читать дальше';
    });

    li.append(head, stars, text, more);
    return li;
  };

  // Фильтры
  let active = null;
  const usable = tags.filter((t) => all.some((r) => t.match.test(r.text)));
  const chips = usable.map((t) => {
    const b = el('button', 'rv-chip', t.label);
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      active = active === t ? null : t;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === b && active === t)));
      render(true);
    });
    chipsBox.append(b);
    return b;
  });
  chipsBox.hidden = !chips.length;

  const gap = () => parseFloat(getComputedStyle(track).columnGap) || 0;
  const cardStep = () => (track.firstElementChild?.getBoundingClientRect().width || track.clientWidth) + gap();
  const perView = () => Math.max(1, Math.floor((track.clientWidth + gap() + 1) / cardStep()));
  const pageStep = () => perView() * cardStep();
  const pages = () => Math.max(1, Math.ceil(track.children.length / perView()));
  const atEnd = () => track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  const page = () => (atEnd() ? pages() - 1 : Math.round(track.scrollLeft / pageStep()));

  const renderDots = () => {
    dotsBox.textContent = '';
    const n = pages();
    dotsBox.hidden = n < 2;
    for (let i = 0; i < n; i += 1) {
      const d = el('button', 'rv-dot');
      d.type = 'button';
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', `Страница ${i + 1} из ${n}`);
      d.addEventListener('click', () => track.scrollTo({ left: i * pageStep(), behavior: 'smooth' }));
      dotsBox.append(d);
    }
    syncUI();
  };
  const syncUI = () => {
    const p = page();
    [...dotsBox.children].forEach((d, i) => d.setAttribute('aria-selected', String(i === p)));
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = atEnd();
  };
  const markLong = () => {
    track.querySelectorAll('.rv-card').forEach((c) => {
      const t = c.querySelector('.rv-card__text');
      c.querySelector('.rv-card__more').hidden = c.classList.contains('is-open') ? false : t.scrollHeight <= t.clientHeight + 2;
    });
  };
  function render(animate = false) {
    track.textContent = '';
    (active ? all.filter((r) => active.match.test(r.text)) : all).forEach((r) => track.append(card(r)));
    track.scrollLeft = 0;
    markLong();
    renderDots();
    if (!animate || !Element.prototype.animate) return;
    [...track.children].forEach((c, i) => {
      c.animate(
        REDUCED_MOTION
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
        { duration: REDUCED_MOTION ? 200 : 420, delay: Math.min(i, 3) * 60, easing: EASE_OUT, fill: 'backwards' },
      );
    });
  }

  prev.addEventListener('click', () => track.scrollBy({ left: -pageStep(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: pageStep(), behavior: 'smooth' }));
  track.addEventListener('scroll', syncUI, { passive: true });
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
  });
  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { markLong(); renderDots(); }, 150); });

  render();
}

/* ---------- Шторка «до / после» ----------
   Тянуть можно за любое место фото (мышь, палец, стилус).
   Невидимый range оставлен для клавиатуры и экранных дикторов. */
document.querySelectorAll('.compare').forEach((box) => {
  const range = box.querySelector('.compare__range');
  let dragging = false;
  let touched = false;

  const setPos = (v) => {
    const pos = Math.max(0, Math.min(100, v));
    box.style.setProperty('--pos', `${pos}%`);
    if (range) range.value = String(Math.round(pos));
  };
  const touch = () => { touched = true; box.classList.add('is-touched'); };
  const fromPointer = (e) => {
    const r = box.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100;
  };

  box.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    touch();
    box.classList.add('is-dragging');
    box.setPointerCapture?.(e.pointerId);
    setPos(fromPointer(e));
  });
  box.addEventListener('pointermove', (e) => { if (dragging) setPos(fromPointer(e)); });
  const stop = () => { dragging = false; box.classList.remove('is-dragging'); };
  box.addEventListener('pointerup', stop);
  box.addEventListener('pointercancel', stop);
  box.addEventListener('lostpointercapture', stop);

  range?.addEventListener('input', () => { touch(); setPos(Number(range.value)); });
  setPos(Number(range?.value ?? 50));

  // Пока шторку не трогали руками, ею управляет прокрутка (см. scrollScenes)
  box.scrollDrive = (v) => { if (!touched && !dragging) setPos(v); };
});

/* ---------- Появление списков: короткая лесенка ---------- */
(function reveal() {
  const items = [...document.querySelectorAll('.reveal')];
  if (!items.length || !('IntersectionObserver' in window)) return;

  // задержка по порядку внутри своего списка, не больше 5 шагов
  const order = new Map();
  items.forEach((el) => {
    const i = order.get(el.parentElement) || 0;
    order.set(el.parentElement, i + 1);
    el.style.setProperty('--d', `${Math.min(i, 5) * 70}ms`);
  });

  document.documentElement.classList.add('reveal-ready');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('is-in');
      io.unobserve(el);
      // после появления убираем задержку, чтобы ховер срабатывал сразу
      setTimeout(() => el.style.removeProperty('--d'), 1000);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));
})();

/* ---------- Шапка уплотняется при прокрутке ---------- */
(function headerState() {
  const header = document.querySelector('.header');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ---------- Сцены, привязанные к прокрутке ----------
   Один обработчик scroll + requestAnimationFrame на всё.
   Двигаем только translate / rotate / text-shadow / clip-path — без пересчёта раскладки.
   При «уменьшить движение» остаётся только полоска прогресса. */
(function scrollScenes() {
  const root = document.documentElement;
  const bar = document.querySelector('.scroll-progress i');
  const hero = document.querySelector('.hero');
  const sheet = document.querySelector('.sheet');
  const stamp = document.querySelector('.stamp');
  const award = document.querySelector('.award');
  const ticker = document.querySelector('.ticker__track');
  const seal = document.querySelector('.guarantee__seal svg');
  const price = document.querySelector('[data-register]');
  const compares = [...document.querySelectorAll('.compare')];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const near = (el, vh) => {
    const r = el.getBoundingClientRect();
    return r.bottom > -200 && r.top < vh + 200 ? r : null;
  };

  if (!REDUCED_MOTION) root.classList.add('scroll-linked');
  let tickerHalf = 0;
  const measure = () => { tickerHalf = ticker ? ticker.scrollWidth / 2 : 0; };
  measure();

  let queued = false;
  function frame() {
    queued = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = root.scrollHeight - vh;

    // полоска «прогресса печати»
    if (bar) bar.style.clipPath = `inset(0 ${100 - clamp(max > 0 ? y / max : 0) * 100}% 0 0)`;
    if (REDUCED_MOTION) return;

    // первый экран: лист выпрямляется и уходит вверх, печать и награда — со своей скоростью.
    // Только когда лист стоит рядом с текстом: на узком экране он под текстом и наехал бы на него.
    if (hero && sheet && window.innerWidth > 900) {
      const p = clamp(y / hero.offsetHeight);
      sheet.style.translate = `0 ${(-p * 70).toFixed(1)}px`;
      sheet.style.rotate = `${(p * 3).toFixed(2)}deg`;
      if (stamp) {
        stamp.style.translate = `0 ${(-p * 150).toFixed(1)}px`;
        stamp.style.rotate = `${(p * 25).toFixed(1)}deg`;
      }
      if (award) award.style.translate = `${(-p * 40).toFixed(1)}px ${(-p * 30).toFixed(1)}px`;
    }

    // бегущая строка идёт в темпе прокрутки
    if (ticker && tickerHalf && near(ticker, vh)) {
      ticker.style.translate = `${(-((y * 0.45) % tickerHalf)).toFixed(1)}px 0`;
    }

    // печать гарантии проворачивается при прокрутке
    if (seal && near(seal, vh)) seal.style.rotate = `${(y * 0.12).toFixed(1)}deg`;

    // цена сводится из смещённых CMYK-слоёв по мере подхода к ней
    if (price) {
      const r = near(price, vh);
      if (r) {
        const f = 1 - clamp((vh * 0.95 - r.top) / (vh * 0.45));
        price.style.textShadow = f < 0.01 ? 'none'
          : `${(-9 * f).toFixed(1)}px ${(-3 * f).toFixed(1)}px 0 var(--c), ${(9 * f).toFixed(1)}px ${(3 * f).toFixed(1)}px 0 var(--m), ${(2 * f).toFixed(1)}px ${(8 * f).toFixed(1)}px 0 var(--y)`;
      }
    }

    // шторка «до/после»: «после» наезжает на «до» по мере прокрутки
    compares.forEach((box) => {
      const r = near(box, vh);
      if (!r || !box.scrollDrive) return;
      const t = clamp((vh * 0.9 - r.top) / (vh * 0.9 - vh * 0.15));
      box.scrollDrive(88 - t * 76);
    });
  }

  const request = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(frame);
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    if (window.innerWidth <= 900) [sheet, stamp, award].forEach((el) => { if (el) { el.style.translate = ''; el.style.rotate = ''; } });
    request();
  });
  window.addEventListener('load', () => { measure(); request(); });
  frame();
})();

/* ---------- Мобильная панель: прячется, пока видны кнопки первого экрана ---------- */
(function dockState() {
  const dock = document.querySelector('.dock');
  const heroCta = document.querySelector('.hero__cta');
  if (!dock || !heroCta || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => {
    dock.classList.toggle('is-tucked', e.isIntersecting);
  }).observe(heroCta);
})();

/* ---------- Бесконечные циклы стоят, когда их не видно ---------- */
(function pauseOffscreen() {
  const loops = document.querySelectorAll('.ticker-wrap, .guarantee__seal');
  if (!loops.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting));
  });
  loops.forEach((el) => io.observe(el));
})();

/* ---------- Меню «Оставить отзыв»: закрывать по клику мимо и Esc ---------- */
document.querySelectorAll('.rv-leave').forEach((d) => {
  document.addEventListener('click', (e) => { if (d.open && !d.contains(e.target)) d.open = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') d.open = false; });
});

/* ---------- Год в футере ---------- */
document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });
