# Ansaro Panel

Приватная панель Telegram для студии Ansaro. Давид подключает свой Telegram, а Claude через API читает непрочитанные и отвечает клиентам, даже когда ПК выключен.

Код открытый, но в нём нет ни одного секрета. Пароль, API-ключ, api_id/api_hash и сессия Telegram хранятся только в переменных окружения хостинга. Всё, что похоже на секреты (`.env`, `*.session`, базы), закрыто в `.gitignore`.

## Защита

- Веб-страницы закрыты паролем `PANEL_PASSWORD`; 5 неверных попыток за 15 минут блокируют IP.
- API закрыт ключом `PANEL_API_KEY` (заголовок `Authorization: Bearer <ключ>`).
- Cookie только по HTTPS, SameSite=strict, CSRF-токены на всех формах, страницы не индексируются.
- `PANEL_READONLY=1` включает режим только чтения: отправка запрещена.
- На главной видно всё, что отправлено через панель, и кем (Claude или Давид).

## Запуск на Render (бесплатно, без карты)

1. Зайти на https://render.com через GitHub.
2. New → Blueprint → выбрать репозиторий `furtex-xq/furtex-xq.github.io`. Render найдёт `ansaro-panel/render.yaml`.
   Если Blueprint не видит файл: New → Web Service, Root Directory `ansaro-panel`, Build `pip install -r requirements.txt`,
   Start `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'`, план Free.
3. Заполнить переменные:
   - `TG_API_ID`, `TG_API_HASH`: с https://my.telegram.org → API development tools (название приложения любое).
   - `PANEL_PASSWORD`, `PANEL_API_KEY` и `SESSION_SECRET` Render создаст сам (пароль можно заменить своим, от 10 символов).
4. Открыть адрес вида `https://ansaro-panel-xxxx.onrender.com`, войти паролем, ввести телефон и код из Telegram.
5. Панель один раз покажет строку сессии. Вставить её в переменную `TG_SESSION` на Render (Environment → Save). Без этого после перезапуска придётся входить снова.

Бесплатный Render засыпает через 15 минут без запросов и просыпается примерно за 30–60 секунд. Сообщения не теряются, они лежат в Telegram.

## Доступ для Claude

Облачные сессии Claude по умолчанию не видят внешние сайты. В настройках проекта (Cloud environment):
- добавить адрес панели (`ansaro-panel-xxxx.onrender.com`) в Allowed domains;
- добавить переменную окружения `PANEL_API_KEY` со значением из Render и `PANEL_URL` с адресом панели.

## API

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/status` | Подключён ли Telegram, чей аккаунт |
| GET | `/api/unread` | Личные чаты с непрочитанными и группы с упоминаниями |
| GET | `/api/dialogs?limit=50&unread_only=false` | Список чатов |
| GET | `/api/messages/{peer}?limit=30&mark_read=false` | История чата (`peer`: id или @username) |
| POST | `/api/send` `{"peer","text","reply_to"?}` | Отправить сообщение |
| POST | `/api/read` `{"peer"}` | Отметить прочитанным |
| GET | `/api/sent_log` | Что отправлено через панель с последнего запуска |

Пример:

```bash
curl -H "Authorization: Bearer $PANEL_API_KEY" "$PANEL_URL/api/unread"
```

## Локальный запуск

```bash
pip install -r requirements.txt
PANEL_PASSWORD=... PANEL_API_KEY=... PANEL_HTTPS_ONLY=0 TG_API_ID=... TG_API_HASH=... \
  uvicorn app.main:app --port 8000
```
