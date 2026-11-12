# SPL — демо нового сайту (бета)

Інсталяційний центр / магазин автозвуку SPL, Івано-Франківськ. Статичний односторінковий сайт (HTML/CSS/JS), мова українська.

- `index.html`, `css/style.css`, `js/main.js`
- `js/vendor/` — GSAP 3.12.5 + ScrollTrigger, Lenis (локально, без CDN)
- `fonts/` — Unbounded, Geologica, JetBrains Mono (кирилиця + латиниця)
- `img/photos/` — тимчасові фото з Unsplash (Unsplash License), список у `credits.json`
- `tools/` + `.github/workflows/spl-photos.yml` — завантаження фото через GitHub Actions

Фішки: живий еквалайзер на першому екрані; закріплена «лабораторія звуку» з індикатором рівня (5 етапів); конфігуратор тонування (5–70%); вікна послуг з варіантами; фільтр магазину. Анімації тільки transform/opacity, вимикаються при `prefers-reduced-motion`.

Заглушки (позначені жовтим або «демо»): номер будинку, години роботи, ФОП/ЄДРПОУ, Viber, ціни послуг і товарів, відгуки, усі фото.
