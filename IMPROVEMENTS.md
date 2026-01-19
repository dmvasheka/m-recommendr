# Список улучшений для Movie Recommendr

## Статус деплоя
- ✅ Backend deployed: https://api-production-9141.up.railway.app
- ✅ Frontend deployed: https://m-recommendr-web-ip4u.vercel.app
- ✅ Production ready

## 📊 Текущий прогресс
- ✅ **База данных:** 1675 фильмов + сериалы, 100% embeddings, BullMQ для фоновых задач
- ✅ **Поиск:** Автодополнение с постерами (можно улучшить)
- 🟡 **Локализация:** EN/RU работают, но с багами роутинга
- ✅ **AI Explanations:** Backend готов, UI не реализован
- ⏳ **UI/UX:** Базовый дизайн, требует улучшения

**Last Updated:** 2026-01-17

---

## Запланированные улучшения

### 9. 🚨 КРИТИЧНО: Оптимизация импорта через очереди

**Проблема:** Фоновый импорт работает неправильно и приводит к исчерпанию лимитов

**Текущие баги:**
1. **Циклический импорт дубликатов**
   - Импорт по кругу добавляет одни и те же фильмы/сериалы
   - Импортируются только первые 40-100 элементов каждой категории (popular, top_rated и т.д.)
   - После первого запроса начинают повторяться и скипаться
   - TMDB возвращает те же страницы, но код не переходит к новым категориям/годам/страницам

2. **Слишком высокая частота запросов**
   - За 2 дня был исчерпан бесплатный лимит Upstash Redis
   - Cron job запускается слишком часто
   - Нет throttling и rate limiting между запросами

3. **Проблема локализации контента**
   - Все фильмы и сериалы импортируются на английском языке
   - Интерфейс русифицирован, но данные (описания, названия) остаются на EN
   - TMDB API поддерживает параметр `language=ru-RU`, но не используется

**Решение:**

#### 9.1 Исправить логику импорта
- [x] **Отслеживание прогресса импорта** ✅
  - [x] ~~Сохранять в Redis~~ → Создали таблицу `import_progress` в БД ✅
  - [x] Создать таблицу `import_progress` в БД ✅ (apps/api/src/tmdb/import-progress.service.ts)
  - [x] Записывать: категория, последняя импортированная страница, timestamp ✅
  - [x] SQL функции: `update_import_progress()`, `get_next_import_page()` ✅
- [x] **Умный импорт с прогрессией** ✅ (частично для TV shows)
  - [x] Начинать со страницы N+1, где N - последняя успешно импортированная ✅
    - Реализовано для TV shows: `importTvShowsByYear` (tmdb.service.ts:843-845)
    - `const nextPage = startPage || await this.importProgressService.getNextPage('tv_shows', 'by_year', year)`
  - [x] Если страница не содержит новых элементов, предупреждение в логах ✅ (tmdb.service.ts:913-915)
  - [x] Импортировать из разных годов циклически ✅
    - Batch import по диапазону лет: `addBatchMovieImportJobs()`, `addBatchTvImportJobs()` (queues.service.ts:85-110)
  - [ ] Ротация категорий: popular → top_rated → now_playing → upcoming ⚠️ (пока только by_year)
- [x] **Предотвращение дубликатов** ✅
  - [x] Проверять наличие в БД перед импортом ✅
    - TV shows: проверка через `maybeSingle()` (tmdb.service.ts:872-876)
    - Movies: используют `upsert` с `onConflict: 'id'` (tmdb.service.ts:704)
  - [x] UNIQUE constraint на `id` (PRIMARY KEY) ✅ (supabase/migrations/20251209000001_init.sql:23)
  - [x] Логировать количество новых vs скипнутых ✅
    - `total_imported` и `total_skipped` в import_progress
    - Логи: "Year ${year} complete: ${imported} imported, ${skipped} skipped" (tmdb.service.ts:920)

#### 9.2 Настроить частоту и throttling
- [ ] **Уменьшить частоту cron jobs** ⚠️ (endpoints есть, но нужно настроить расписание)
  - [ ] Импорт фильмов: раз в 6-12 часов (вместо ежечасного)
  - [ ] Импорт сериалов: раз в день
  - [ ] Генерация embeddings: по мере накопления (batch раз в час)
  - ℹ️ Есть endpoints: `scheduleMovieImport()`, `scheduleTvImport()` (queues.service.ts:45, 71)
- [x] **Rate limiting для TMDB API** ✅
  - [x] Задержка между запросами: 100-250ms ✅
    - Popular movies: 100ms (tmdb.service.ts:348)
    - Movies by year: 100ms (tmdb.service.ts:779)
    - TV shows by year: 200ms (tmdb.service.ts:894)
    - Locale extraction: 250ms (tmdb.service.ts:998)
  - [x] Batch размер: 20 элементов за раз ✅ (moviesPerPage = 20, tvShowsPerPage = 20)
  - [ ] Использовать `p-queue` или встроенный BullMQ rate limiter (опционально)
- [ ] **Upstash Redis оптимизация** ⚠️ (перешли на локальный Redis)
  - [x] ~~Upstash~~ → Используется локальный Redis (localhost:6379) ✅
  - [ ] Уменьшить TTL для кэша (если используется)
  - [ ] Минимизировать количество записей в Redis

#### 9.3 Локализация импорта
- [x] **TMDB API с language параметром** ✅
  - [x] Добавить `language` параметр во все запросы к TMDB ✅
    - `primaryLanguage = process.env.TMDB_LANGUAGE || 'en-US'` (tmdb.service.ts:101)
    - Используется во всех запросах: getMovieDetails, getTvDetails, etc.
  - [x] Фетчинг переводов на нескольких языках ✅
    - `translationLanguages = ['en-US', 'ru-RU', 'uk-UA']` (tmdb.service.ts:104)
    - `getMovieTranslations()` (tmdb.service.ts:318-357)
    - `getTvTranslations()` (tmdb.service.ts:362-400)
  - [x] Сохранение переводов ✅
- [x] **Мультиязычная схема БД** ✅
  - [x] JSON поле `translations: { en: {...}, ru: {...}, uk: {...} }` ✅
    - В movies и tv_shows таблицах (tmdb.service.ts:698, 545)
    - GIN индексы для translations (supabase/migrations/20260117000002_add_translations.sql:12-13)
- [ ] **API response по языку пользователя** ⚠️ (частично)
  - [ ] Frontend передает язык в заголовке или query параметре
  - [ ] Backend возвращает данные на нужном языке (фильтрует из translations)
  - [x] Embeddings генерируются на английском ✅ (для консистентности поиска)

#### 9.4 Мониторинг и алерты
- [x] **Dashboard для импорта** ✅ (частично - API готово, UI нужна)
  - [x] Статистика очередей: GET /api/queues/stats ✅ (queues.controller.ts:156)
    - waiting, active, completed, failed для каждой очереди
  - [x] Количество импортированных за всё время ✅ (в import_progress.total_imported)
  - [ ] Количество импортированных фильмов/сериалов за последние 24ч (нужен query)
  - [x] Статистика скипов (дубликаты) ✅ (в import_progress.total_skipped)
  - [ ] ~~Использование Upstash Redis~~ → Локальный Redis (нет ограничений)
