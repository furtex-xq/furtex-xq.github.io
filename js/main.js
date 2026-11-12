(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');

  // Header: solid background after scrolling past the top
  var top = document.querySelector('.top');
  function onScroll() { top.classList.toggle('is-solid', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    nav.classList.toggle('is-open', open);
    top.classList.toggle('menu-open', open);
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Scroll reveal
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Gallery filter
  var chips = document.querySelectorAll('.chip');
  var cells = document.querySelectorAll('.gallery .ph');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-f');
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      cells.forEach(function (cell) {
        cell.classList.toggle('is-hidden', f !== 'all' && cell.getAttribute('data-c') !== f);
      });
    });
  });

  // Request form: validates, then opens a pre-filled email to the company.
  // For production this can be switched to a form service or a Telegram bot.
  var form = document.getElementById('zayavka');
  var status = form.querySelector('.form__status');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name, phone = form.elements.phone;
    var okName = name.value.trim().length > 1;
    var okPhone = phone.value.replace(/\D/g, '').length >= 9;
    name.setAttribute('aria-invalid', String(!okName));
    phone.setAttribute('aria-invalid', String(!okPhone));
    if (!okName || !okPhone) {
      status.textContent = !okName ? 'Вкажіть, будь ласка, ваше ім\'я.' : 'Вкажіть номер телефону, щоб ми могли передзвонити.';
      (!okName ? name : phone).focus();
      return;
    }
    var body = 'Ім\'я: ' + name.value.trim() +
      '\nТелефон: ' + phone.value.trim() +
      '\nЩо потрібно: ' + form.elements.kind.value +
      (form.elements.msg.value.trim() ? '\nКоментар: ' + form.elements.msg.value.trim() : '');
    window.location.href = 'mailto:grand-granit@ukr.net?subject=' +
      encodeURIComponent('Заявка з сайту: ' + form.elements.kind.value) +
      '&body=' + encodeURIComponent(body);
    status.textContent = 'Дякуємо! Відкрили лист із вашою заявкою. Надішліть його, і ми передзвонимо.';
    form.reset();
  });

  var y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();
