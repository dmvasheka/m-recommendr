# Vercel Deployment Guide for Web App

## Исправленные проблемы

### 1. TypeScript ошибка в i18n/request.ts
**Проблема**: `locale` мог быть `string | undefined`, что вызывало ошибку компиляции.

**Решение**: Использован явный type guard с type assertion для гарантии типа `string`.

```typescript
const validLocale = (locale && routing.locales.includes(locale as any)
  ? locale
  : routing.defaultLocale) as string;
```

### 2. Конфигурация для монорепозитория
Проект использует Turbo monorepo, что требует специальной настройки на Vercel.

## Настройка деплоя на Vercel

### Шаг 1: Импорт проекта
1. Перейдите на https://vercel.com/new
2. Выберите ваш GitHub/GitLab/Bitbucket репозиторий
3. Нажмите "Import"

### Шаг 2: Настройка проекта

**ВАЖНО**: В разделе "Configure Project" установите следующие параметры:

| Параметр | Значение |
|----------|----------|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/web` ⚠️ (обязательно!) |
| **Build Command** | Оставить пустым (auto-detect) |
| **Install Command** | Оставить пустым (auto-detect) |
| **Output Directory** | `.next` (по умолчанию) |

### Шаг 3: Переменные окружения

Добавьте следующие переменные в Vercel Dashboard → Settings → Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=your_backend_api_url
```

**Где взять значения:**
- Supabase: https://supabase.com/dashboard/project/_/settings/api
- API URL: URL вашего backend API (если есть)

### Шаг 4: Deploy
Нажмите кнопку "Deploy" и подождите завершения сборки.

## Локальная проверка

Перед деплоем убедитесь, что билд проходит локально:

```bash
# Из корня монорепозитория
pnpm turbo run build --filter=web

# Или из apps/web
pnpm build
```

Проверка production режима:
```bash
pnpm start
```

## Troubleshooting

### Ошибка: "Cannot find workspace packages"
**Решение**: Убедитесь, что в Root Directory указано `apps/web`

### Ошибка: TypeScript compilation failed
**Решение**: Проверьте, что все зависимости workspace (@repo/*) установлены:
```bash
pnpm install
```

### Ошибка: "Module not found: next-intl"
**Решение**: Vercel должен запустить `pnpm install` в корне монорепозитория. Убедитесь, что Root Directory установлен правильно.

### Предупреждения о Node.js API в Edge Runtime
Это нормально для Supabase middleware. Предупреждения не влияют на работу приложения.

## Дополнительная информация

### Структура монорепозитория
```
m-recommendr/
├── apps/
│   └── web/          ← Root Directory для Vercel
├── packages/
│   ├── eslint-config/
│   └── typescript-config/
├── turbo.json        ← Turbo конфигурация
└── pnpm-workspace.yaml
```

### Автоматические деплои
Vercel автоматически деплоит при пуше в main ветку и создаёт preview deployments для PR.

### Custom Domains
Настройте домен в Vercel Dashboard → Settings → Domains

## Полезные ссылки
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Turbo + Vercel](https://turbo.build/repo/docs/handbook/deploying-with-docker)
- [Next.js i18n](https://next-intl-docs.vercel.app/)
