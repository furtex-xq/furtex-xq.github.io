"""Вставляет заставку загрузки в index.html веб-демо (Flutter и Expo). Повторный запуск безопасен."""
import os, sys
ROOT = r'C:\Users\david\OneDrive\Робочий стіл\Проекты\Сайт-портфолио\demo'
CSS = ('<style id="ansaro-splash-css">#ansaro-splash{position:fixed;inset:0;z-index:99999;background:%s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;'
       'font-family:system-ui,sans-serif;color:#f5f3ff;transition:opacity .35s}#ansaro-splash.gone{opacity:0;pointer-events:none}'
       '#ansaro-splash i{width:54px;height:54px;border-radius:50%%;border:4px solid rgba(255,255,255,.12);border-top-color:%s;border-right-color:%s;animation:ansp .9s linear infinite}'
       '#ansaro-splash b{font-size:20px;font-weight:800}@keyframes ansp{to{transform:rotate(360deg)}}</style>')
JS_FLUTTER = ("<script>(function(){var s=document.getElementById('ansaro-splash');function h(){if(s){s.classList.add('gone');setTimeout(function(){s.remove()},400)}}"
              "window.addEventListener('flutter-first-frame',h);setTimeout(h,25000)})()</script>")
JS_EXPO = ("<script>(function(){var s=document.getElementById('ansaro-splash');var t=setInterval(function(){var r=document.getElementById('root');"
           "if(r&&r.innerText.trim().length>20){clearInterval(t);s.classList.add('gone');setTimeout(function(){s.remove()},400)}},200);"
           "setTimeout(function(){clearInterval(t);s&&s.remove()},25000)})()</script>")
CFG = {'tidemark': ('Tidemark', '#050a18', '#22d3ee', '#6366f1', JS_FLUTTER),
       'python': ('#PYTHON', '#141414', '#3b82f6', '#facc15', JS_FLUTTER),
       'monko': ('Monko', '#000', '#f5c451', '#f97316', JS_EXPO)}
for key in (sys.argv[1:] or CFG):
    name, bg, c1, c2, js = CFG[key]
    p = os.path.join(ROOT, key, 'index.html')
    s = open(p, encoding='utf-8').read()
    if 'ansaro-splash' in s:
        print(key, 'already'); continue
    s = s.replace('</head>', CSS % (bg, c1, c2) + '</head>', 1)
    i = s.index('<body'); i = s.index('>', i) + 1
    s = s[:i] + f'\n<div id="ansaro-splash"><i></i><b>{name}</b></div>{js}' + s[i:]
    open(p, 'w', encoding='utf-8').write(s)
    print(key, 'ok')
