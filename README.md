# Kulyk Medicine — демо нового сайту (бета)

Стоматологія Kulyk Medicine, Івано-Франківськ, вул. Бельведерська, 23. Статичний односторінковий сайт (HTML/CSS/JS), мова українська.

- `index.html`, `css/style.css`, `js/main.js`
- `js/vendor/` — GSAP 3.12.5 + ScrollTrigger, Lenis (локально, без CDN)
- `fonts/` — Literata, Manrope, IBM Plex Mono (кирилиця + латиниця)
- `img/photos/` — тимчасові фото з Unsplash (Unsplash License), список у `credits.json`
- `tools/` + `.github/workflows/kulyk-photos.yml` — завантаження фото через GitHub Actions

Фішка: «лінза мікроскопа» — закріплений блок, де під час скролу лінза пливе по зубах і збільшення росте ×1 → ×4 → ×25 (на ПК лінзою можна водити мишкою). Анімації тільки transform/opacity, вимикаються при `prefers-reduced-motion`.

Заглушки: ФОП/ЄДРПОУ/ліцензія МОЗ, Viber (жовта крапка), усі фото, фото лікаря.
