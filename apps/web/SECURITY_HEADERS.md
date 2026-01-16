# Security Headers Documentation

## ✅ Реализовано: Comprehensive Security Headers

Все критические HTTP заголовки безопасности настроены в `next.config.js`.

## Реализованные заголовки

### 1. Content-Security-Policy (CSP)
**Защита от:** XSS (Cross-Site Scripting), code injection, clickjacking

**Настройки:**
- `default-src 'self'` - Разрешены только ресурсы с того же origin
- `script-src 'self' 'unsafe-eval' 'unsafe-inline'` - Скрипты (Next.js требует unsafe-eval/inline для dev)
- `style-src 'self' 'unsafe-inline'` - Стили (Tailwind требует unsafe-inline)
- `img-src 'self' https: data: blob:` - Изображения с любых HTTPS источников
- `font-src 'self' data:` - Шрифты
- `connect-src 'self' https://ezsevdbawfylziuqhbnd.supabase.co https://api-production-9141.up.railway.app http://localhost:3001 ws://localhost:*` - API соединения
- `frame-ancestors 'self'` - Защита от iframe embedding
- `base-uri 'self'` - Ограничение base URL
- `form-action 'self'` - Формы могут отправляться только на тот же origin

### 2. X-Content-Type-Options
**Защита от:** MIME type sniffing attacks

**Значение:** `nosniff`

Браузер не будет пытаться угадать MIME type файла, предотвращая исполнение неисполняемых файлов как скриптов.

### 3. X-Frame-Options
**Защита от:** Clickjacking attacks

**Значение:** `SAMEORIGIN`

Страница может быть встроена во фрейм только с того же origin. Это предотвращает атаки, когда злоумышленник встраивает ваш сайт в невидимый iframe.

### 4. X-XSS-Protection
**Защита от:** Reflected XSS attacks

**Значение:** `1; mode=block`

Включает встроенный XSS фильтр браузера. При обнаружении атаки страница блокируется.

> **Note:** Этот заголовок устарел для современных браузеров (CSP более эффективен), но оставлен для поддержки старых браузеров.

### 5. Referrer-Policy
**Защита от:** Information leakage through Referer header

**Значение:** `strict-origin-when-cross-origin`

- При переходах внутри сайта: отправляется полный URL
- При переходах на другие HTTPS сайты: отправляется только origin
- При переходах с HTTPS на HTTP: referrer не отправляется

### 6. Permissions-Policy
**Защита от:** Unauthorized use of browser features

**Значение:** `camera=(), microphone=(), geolocation=(), interest-cohort=()`

Отключает доступ к:
- Камере
- Микрофону
- Геолокации
- FLoC (privacy-invasive Google tracking)

### 7. Strict-Transport-Security (HSTS)
**Защита от:** SSL stripping attacks, cookie hijacking

**Значение:** `max-age=63072000; includeSubDomains; preload`

**⚠️ Production Only** - Этот заголовок активируется только в production.

- `max-age=63072000` (2 года) - Браузер будет принудительно использовать HTTPS
- `includeSubDomains` - Применяется ко всем поддоменам
- `preload` - Сайт может быть добавлен в HSTS preload list браузеров

## Тестирование

### Локальное тестирование
Запустите тестовый скрипт:
```bash
node test-security-headers.js
```

### Проверка в браузере
1. Запустите dev или production сервер
2. Откройте DevTools → Network
3. Обновите страницу
4. Проверьте Response Headers для главной страницы

### Online тестирование
После деплоя проверьте заголовки на:
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

## Security Score

**Ожидаемый результат:**
- SecurityHeaders.com: **A** или **A+**
- Mozilla Observatory: **B** или выше

### Почему не A+ everywhere?
- `unsafe-inline` и `unsafe-eval` в CSP требуются для Next.js и Tailwind
- В production можно ужесточить CSP, используя nonce или hash для inline scripts

## Дополнительные рекомендации

### Для Production
1. **Ужесточить CSP:**
   ```javascript
   // Использовать nonce для inline scripts
   script-src 'self' 'nonce-{random}'
   ```

2. **Добавить Subresource Integrity (SRI):**
   ```html
   <script src="..." integrity="sha384-..." crossorigin="anonymous"></script>
   ```

3. **Настроить CORS:**
   ```javascript
   // В API routes
   res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com')
   ```

### Мониторинг
Настройте CSP Reporting для получения уведомлений о нарушениях:
```javascript
Content-Security-Policy: ...; report-uri https://your-csp-report-collector.com/report
```

## Troubleshooting

### Проблема: Стили не загружаются
**Решение:** Проверьте `style-src` в CSP. Tailwind требует `'unsafe-inline'`.

### Проблема: API запросы блокируются
**Решение:** Добавьте домен API в `connect-src`:
```javascript
connect-src 'self' https://your-api.com
```

### Проблема: Сторонние скрипты не работают (Google Analytics, etc.)
**Решение:** Добавьте домены в соответствующие директивы CSP:
```javascript
script-src 'self' https://www.googletagmanager.com
```

## Следующие шаги

- [ ] Мониторинг CSP violations (CSP reporting)
- [ ] Добавить SRI для внешних зависимостей
- [ ] Ужесточить CSP в production (убрать unsafe-inline)
- [ ] Настроить CORS для API
- [ ] Добавить rate limiting на API endpoints

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