- [x] **Логирование** ✅
  - [x] Подробные логи импорта с категорией, страницей, результатами ✅
    - "Year ${year} complete: ${imported} imported, ${skipped} skipped" (tmdb.service.ts:920)
    - "✅ Updated progress: ${contentType}/${category}/${year} - Page ${lastPage}" (import-progress.service.ts:77)
  - [x] Предупреждения при всех скипнутых (дубликаты) ✅
    - "Page ${page}: All ${pageSkipped} TV shows skipped (duplicates)" (tmdb.service.ts:914)
  - [ ] Алерты при высокой частоте скипов (>80%) - нужна автоматизация
  - [ ] ~~Предупреждения при приближении к лимиту Upstash~~ → Не актуально

**Порядок работы:**
1. ✅ Добавить задачу в IMPROVEMENTS.md
2. ✅ Проверить текущий код импорта (TmdbService, BullMQ processors)
3. ✅ Реализовать tracking прогресса импорта (import_progress таблица)
4. ✅ Добавить множественные языки в TMDB запросы (en, ru, uk)
5. ✅ Настроить throttling (100-250ms между запросами)
6. ✅ Переключиться на local Redis (localhost:6379)
7. ⏳ Уменьшить частоту cron jobs (нужно настроить расписание)
8. ⏳ Добавить ротацию категорий (сейчас только by_year)
9. ⏳ Протестировать локально с long-running import
10. ⏳ Задеплоить и мониторить

**Что осталось сделать (критично):**
1. Настроить разумное расписание для cron jobs (6-12 часов для фильмов, раз в день для сериалов)
2. Добавить ротацию категорий (popular → top_rated → now_playing → upcoming)
3. Добавить автоматизированные алерты при высокой частоте скипов
4. Протестировать импорт на продолжительности для проверки что дубликаты не повторяются

---

### 1. UI/UX улучшения
**Основная задача:** Сгенерировать современный тематический дизайн в Figma/v0.dev/другом сервисе

**Подзадачи:**
- [ ] Разработать новый дизайн интерфейса (рассмотреть: v0.dev, Figma с AI, MidJourney для концептов)
- [ ] Улучшить главную страницу или перенести функционал `/discover` на главную
- [ ] Улучшить карточки фильмов (hover эффекты, анимации, больше информации)
- [ ] Добавить темную тему (dark mode)
- [ ] Улучшить мобильную версию
- [ ] Добавить skeleton loaders вместо обычных спиннеров
- [ ] Добавить микроанимации и transitions
- [ ] Улучшить навигацию (breadcrumbs, улучшенное меню)
- [ ] Добавить onboarding для новых пользователей (tour по функционалу)
- [ ] Создать красивую страницу "О проекте" с описанием AI возможностей

**Дополнительные UX улучшения (добавятся в процессе):**
- [ ] Infinite scroll вместо пагинации на некоторых страницах
- [ ] Фильтры и сортировка (по жанрам, годам, рейтингу)
- [ ] Быстрый предварительный просмотр фильма (модальное окно при клике)
- [ ] Горячие клавиши для навигации
- [ ] Оптимизация для доступности (a11y)

---

### 2. База данных - Фильмы и Сериалы
**Основная задача:** Загрузить максимальное количество контента и добавить поддержку сериалов

**Подзадачи:**
- [x] Импортировать популярные фильмы из TMDB ~~(топ-10000+)~~ **1675 фильмов** ✅
- [x] Добавить поддержку сериалов в базу данных ✅
  - [x] Создать таблицу `tv_shows` с полями для сезонов и эпизодов ✅
  - [x] Добавить связи между сериалами, сезонами и эпизодами ✅
  - [x] Обновить embedding генерацию для сериалов ✅
- [x] Настроить автоматическую синхронизацию новых фильмов/сериалов из TMDB (background tasks) ✅
- [x] Добавить embeddings для всех импортированных фильмов (100% coverage) ✅
- [x] Оптимизировать процесс импорта (batch processing, параллельная обработка через BullMQ) ✅
- [x] Добавить метаданные: режиссеры, актеры, студии ✅

**Дополнительно можно:**
- [ ] Расширить базу до 10000+ фильмов
- [ ] Импортировать больше сериалов

---

### 3. Поиск с автодополнением ✅
**Основная задача:** Реализовать autocomplete при вводе названия фильма/сериала

**Подзадачи:**
- [x] Создать endpoint `/api/movies/autocomplete?q=...` ✅
- [x] Создать endpoint `/api/tv-shows/autocomplete?q=...` ✅
- [x] Реализовать debounced поиск (задержка ~300ms) ✅
- [x] Показывать выпадающий список с результатами при вводе ✅
- [x] Отображать постеры в выпадающем списке ✅
- [x] Показывать категорию (фильм/сериал) и год выпуска ✅
- [x] Limit до 5-10 результатов для производительности ✅
- [ ] Добавить подсветку совпадений в результатах
- [ ] Навигация по результатам клавишами (стрелки вверх/вниз, Enter)
- [ ] Кэширование результатов автодополнения в Redis

**Технологии:**
- Frontend: React Hook `useAutocomplete` с debounce ✅
- Backend: PostgreSQL ILIKE для быстрого поиска ✅

---

### 4. Watchlist - Quick Actions
**Основная задача:** Добавить возможность добавления в watchlist с любой страницы

**Подзадачи:**
- [ ] Добавить иконку "+" или bookmark на постер фильма (overlay при hover)
- [ ] Реализовать quick action menu:
  - "Add to Watchlist" (Planned)
  - "Mark as Watched" + Rating slider
  - "Remove from Watchlist"
- [ ] Показывать текущий статус фильма (иконка/бадж если уже в watchlist)
- [ ] Добавить toast уведомления об успешном действии
- [ ] Оптимистичные обновления UI (обновление без ожидания ответа сервера)
- [ ] Синхронизация состояния через React Query cache
- [ ] Keyboard shortcuts (например, "w" для добавления в watchlist)

---

### 5. Улучшение AI функционала
**Основная задача:** Расширить и улучшить возможности AI рекомендаций

**Идеи для улучшения:**

#### 5.1 Контекстные рекомендации
- [ ] **Mood-based recommendations** - "Покажи что-то веселое", "Хочу погрустить"
  - Анализ эмоционального тона фильмов через GPT
  - Создание emotion embeddings
- [ ] **Рекомендации на основе времени суток/сезона**
  - "Что посмотреть вечером в пятницу?"
  - "Фильмы для зимнего вечера"

#### 5.2 Умные плейлисты
- [ ] **AI-generated плейлисты** - "Эволюция sci-fi", "От комедии к драме"
  - GPT создает тематические подборки с объяснением последовательности
- [ ] **Персональные коллекции** - "Твоя ретроспектива Нолана"

#### 5.3 Глубокий анализ
- [x] **Movie Explanations API** - Backend готов ✅
  - [x] Endpoint `POST /api/movies/:id/explain` ✅
  - [x] Метод `explainRecommendation()` в MoviesService ✅
  - [x] Функция `generateMovieExplanation()` в packages/ai ✅
  - [x] Детальный анализ сюжета, тем, стиля через GPT ✅
  - [x] Сравнение с фильмами из watchlist пользователя ✅
- [ ] **Movie Explanations UI** - Фронтенд не реализован 🔥 HIGH PRIORITY
  - [ ] Добавить кнопку "Почему этот фильм?" на карточки
  - [ ] Создать модальное окно для AI объяснения
  - [ ] Добавить loading states
  - [ ] Интегрировать с API endpoint
