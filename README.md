# SiteIQ

Instant AI-powered CRO audits for any website. Paste a URL and get a scored report across 6 conversion pillars — powered by Claude AI.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Playwright + @sparticuz/chromium-min** for serverless scraping
- **Anthropic Claude** for AI analysis
- **Supabase** for auth and audit history
- **Stripe** for Pro and Agency subscriptions
- **Tailwind CSS v4**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_AGENCY_PRICE_ID=
```
