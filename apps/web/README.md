This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This project is part of a Turbo monorepo. Follow these steps to deploy:

### 1. Import Project
Import your repository to Vercel: https://vercel.com/new

### 2. Configure Project Settings
In the Vercel project configuration:

- **Framework Preset**: Next.js
- **Root Directory**: `apps/web` (important for monorepo)
- **Build Command**: Leave empty (Vercel will auto-detect via turbo.json)
- **Install Command**: Leave empty (will use `pnpm install` automatically)
- **Output Directory**: Leave as default (`.next`)

### 3. Environment Variables
Add the following environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `NEXT_PUBLIC_API_URL` - Your API URL (optional, if using separate backend)

### 4. Deploy
Click "Deploy" and Vercel will automatically build using Turbo!

### Troubleshooting
- Make sure `pnpm-workspace.yaml` exists in the root
- Verify `turbo.json` is configured correctly
- Check that all workspace dependencies (`@repo/*`) are properly linked