- [ ] **Similar Movies с объяснением** - Не просто "похожие", а почему похожи
  - "Оба исследуют тему одиночества через призму sci-fi"

#### 5.4 Интерактивный чат с AI-ассистентом

**Статус**: Бэкенд реализован и работает, требуется frontend интеграция и расширенные функции

**Текущая реализация (Backend)**:
- ✅ RAG (Retrieval Augmented Generation) с векторным поиском по базе фильмов
- ✅ Персонализированные ответы на основе топ-рейтингов пользователя
- ✅ Хранение истории диалога (таблица chat_messages)
- ✅ Определение настроения (mood detection) по ключевым словам
- ✅ Контекстные рекомендации с использованием до 10 релевантных фильмов
- ✅ API endpoints: POST /api/chat, GET /api/chat/history/:userId, DELETE /api/chat/clear/:userId

**Цель**: Интеллектуальный чат-ассистент, который помогает пользователям находить фильмы через естественный диалог, дает персонализированные рекомендации, отвечает на вопросы о фильмах и сериалах, и создает вовлекающий интерактивный опыт.

##### 5.4.1 Ключевые возможности чат-бота

**A. Поиск и рекомендации через диалог**
- [ ] **Естественный языковой поиск**
  - "Что-нибудь похожее на Inception, но более легкое"
  - "Комедия для вечера пятницы с друзьями"
  - "Что посмотреть после тяжелого дня?"
  - Поддержка нечетких запросов и синонимов

- [ ] **Умные уточняющие вопросы**
  - Если запрос слишком общий: "Тебе больше нравится экшен или драма?"
  - Уточнение контекста: "Ты хочешь посмотреть что-то сейчас или добавить в список на потом?"
  - Проверка настроения: "Ты в настроении для чего-то легкого или серьёзного?"
  - Сужение выбора: "Из этих трех вариантов что тебя больше заинтересовало?"

- [ ] **Многоэтапные рекомендации**
  - Пользователь: "Хочу что-то интересное"
  - Бот: "Вижу ты любишь Nolan. Хочешь еще что-то mind-bending или предпочитаешь более простой сюжет?"
  - Пользователь: "Mind-bending"
  - Бот: "Отлично! Попробуй Primer (2004) или Predestination (2014)..."
  - Рекурсивное уточнение до идеального совпадения

**B. Информация о фильмах и сериалах**
- [ ] **Детальные описания по запросу**
  - Пользователь: "Расскажи про Inception"
  - Бот предоставляет: сюжет, актерский состав, режиссер, жанры, рейтинги, интересные факты
  - Адаптивная детализация (краткая/полная версия)
  - Спойлер-контроль (предупреждение перед раскрытием сюжета)

- [ ] **Сравнение фильмов**
  - "Чем отличается Blade Runner от Blade Runner 2049?"
  - "Какой Spider-Man лучше всего подойдет для ребенка?"
  - Анализ различий в тоне, сложности, тематике

- [ ] **Ответы на вопросы**
  - "Кто играл в Interstellar?"
  - "Сколько фильмов Marvel вышло в 2023?"
  - "Есть ли продолжение у The Matrix?"
  - Интеграция с TMDB данными для актуальной информации

**C. Персонализация и контекст**
- [ ] **Память о предпочтениях пользователя**
  - Анализ истории watchlist и рейтингов
  - Запоминание упомянутых любимых жанров, актеров, режиссеров
  - Учет timezone для контекстных рекомендаций ("для вечера пятницы")
  - Адаптация тона и стиля общения

- [ ] **Контекстная осведомленность**
  - Поддержка follow-up вопросов без повторения контекста
  - Пользователь: "Посоветуй sci-fi"
  - Бот: [рекомендует 3 фильма]
  - Пользователь: "А что-то более новое?" → бот понимает, что речь о sci-fi
  - Сохранение контекста в рамках сессии (last 10-20 messages)

- [ ] **Адаптивные рекомендации**
  - Учет времени суток: "На основе твоих вечерних предпочтений..."
  - Учет дня недели: "Для пятничного вечера предлагаю..."
  - Seasonal recommendations: "Отличный выбор для зимнего вечера"
  - Настроение: распознавание эмоционального состояния из сообщений

**D. Интеграция с существующим функционалом**
- [ ] **Прямое добавление в watchlist из чата**
  - Бот: "Рекомендую тебе Arrival (2016). Добавить в список?"
  - Кнопки действий: [🔖 В список] [⭐ Уже смотрел] [🚫 Не интересно]
  - Быстрое управление статусом (планирую/смотрю/посмотрел)

- [ ] **Быстрая оценка фильмов**
  - "Как тебе понравился [фильм]?" с возможностью поставить рейтинг прямо в чате
  - Сбор обратной связи для улучшения рекомендаций
  - Опциональный запрос короткого отзыва

- [ ] **Навигация по приложению**
  - "Покажи мои списки" → переход на страницу watchlist
  - "Где статистика?" → deeplink в раздел stats
  - "Открой страницу Inception" → переход на детальную страницу фильма

##### 5.4.2 UI/UX дизайн чата

**A. Интерфейс чата**
- [ ] **Современный дизайн чат-интерфейса**
  - Floating chat bubble (bottom-right corner)
  - Полноэкранный режим для мобильных устройств
  - Minimizable widget для desktop
  - Анимация "typing..." когда AI генерирует ответ
  - Smooth scroll и автофокус на последнем сообщении

- [ ] **Форматирование сообщений**
  - Markdown поддержка (жирный, курсив, списки)
  - Карточки фильмов с постерами прямо в чате
  - Интерактивные элементы (кнопки, chip-селекторы)
  - Syntax highlighting для технических деталей
  - Emoji поддержка

- [ ] **Rich media в ответах**
  - Встроенные постеры фильмов
  - Превью трейлеров (YouTube/Vimeo embed)
  - Рейтинги и метаданные в виде badges
  - Карусель рекомендаций (swipeable cards)
  - Галереи screenshots/backdrops

**B. Интерактивные элементы**
- [ ] **Quick replies (быстрые ответы)**
  - Предложения возможных ответов под сообщением бота
  - "Да, добавь в список", "Расскажи подробнее", "Покажи похожие"
  - Динамическая генерация на основе контекста
  - Chip-style кнопки для выбора

- [ ] **Suggested prompts (подсказки)**
  - Пустой чат показывает примеры вопросов:
    - "🎬 Порекомендуй что-то необычное"
    - "🔍 Найди комедию для вечера"
    - "📊 Покажи мою статистику"
    - "❓ Расскажи про Christopher Nolan"
  - Адаптивные подсказки на основе истории

- [ ] **Inline actions (действия в сообщениях)**
  - Hover over movie mention → показать popup с кратким описанием
  - Click на название фильма → открыть детальную страницу
  - Long-press → контекстное меню (добавить в список, поделиться)

**C. История и навигация**
- [ ] **Просмотр истории диалогов**
  - Scrollable история всех предыдущих сообщений
  - Search по истории диалогов
  - Группировка по дате (сегодня/вчера/неделя назад)
  - Export истории в текстовый файл

- [ ] **Управление диалогами**
  - "Начать новый диалог" → очистить контекст
  - "Вернуться к предыдущему обсуждению" → jump в историю
  - Pin важных рекомендаций
  - Delete/edit сообщений

##### 5.4.3 Продвинутые AI-функции

**A. Streaming responses**
- [ ] **Потоковая генерация текста**
  - Server-Sent Events (SSE) для real-time streaming
  - Текст появляется word-by-word как ChatGPT
  - Возможность остановить генерацию (Stop button)
  - Улучшенное UX восприятие скорости

**B. Мультимодальность**
- [ ] **Voice input (голосовой ввод)**
  - Web Speech API для распознавания речи
  - Push-to-talk button в интерфейсе
  - Поддержка русского, украинского, английского
  - Визуальный индикатор recording

- [ ] **Voice output (озвучка ответов)**
  - Text-to-Speech для ответов бота (опционально)
  - Выбор голоса и скорости
  - Автовоспроизведение для hands-free режима
  - Удобно для accessibility

- [ ] **Image understanding (будущее)**
  - Upload poster → "Что это за фильм?"
  - Screenshot из фильма → идентификация сцены
  - OCR для распознавания текста с изображений

**C. Расширенная персонализация**
- [ ] **Tone adaptation (адаптация тона)**
  - Casual/friendly для обычных пользователей
  - Expert mode для киноманов (больше технических деталей)
  - Настройка в user preferences

- [ ] **Language preferences**
  - Multi-language support (ru, uk, en)
  - Автоопределение языка из сообщения
  - Смешанный режим (билингвальные ответы)

- [ ] **Proactive suggestions**
  - "Я заметил, что ты давно не смотрел комедии. Хочешь что-то легкое?"
  - "Вышел новый сезон твоего любимого сериала"
  - Opt-in для уведомлений

##### 5.4.4 Техническая архитектура

**Backend (NestJS) - уже реализовано**
```typescript
// apps/api/src/chat/chat.service.ts
- RAG with vector search (match_movies RPC)
- User preferences from top-rated movies
- Mood detection and scoring
- Conversation history (chat_messages table)
- OpenAI GPT integration (generateChatResponse)

// apps/api/src/chat/chat.controller.ts
POST   /api/chat              - Send message, get AI response
GET    /api/chat/history/:userId - Get conversation history
DELETE /api/chat/clear/:userId  - Clear history
```

**Что нужно добавить:**

**A. Streaming API**
```typescript
// New endpoint for streaming responses
GET /api/chat/stream?userId=xxx&message=xxx
- Server-Sent Events (SSE)
- Progressive token streaming from OpenAI
- Real-time updates to frontend

// Implementation:
@Sse('stream')
async streamMessage(
  @Query('userId') userId: string,
  @Query('message') message: string,
): Observable<MessageEvent> {
  return this.chatService.streamMessage(userId, message);
}
```

**B. Enhanced context management**
```typescript
// apps/api/src/chat/context.service.ts
- Session-based context store (Redis)
- Sliding window for conversation history
- Context summarization for long dialogues
- Multi-turn intent tracking

interface ConversationContext {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  currentTopic?: string; // "sci-fi recommendations", "Nolan films"
  lastMoviesMentioned: number[];
  userMood?: string;
  pendingActions?: Action[];
}
```

**C. Action handlers**
```typescript
// apps/api/src/chat/actions.service.ts
- Parse intent from messages (add to watchlist, rate movie, etc.)
- Execute actions (call WatchlistService, RecommendationsService)
- Return actionable responses

interface ChatAction {
  type: 'ADD_TO_WATCHLIST' | 'RATE_MOVIE' | 'SEARCH' | 'NAVIGATE';
  payload: any;
  confirmation?: string; // "Added Inception to your watchlist"
}
```

**Frontend (Next.js/React)**
```typescript
// apps/web/components/Chat/
ChatWidget.tsx       - Floating chat bubble + modal
ChatInterface.tsx    - Main chat UI
MessageList.tsx      - Scrollable message history
MessageInput.tsx     - Input with voice support
MovieCard.tsx        - Rich movie cards in chat
QuickReplies.tsx     - Suggested action buttons
VoiceRecorder.tsx    - Web Speech API integration

// State management (Zustand/Redux)
useChatStore.ts      - Messages, loading state, streaming
useChatActions.ts    - Send message, load history, clear chat

// API integration
chatApi.ts           - POST /api/chat, SSE /api/chat/stream
```

**D. Database schema**
```sql
-- Already exists:
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_movies INTEGER[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance:
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- New table for sessions:
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT, -- Auto-generated from first message
  last_message_at TIMESTAMP DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

##### 5.4.5 Интеграция с рекомендательной системой

**A. Unified recommendation engine**
- [ ] Чат использует тот же embedding-based поиск
- [ ] Совместные фильтры: RAG + collaborative filtering
- [ ] Real-time обновление рекомендаций на основе чата
- [ ] Feedback loop: рейтинги из чата улучшают общие рекомендации

**B. Context-aware recommendations**
```typescript
// Пример запроса:
"Хочу что-то похожее на Inception, но менее сложное"

// Обработка:
1. Vector search: найти похожие на Inception
2. Filter: vote_count > 100, vote_average > 7.0
3. Mood scoring: отфильтровать слишком "mind-bending" фильмы
4. Personalization: повысить приоритет жанров пользователя
5. Diversity: микс известных и нишевых фильмов

// Ответ:
"На основе Inception рекомендую:
1. Shutter Island (2010) - похожий вайб, но более линейный сюжет
2. The Prestige (2006) - тоже Nolan, чуть проще структура
3. Source Code (2011) - sci-fi с петлями времени, но понятнее"
```

##### 5.4.6 Метрики и аналитика

**Отслеживать:**
- [ ] **User engagement**
  - Количество сообщений на пользователя
  - Длина диалогов (turns per session)
  - Retention rate (вернулись ли пользователи к чату)
  - Drop-off points (где пользователи уходят)

- [ ] **Recommendation quality**
  - Click-through rate на рекомендованные фильмы
  - Add-to-watchlist rate из чата
  - Rating correlation (высокие оценки = успешные рекомендации)
  - Follow-up questions (довольны ли пользователи ответом)

- [ ] **Performance metrics**
  - Response latency (время генерации ответа)
  - Vector search speed
  - Token usage (OpenAI API costs)
  - Error rates и типы ошибок

**Dashboard для мониторинга:**
```typescript
// Admin panel - Chat Analytics
- Total conversations count
- Average messages per conversation
- Most popular queries
- Movies most recommended through chat
- User satisfaction scores
- Cost per conversation (OpenAI tokens)
```

##### 5.4.7 Безопасность и модерация

- [ ] **Content filtering**
  - Проверка на неприемлемый контент (profanity filter)
  - Rate limiting: max 50 messages per hour per user
  - Spam detection (повторяющиеся запросы)
  - Блокировка abuse (оскорбления, попытки jailbreak AI)

- [ ] **Privacy**
  - Возможность удалить всю историю (GDPR compliance)
  - Не сохранять sensitive информацию
  - Encrypt chat history at rest
  - Anonymize данные для аналитики

- [ ] **AI safety**
  - System prompts для предотвращения harmful recommendations
  - Не рекомендовать пиратские источники
  - Disclaimers для контента 18+
  - Fallback на безопасные ответы при неопределенности

##### 5.4.8 Дорожная карта реализации

**Phase 1: Frontend интеграция (2 недели)**
1. Базовый ChatWidget компонент
2. MessageList с историей
3. API integration с существующим /api/chat
4. Simple UI без streaming

**Phase 2: Enhanced UX (1 неделя)**
1. Rich message formatting (Markdown, movie cards)
2. Quick replies и suggested prompts
3. Loading states и анимации
4. Responsive design для mobile

**Phase 3: Streaming и Voice (2 недели)**
1. SSE streaming endpoint
2. Progressive rendering в UI
3. Web Speech API для voice input
4. Text-to-Speech опционально

**Phase 4: Advanced AI features (2 недели)**
1. Улучшенная контекстная осведомленность
2. Multi-turn intent tracking
3. Action handlers (add to watchlist, etc.)
4. Proactive suggestions

**Phase 5: Analytics и optimization (1 неделя)**
1. Метрики engagement
2. Performance monitoring
3. Cost optimization (token usage)
4. A/B testing различных prompts

**Общее время**: 8 недель для полной реализации

##### 5.4.9 Примеры диалогов

**Пример 1: Поиск фильма по настроению**
```
User: Хочу что-то посмотреть, но не знаю что
Bot:  Давай я помогу! Ты сейчас в настроении для чего-то легкого и веселого,
      или предпочитаешь более серьёзное кино?

User: Что-то легкое
Bot:  Отлично! Вижу ты любишь комедии. Вот три варианта:

      🎬 The Grand Budapest Hotel (2014) - стильная комедия Уэса Андерсона
         [🔖 В список] [👀 Подробнее]

      🎬 Knives Out (2019) - остроумный детектив с юмором
         [🔖 В список] [👀 Подробнее]

      🎬 Hunt for the Wilderpeople (2016) - тёплая новозеландская комедия
         [🔖 В список] [👀 Подробнее]

      Какой из них больше заинтересовал?

User: Расскажи подробнее про Knives Out
Bot:  Knives Out (2019) - современный детективный фильм Райана Джонсона.

      📊 Рейтинг: 7.9/10 (TMDB)
      ⏱️  Длительность: 2ч 10мин
      🎭 Жанры: Комедия, Криминал, Детектив

      Сюжет: После смерти известного писателя детективов его семья собирается
      на чтение завещания. Частный детектив начинает расследование...
      (без спойлеров)

      Актёры: Daniel Craig, Ana de Armas, Chris Evans

      💡 Почему тебе понравится: Clever writing, отличный юмор, неожиданные
         повороты. Похоже на Agatha Christie, но в современной интерпретации.

      [🔖 Добавить в список] [🎬 Смотреть трейлер] [🔍 Похожие фильмы]

User: Добавь в список
Bot:  ✅ Добавлено "Knives Out" в твой watchlist!

      Хочешь ещё что-нибудь в похожем стиле?
```

**Пример 2: Follow-up вопросы**
```
User: Посоветуй sci-fi
Bot:  У тебя отличный вкус в sci-fi! Вот несколько вариантов:

      1. Arrival (2016) - медитативный контакт с инопланетянами
      2. Ex Machina (2014) - философский AI thriller
      3. Annihilation (2018) - психоделический bio-horror

      Что тебя больше интересует?

User: А что-то более новое?
Bot:  [Понимает контекст "более новое sci-fi"]

      Из свежих sci-fi рекомендую:

      1. Everything Everywhere All at Once (2022) - мультивселенная
      2. Dune (2021) - эпическая космоопера
      3. The Creator (2023) - AI война

      Все три с высокими рейтингами и современными визуальными эффектами!

User: Уже смотрел Dune
Bot:  Понял! Тогда между Everything Everywhere и The Creator -
      первый более креативный и безумный, второй более классический
      sci-fi экшен. Что ближе сейчас?
```

**Пример 3: Интеграция с watchlist**
```
User: Покажи что у меня в списке
Bot:  У тебя 12 фильмов в watchlist:

      Планируешь посмотреть:
      - Inception
      - The Matrix
      - Blade Runner 2049
      [Показать все...]

      Хочешь чтобы я помог выбрать что посмотреть сегодня?

User: Да, помоги выбрать
Bot:  Отлично! Учитывая что сейчас вечер пятницы, рекомендую
      начать с Inception - идеальный баланс захватывающего экшена
      и интересной идеи. Длительность 2ч 28мин.

      [▶️ Начать просмотр] [🗑️ Убрать из списка] [📅 Напомнить позже]
```

---

**Итого по разделу 5.4**:
- Мощный AI-чат с RAG и персонализацией (backend готов)
- Современный UI с rich media и интерактивными элементами
- Voice input/output для hands-free режима
- Streaming responses для лучшего UX
- Глубокая интеграция с рекомендательной системой
- Метрики для continuous improvement
- Реализация в 5 фаз, 8 недель

Чат станет основным способом взаимодействия пользователей с системой рекомендаций.

#### 5.5 Персонализация
- [ ] **Taste Profile** - Визуализация вкусов пользователя
  - График по жанрам, годам, странам
  - "Твои любимые режиссеры"
  - AI-генерированное описание вкуса ("Ты любитель европейского артхауса с элементами нео-нуара")
- [ ] **Dynamic recommendations** - Учет времени просмотра, контекста
  - "На основе твоих последних оценок кажется ты сейчас в настроении для..."

#### 5.6 Социальные функции
- [ ] **Watch parties** - Рекомендации для группы друзей
  - "Что посмотреть вместе с учетом вкусов всех?"
  - Анализ пересечения вкусов
- [ ] **Shared watchlists** - Совместные списки для просмотра

#### 5.7 Умные уведомления
- [ ] **Proactive recommendations**
  - "Вышел новый фильм в твоем любимом жанре"
  - "Этот фильм из твоего watchlist скоро уберут из Netflix"

---

### 6. Производительность и масштабирование
**Основная задача:** Оптимизировать систему для работы с большими объемами данных

**Подзадачи:**

#### 6.1 База данных
- [ ] **Индексы для поиска**
  - GIN индексы для full-text search
  - Индексы на часто используемых полях (genres, release_date, vote_average)
- [ ] **Партиционирование таблиц** (если >1M записей)
  - Партиционирование по годам или жанрам
- [ ] **Materialized views** для сложных запросов
  - Предрасчитанные популярные фильмы
  - Статистика по жанрам

#### 6.2 Vector Search оптимизация
- [ ] **pgvector с HNSW индексом**
  - Переключиться с IVFFlat на HNSW для лучшей производительности
  - Настроить параметры индекса (m, ef_construction)
- [ ] **Approximate Nearest Neighbors (ANN)**
  - Ускорение поиска похожих фильмов
  - Trade-off между точностью и скоростью
- [ ] **Batch embedding generation**
  - Параллельная генерация embeddings для новых фильмов
  - Rate limiting для OpenAI API

#### 6.3 Кэширование
- [ ] **Redis кэш стратегия**
  - Кэш популярных запросов (TTL: 1 час)
  - Кэш рекомендаций (TTL: 24 часа)
  - Кэш результатов поиска
- [ ] **CDN для статики**
  - Постеры и изображения через CDN
  - Рассмотреть Cloudflare Images или Vercel Image Optimization
- [ ] **Server-side caching**
  - HTTP ETag headers
  - Stale-while-revalidate стратегия

#### 6.4 API оптимизация
- [ ] **Pagination для всех списков**
  - Cursor-based pagination для больших датасетов
  - Limit по умолчанию: 20-50 результатов
- [ ] **GraphQL** (опционально)
  - Избежать overfetching
  - Клиент запрашивает только нужные поля
- [ ] **Rate limiting**
  - Per-user rate limits
  - IP-based rate limiting для анонимных пользователей
- [ ] **Database connection pooling**
  - PgBouncer для управления соединениями
  - Оптимизация количества connections

#### 6.5 Frontend оптимизация
- [ ] **Lazy loading изображений**
  - Intersection Observer API
  - Blur placeholder while loading
- [ ] **Code splitting**
  - Route-based splitting (Next.js dynamic imports)
  - Component-based splitting для тяжелых компонентов
- [ ] **Virtual scrolling** для длинных списков
  - React Virtual или TanStack Virtual
  - Рендер только видимых элементов
- [ ] **Optimistic updates**
  - Мгновенная UI реакция без ожидания сервера
  - Rollback при ошибках

#### 6.6 Мониторинг и профилирование
- [ ] **APM (Application Performance Monitoring)**
  - Sentry для error tracking
  - Vercel Analytics или Posthog для метрик
- [ ] **Database query monitoring**
  - Логирование slow queries (>1s)
  - Query plan analysis
- [ ] **API response time tracking**
  - Histogram метрики в Prometheus/Grafana
  - Алерты при деградации производительности

---

### 7. Локализация (i18n) 🟡 Частично (с багами)
**Основная задача:** Добавить поддержку нескольких языков

**Статус:** Базовая реализация готова, но требует исправлений и доработки

**Языки:**
- [x] Русский (ru) - частично ⚠️
- [x] Английский (en) - частично ⚠️
- [ ] Украинский (uk)
- [ ] Польский (pl)

**Подзадачи:**

#### 7.1 Frontend
- [x] Настроить next-intl ✅ (но с багами роутинга)
- [x] Создать файлы переводов для каждого языка (частично)
  - [x] `/messages/ru.json` ✅
  - [x] `/messages/en.json` ✅
  - [ ] `/messages/uk.json`
  - [ ] `/messages/pl.json`
- [x] Перевести UI элементы (частично): ⚠️
  - [x] Навигация и меню (есть баги)
  - [x] Страницы (Discover, Watchlist, Recommendations, Chat) (не все переведено)
  - [x] Формы (Login, Signup) (частично)
  - [x] Кнопки и actions (частично)
  - [ ] Сообщения об ошибках (многие не переведены)
  - [ ] Toast уведомления (не все)
- [x] Добавить переключатель языка в навигацию ✅ (но с багами работы)
- [x] Локализованные URL с префиксами `/en`, `/ru` ✅ (но роутинг работает с ошибками)
- [ ] Сохранять выбранный язык в user preferences (сейчас только cookie/URL)
- [ ] Исправить баги роутинга и переключения языка 🔥
- [ ] Дополнить переводы для всех компонентов
- [ ] RTL support (если планируются арабский/иврит в будущем)

#### 7.2 Backend/API
- [ ] Локализованные ответы от AI
  - [ ] Передавать язык пользователя в GPT промпт
  - [ ] "Respond in Russian/Ukrainian/Polish"
- [ ] Локализация жанров фильмов
  - [ ] TMDB API поддерживает language parameter
  - [ ] Кэширование переводов в Redis
- [ ] Локализованные email уведомления (если будут)

#### 7.3 Контент
- [ ] Переводы описаний фильмов (через TMDB API)
- [ ] Локализованные названия фильмов
- [ ] Fallback на английский если перевода нет

#### 7.4 SEO
- [ ] Мультиязычные meta теги
- [ ] hreflang tags для каждого языка
- [ ] Локализованные URL (опционально)
  - `/ru/discover`, `/uk/discover`, `/pl/discover`

**Технологии:**
- next-intl (рекомендуется для Next.js App Router)
- Crowdin или POEditor для управления переводами (опционально)

---

### 8. Безопасность (Security)
**Основная задача:** Усилить защиту приложения и данных пользователей

**Подзадачи:**

#### 8.1 Аутентификация и авторизация
- [ ] **Multi-factor authentication (MFA)**
  - [ ] TOTP (Time-based One-Time Password) через Supabase
  - [ ] SMS или email верификация
- [ ] **OAuth providers**
  - [ ] Google Sign-In
  - [ ] GitHub OAuth
  - [ ] Apple Sign In (для iOS)
- [ ] **Session management**
  - [ ] Автоматический logout при неактивности (timeout)
  - [ ] "Remember me" функционал с refresh tokens
  - [ ] Logout на всех устройствах
- [ ] **Password security**
  - [ ] Проверка силы пароля (минимум 8 символов, цифры, спецсимволы)
  - [ ] Password reset flow с email верификацией
  - [ ] Защита от brute force (rate limiting на login)

#### 8.2 API Security
- [ ] **Rate limiting**
  - [ ] Per-user rate limits (100 req/min)
  - [ ] Per-IP rate limits для анонимных пользователей
  - [ ] Exponential backoff при превышении
- [ ] **API Keys protection**
  - [ ] Environment variables для всех секретов
  - [ ] Ротация API ключей (особенно TMDB, OpenAI)
  - [ ] Separate keys для dev/staging/production
- [ ] **Request validation**
  - [ ] Input sanitization (защита от XSS)
  - [ ] Schema validation с Zod или Joi
  - [ ] Max request body size limits
- [ ] **CORS configuration**
  - [ ] Строгие CORS политики (только разрешенные origins)
  - [ ] Проверка Referer header
- [ ] **HTTPS только**
  - [ ] Force HTTPS redirect
  - [ ] HSTS (HTTP Strict Transport Security) headers
  - [ ] Secure cookies (httpOnly, secure, sameSite)

#### 8.3 Database Security
- [ ] **SQL Injection prevention**
  - [ ] Использование parameterized queries (уже есть через ORM)
  - [ ] Проверка всех user inputs
- [ ] **Row Level Security (RLS) в Supabase**
  - [ ] Настроить RLS policies для всех таблиц
  - [ ] Пользователи видят только свои данные (watchlist, ratings)
  - [ ] Admin role для управления фильмами
- [ ] **Data encryption**
  - [ ] Encryption at rest (Supabase по умолчанию)
  - [ ] Encryption in transit (SSL/TLS)
  - [ ] Шифрование чувствительных полей (если есть)
- [ ] **Database backups**
  - [ ] Автоматические daily backups
  - [ ] Тестирование восстановления из backup
  - [ ] Point-in-time recovery (PITR)

#### 8.4 Frontend Security
- [ ] **XSS Protection**
  - [ ] Sanitize всех user inputs перед отображением
  - [ ] Content Security Policy (CSP) headers
  - [ ] Избегать dangerouslySetInnerHTML (или использовать DOMPurify)
- [ ] **CSRF Protection**
  - [ ] CSRF tokens для форм
  - [ ] SameSite cookies
- [ ] **Dependency security**
  - [ ] Регулярный `npm audit` / `pnpm audit`
  - [ ] Автоматические обновления зависимостей (Dependabot)
  - [ ] Проверка на известные уязвимости
- [ ] **Client-side secrets**
  - [ ] Никаких секретов в клиентском коде
  - [ ] Только `NEXT_PUBLIC_*` переменные для публичных данных

#### 8.5 Monitoring и Logging
- [ ] **Security logging**
  - [ ] Логирование попыток входа (успешных и неуспешных)
  - [ ] Логирование изменений чувствительных данных
  - [ ] IP tracking для подозрительной активности
- [ ] **Error handling**
  - [ ] Не показывать stack traces пользователям
  - [ ] Generic error messages (избегать утечки информации)
  - [ ] Детальные логи только на сервере
- [ ] **Intrusion detection**
  - [ ] Алерты при подозрительной активности
  - [ ] Автоматическая блокировка IP при множественных неудачных попытках
  - [ ] Monitoring аномального трафика

#### 8.6 Privacy и GDPR
- [ ] **Data privacy**
  - [ ] Privacy Policy страница
  - [ ] Cookie consent banner
  - [ ] GDPR compliance (для EU пользователей)
- [ ] **User data management**
  - [ ] Возможность экспорта своих данных
  - [ ] Возможность удаления аккаунта и всех данных
  - [ ] Анонимизация данных после удаления
- [ ] **Third-party data sharing**
  - [ ] Прозрачность о том, какие данные идут в OpenAI
  - [ ] Опция opt-out из AI features
  - [ ] Минимизация данных отправляемых в третьи сервисы

#### 8.7 Infrastructure Security
- [ ] **Environment isolation**
  - [ ] Separate database для dev/staging/production
  - [ ] Separate API keys для каждого окружения
- [ ] **Secrets management**
  - [ ] Railway/Vercel secrets вместо .env файлов
  - [ ] Ротация секретов каждые 90 дней
  - [ ] Проверка на случайные коммиты секретов (git-secrets)
- [ ] **DDoS Protection**
  - [ ] Cloudflare или Railway built-in DDoS protection
  - [ ] Rate limiting на infrastructure уровне
- [ ] **Security headers**
  - [ ] X-Frame-Options (защита от clickjacking)
  - [ ] X-Content-Type-Options
  - [ ] Referrer-Policy
  - [ ] Permissions-Policy

#### 8.8 Security Testing
- [ ] **Automated security scans**
  - [ ] SAST (Static Application Security Testing)
  - [ ] Dependency scanning (Snyk, GitHub Advanced Security)
- [ ] **Penetration testing**
  - [ ] Тестирование на распространенные уязвимости (OWASP Top 10)
  - [ ] SQL injection, XSS, CSRF тесты
- [ ] **Security audits**
  - [ ] Регулярный code review с фокусом на security
  - [ ] Аудит разрешений и access control

---

## Приоритизация

### ✅ Выполнено:
- ~~#3 Автодополнение поиска~~ ✅ (частично - можно улучшить)
- ~~#2 База данных~~ ✅ (1675 фильмов, сериалы, embeddings, BullMQ)
- #7 Локализация 🟡 (базово работает, но с багами)
- #5.3 Movie Explanations API ✅ (backend готов)

### 🔥 High Priority (СЕЙЧАС):
1. **#9 КРИТИЧНО: Исправить импорт через очереди** 🚨 (частично выполнено ✅)
   - ✅ Отслеживание прогресса через import_progress таблицу
   - ✅ Начало со страницы N+1
   - ✅ Проверка дубликатов перед импортом
   - ✅ Логирование imported vs skipped
   - ✅ Импорт по годам (batch imports)
   - ✅ Локализация: фетчинг en, ru, uk переводов
   - ✅ Throttling: 100-250ms между запросами
   - ✅ Переход на локальный Redis
   - ⏳ **Осталось**: Настроить cron расписание, добавить ротацию категорий, автоматические алерты
2. **#7 Исправить баги локализации** - роутинг, переключение языка
3. **#5.3 Movie Explanations UI** - добавить интерфейс для "Почему этот фильм?"
4. **#4 Quick actions для watchlist** - кнопки на карточках
5. **#3 Улучшить автодополнение** - подсветка, клавиатурная навигация

### 📋 Medium Priority:
- #1 UI/UX улучшения (dark mode, анимации, skeleton loaders)
- #5.1-5.2 Контекстные рекомендации (mood-based, время суток)
- #6.1-6.3 База данных и кэширование (индексы, Redis)
- #8.1-8.3 Базовая безопасность (MFA, rate limiting, RLS)

### 📦 Low Priority:
- #2 Расширение базы до 10000+ фильмов (можно делать постепенно)
- #5.6-5.7 Социальные функции (watch parties, shared watchlists)
- #6.4-6.6 Advanced оптимизации (GraphQL, виртуализация)
- #8.6-8.8 GDPR, Infrastructure Security, Testing

---

## 10. 🔐 Admin Panel & Management System

**Priority:** Medium-Low (после основных фич)
**Status:** Future / Planned

### Описание
Полноценная административная панель с отдельным бэкендом для управления системой, пользователями и контентом.

### Основной функционал

#### 10.1 Управление пользователями
- Просмотр списка пользователей с фильтрацией и поиском
- Детальная информация о каждом пользователе:
  - История активности и статистика
  - Watchlist и оценки
  - История поиска и рекомендаций
- Действия с пользователями:
  - Блокировка/разблокировка аккаунта
  - Изменение ролей (user, moderator, admin, super_admin)
  - Удаление аккаунта с анонимизацией данных
  - Сброс пароля

#### 10.2 Статистика и аналитика
- **Dashboard с метриками:**
  - Количество пользователей (активных/неактивных)
  - Количество фильмов/сериалов в базе
  - Статистика импорта (успешные/ошибки)
  - Популярные фильмы и сериалы
  - Активность пользователей (DAU, MAU, WAU)
- **Графики и визуализация:**
  - Динамика роста пользователей
  - Популярность контента по жанрам
  - Статистика поиска и рекомендаций
  - AI usage (embeddings, GPT запросы)
- **Экспорт данных:**
  - CSV/Excel экспорт статистики
  - Автоматические отчеты

#### 10.3 Безопасность и аудит
- **Двухфакторная аутентификация (2FA)** для админов
- **Audit log** всех действий администраторов:
  - Логирование изменений данных
  - IP tracking и user agent
  - Timestamp всех операций
- **Мониторинг подозрительной активности:**
  - Множественные неудачные попытки входа
  - Необычные паттерны использования
  - Массовые действия от одного IP
- **Role-based access control (RBAC):**
  - Super Admin (полный доступ)
  - Admin (управление контентом)
  - Moderator (модерация контента)
  - Support (работа с пользователями)
- **Security measures:**
  - IP whitelist для админ-панели
  - Rate limiting
  - Session management

#### 10.4 Управление импортом
- **Мониторинг очередей:**
  - Текущий статус задач (waiting, active, completed, failed)
  - История импорта по датам
  - Статистика по годам и категориям
  - Real-time updates через WebSockets
- **Управление задачами:**
  - Запуск/остановка импорта
  - Настройка расписания (cron expressions)
  - Изменение приоритетов задач
  - Retry failed jobs
  - Очистка старых завершенных задач
- **Конфигурация импорта:**
  - Диапазон лет для импорта
  - Количество элементов на задачу
  - Настройка локализаций (en, ru, uk)
  - Rate limiting для TMDB API
  - Batch размеры
- **Мониторинг API квот:**
  - TMDB API usage и лимиты
  - OpenAI API usage (embeddings, GPT)
  - Предупреждения при приближении к лимитам
  - Cost tracking

#### 10.5 Управление данными (контентом)
- **Фильмы и сериалы:**
  - Просмотр всего контента с фильтрами:
    - По жанрам, годам, рейтингу
    - Поиск по названию, описанию
    - Фильтр по наличию embeddings
  - Редактирование метаданных:
    - Названия и описания
    - Переводы на разные языки
    - Жанры, актеры, режиссеры
  - **Бан/удаление контента:**
    - Мягкое удаление (soft delete)
    - Жесткое удаление из базы
    - Причина удаления с логированием
    - Массовое удаление по критериям
  - Модерация контента:
    - Проверка качества переводов
    - Валидация изображений (постеры)
    - Удаление дубликатов
    - Проверка метаданных
- **Embeddings управление:**
  - Статус генерации embeddings
  - Перегенерация для конкретного контента
  - Массовая перегенерация по фильтрам
  - Очистка устаревших embeddings
  - Статистика покрытия (% с embeddings)
- **Кеш управление:**
  - Просмотр Redis кеша по ключам
  - Очистка кеша по паттернам
  - Статистика hit/miss rate
  - Мониторинг использования памяти

#### 10.6 Уведомления и алерты
- **Email/Slack/Telegram уведомления:**
  - Критические ошибки импорта
  - Превышение API квот
  - Подозрительная активность
  - Падение производительности системы
  - Проблемы с базой данных
- **Настройка уровней критичности:**
  - Info, Warning, Error, Critical
  - Фильтры по типам алертов
- **История уведомлений:**
  - Просмотр всех алертов
  - Фильтрация по датам и типам
  - Статус обработки (read/unread)

#### 10.7 Система поддержки (опционально)
- Тикет система для обращений пользователей
- Live chat для поддержки
- База знаний (FAQ)
- Шаблоны ответов для частых вопросов

### Технический стек

**Backend (NestJS):**
- Отдельное приложение `apps/admin-api`
- Separate database schema для админ данных
- JWT authentication с refresh tokens
- WebSockets для real-time updates (Socket.io)
- Bull Board для визуализации очередей

**Frontend (Next.js):**
- Отдельное приложение `apps/admin`
- Admin UI библиотека:
  - React Admin
  - Ant Design Pro
  - или Tremor (для dashboard)
- Charts: Recharts / Chart.js
- Real-time updates через WebSockets

**Безопасность:**
- Helmet.js для security headers
- CORS с whitelist только для admin домена
- Rate limiting (express-rate-limit)
- Input validation (class-validator, Zod)
- Encryption для чувствительных данных

**Мониторинг:**
- Prometheus для метрик
- Grafana для визуализации
- Sentry для error tracking
- Winston для структурированного логирования

### API Endpoints (примеры)

```typescript
// Users Management
GET    /admin/api/users
GET    /admin/api/users/:id
PUT    /admin/api/users/:id/block
PUT    /admin/api/users/:id/unblock
DELETE /admin/api/users/:id
PUT    /admin/api/users/:id/role

// Statistics
GET    /admin/api/stats/overview
GET    /admin/api/stats/users
GET    /admin/api/stats/content
GET    /admin/api/stats/import
GET    /admin/api/stats/api-usage

// Import Management
GET    /admin/api/import/queues
GET    /admin/api/import/stats
POST   /admin/api/import/movies/batch
POST   /admin/api/import/tv/batch
POST   /admin/api/import/start
POST   /admin/api/import/stop
DELETE /admin/api/import/clear-completed
PUT    /admin/api/import/config

// Content Management
GET    /admin/api/content/movies
GET    /admin/api/content/tv-shows
GET    /admin/api/content/:type/:id
PUT    /admin/api/content/:type/:id
PUT    /admin/api/content/:type/:id/ban
DELETE /admin/api/content/:type/:id
POST   /admin/api/content/regenerate-embeddings

// Security & Audit
GET    /admin/api/audit-log
GET    /admin/api/security/suspicious-activity
POST   /admin/api/security/ip-whitelist
GET    /admin/api/security/failed-logins

// Notifications
GET    /admin/api/notifications
POST   /admin/api/notifications/settings
PUT    /admin/api/notifications/:id/read

// Cache Management
GET    /admin/api/cache/keys
DELETE /admin/api/cache/clear
GET    /admin/api/cache/stats
```

### Database Schema (дополнительные таблицы)

```sql
-- Admin audit log
create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp default now()
);

create index idx_audit_log_admin on admin_audit_log(admin_id);
create index idx_audit_log_created on admin_audit_log(created_at desc);

-- Admin roles
create table admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  role text check (role in ('super_admin', 'admin', 'moderator', 'support')),
  granted_by uuid references auth.users(id),
  granted_at timestamp default now()
);

-- Banned content
create table banned_content (
  id uuid primary key default gen_random_uuid(),
  content_type text check (content_type in ('movie', 'tv_show')),
  content_id bigint not null,
  reason text,
  banned_by uuid references auth.users(id),
  banned_at timestamp default now(),
  unique(content_type, content_id)
);

-- Import schedules
create table import_schedules (
  id uuid primary key default gen_random_uuid(),
  content_type text check (content_type in ('movies', 'tv_shows')),
  cron_expression text not null,
  config jsonb,
  enabled boolean default true,
  last_run timestamp,
  next_run timestamp,
  created_by uuid references auth.users(id),
  created_at timestamp default now()
);

-- Admin notifications
create table admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  severity text check (severity in ('info', 'warning', 'error', 'critical')),
  title text not null,
  message text,
  metadata jsonb,
  read boolean default false,
  created_at timestamp default now()
);

create index idx_notifications_unread on admin_notifications(created_at desc) where read = false;
```

### Implementation Roadmap

**Phase 1: Core Backend (1-2 недели)**
- [ ] Создать `apps/admin-api` приложение
- [ ] Admin authentication & JWT
- [ ] RBAC система (роли и permissions)
- [ ] Audit logging
- [ ] Basic security (rate limiting, CORS)

**Phase 2: User Management (1 неделя)**
- [ ] CRUD endpoints для пользователей
- [ ] User statistics API
- [ ] Block/unblock functionality
- [ ] Role management

**Phase 3: Statistics Dashboard (1 неделя)**
- [ ] Dashboard API endpoints
- [ ] Aggregated statistics
- [ ] Charts data endpoints
- [ ] Export functionality

**Phase 4: Import Management (1 неделя)**
- [ ] Queue monitoring API
- [ ] Import control endpoints
- [ ] Configuration management
- [ ] Bull Board integration

**Phase 5: Content Management (1 неделя)**
- [ ] Content CRUD endpoints
- [ ] Ban/delete functionality
- [ ] Embeddings management
- [ ] Bulk operations

**Phase 6: Admin Frontend (2-3 недели)**
- [ ] Создать `apps/admin` Next.js app
- [ ] Authentication UI
- [ ] Dashboard с графиками
- [ ] User management UI
- [ ] Import management UI
- [ ] Content management UI
- [ ] Responsive design

**Phase 7: Advanced Features (1-2 недели)**
- [ ] Real-time updates (WebSockets)
- [ ] Notifications system
- [ ] Advanced security features
- [ ] Monitoring integration (Grafana)

**Phase 8: Testing & Polish**
- [ ] E2E tests для админки
- [ ] Security audit
- [ ] Performance optimization
- [ ] Documentation

### Требования к безопасности

**Обязательно:**
- ✅ Отдельная аутентификация для админов
- ✅ 2FA для всех администраторов
- ✅ IP whitelist (только разрешенные IP могут получить доступ)
- ✅ Audit log всех действий
- ✅ Rate limiting на все endpoints
- ✅ HTTPS only
- ✅ Session timeout (30 минут неактивности)
- ✅ Strong password policy

**Рекомендуется:**
- VPN для доступа к админке
- Separate subdomain (admin.domain.com)
- WAF (Web Application Firewall)
- Regular security audits

---
