# Список улучшений для Movie Recommendr

## Статус деплоя
- ✅ Backend deployed: https://api-production-9141.up.railway.app
- ✅ Frontend deployed: https://m-recommendr-web-ip4u.vercel.app
- ✅ Production ready

---

## Запланированные улучшения

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
- [ ] Импортировать популярные фильмы из TMDB (топ-10000+)
- [ ] Добавить поддержку сериалов в базу данных
  - [ ] Создать таблицу `tv_shows` с полями для сезонов и эпизодов
  - [ ] Добавить связи между сериалами, сезонами и эпизодами
  - [ ] Обновить embedding генерацию для сериалов
- [ ] Настроить автоматическую синхронизацию новых фильмов/сериалов из TMDB (cron job)
- [ ] Добавить embeddings для всех импортированных фильмов
- [ ] Оптимизировать процесс импорта (batch processing, параллельная обработка)
- [ ] Добавить метаданные: режиссеры, актеры, студии

---

### 3. Поиск с автодополнением
**Основная задача:** Реализовать autocomplete при вводе названия фильма/сериала

**Подзадачи:**
- [ ] Создать endpoint `/api/movies/autocomplete?q=...`
- [ ] Реализовать debounced поиск (задержка ~300ms)
- [ ] Показывать выпадающий список с результатами при вводе
- [ ] Отображать постеры в выпадающем списке
- [ ] Добавить подсветку совпадений в результатах
- [ ] Показывать категорию (фильм/сериал) и год выпуска
- [ ] Навигация по результатам клавишами (стрелки вверх/вниз, Enter)
- [ ] Кэширование результатов автодополнения в Redis
- [ ] Limit до 5-10 результатов для производительности

**Технологии:**
- Frontend: React Hook для debounce, Radix UI Combobox или Headless UI
- Backend: PostgreSQL full-text search или trigram similarity для быстрого поиска

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
- [ ] **Movie Explanations** - Почему GPT рекомендует именно этот фильм
  - Детальный анализ сюжета, тем, стиля
  - Сравнение с фильмами из watchlist пользователя
- [ ] **Similar Movies с объяснением** - Не просто "похожие", а почему похожи
  - "Оба исследуют тему одиночества через призму sci-fi"

#### 5.4 Интерактивный чат
- [ ] **Улучшенный диалог с AI**
  - Память о предыдущих предпочтениях
  - Уточняющие вопросы ("Тебе больше нравится экшен или драма?")
  - Поддержка follow-up вопросов
- [ ] **Voice input** для поиска (Web Speech API)

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

### 7. Локализация (i18n)
**Основная задача:** Добавить поддержку нескольких языков

**Языки:**
- Русский (ru)
- Украинский (uk)
- Польский (pl)
- Английский (en) - по умолчанию

**Подзадачи:**

#### 7.1 Frontend
- [ ] Настроить next-intl или react-i18next
- [ ] Создать файлы переводов для каждого языка
  - [ ] `/locales/ru/common.json`
  - [ ] `/locales/uk/common.json`
  - [ ] `/locales/pl/common.json`
  - [ ] `/locales/en/common.json`
- [ ] Перевести UI элементы:
  - [ ] Навигация и меню
  - [ ] Страницы (Discover, Watchlist, Recommendations, Chat)
  - [ ] Формы (Login, Signup)
  - [ ] Кнопки и actions
  - [ ] Сообщения об ошибках
  - [ ] Toast уведомления
- [ ] Добавить переключатель языка в навигацию
- [ ] Сохранять выбранный язык в localStorage или user preferences
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
**High Priority:**
- #3 Автодополнение поиска
- #4 Quick actions для watchlist
- #5.3 Movie Explanations
- #7 Локализация (как минимум RU/UK)
- #8.1-8.3 Базовая безопасность (Auth, API, Database)

**Medium Priority:**
- #1 UI/UX улучшения
- #5.1-5.2 Контекстные рекомендации
- #6.1-6.3 База данных и кэширование
- #8.4-8.5 Frontend Security & Monitoring

**Low Priority:**
- #2 Массовый импорт (можно делать постепенно)
- #5.6-5.7 Социальные функции
- #6.4-6.6 Advanced оптимизации
- #8.6-8.8 GDPR, Infrastructure Security, Testing

