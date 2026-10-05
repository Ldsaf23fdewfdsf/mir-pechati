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

/* ---------- Открыто / закрыто ---------- */
(function openStatus() {
  const nodes = document.querySelectorAll('[data-open-status]');
  if (!nodes.length) return;

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
    text = `Открыто до ${to}:00`;
    cls = 'is-open';
  } else if (now < from) {
    text = `Закрыто · откроемся в ${from}:00`;
    cls = 'is-closed';
  } else {
    const next = HOURS[(day + 1) % 7][0];
    text = `Закрыто · завтра с ${next}:00`;
    cls = 'is-closed';
  }
  nodes.forEach((n) => { n.textContent = text; n.classList.add(cls); });
})();

/* ---------- Отзывы ---------- */
(function reviews() {
  const tabsBox = document.getElementById('reviews-tabs');
  const unified = document.getElementById('myreviews');

  // Вариант 1: единый виджет MyReviews
  if (MYREVIEWS.uuid && unified && tabsBox) {
    tabsBox.hidden = true;
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
      }
    };
    s.onerror = () => { unified.hidden = true; tabsBox.hidden = false; };
    document.body.appendChild(s);
    return;
  }

  // Вариант 2: вкладки Яндекс / 2ГИС
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

/* ---------- Шторка «до / после» ---------- */
document.querySelectorAll('.compare').forEach((box) => {
  const range = box.querySelector('.compare__range');
  if (!range) return;
  const set = () => box.style.setProperty('--pos', `${range.value}%`);
  range.addEventListener('input', set);
  set();
});

/* ---------- Появление блоков ---------- */
(function reveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));
})();

/* ---------- Год в футере ---------- */
document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });
