# Aperture — AI CRO Audit SaaS

Crawl any live website, score conversion UX from 0–100, and get copy-paste HTML/CSS/Tailwind fixes.

Aperture launches a headless browser (Puppeteer), extracts DOM structure, CTA styles, heading hierarchy, computed CSS, metadata, and a full-page screenshot. That context is sent through a structured LLM pipeline (OpenAI or Anthropic, Zod JSON) — or a local heuristic engine if no API key is set — and stored as an audit report.

---

## Demo / test account

After `npx prisma db seed`, sign in at [`/login`](http://localhost:3000/login):

| Field | Value |
| --- | --- |
| **Email** | `demo@aperture.dev` |
| **Password** | `demo1234` |

The seeded user is on the **PRO** plan (unlimited sites). Registering a new account creates a **FREE** workspace (5-site cap).

---

## Features

- Email/password auth (Auth.js) plus optional Google OAuth
- Dashboard URL form to register a site and launch an analysis
- Live crawl status: **Scraping DOM… → Analyzing CRO heuristics… → Generating Report…**
- Score badges: Poor (0–49), Medium (50–79), Good (80–100)
- Report page with gauge, metric cards, 5–10 suggestion cards, and screenshot overlay markers
- Settings: profile, per-user OpenAI/Anthropic keys, plan status, bulk delete
- Heuristic fallback so crawls still produce a report without an LLM key

---

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router, Server Actions), TypeScript strict |
| UI | Tailwind CSS, Shadcn-style components, Lucide, Framer Motion |
| Data | Prisma ORM + SQLite (local) or PostgreSQL (Docker) |
| Auth | Auth.js / NextAuth v5 — credentials + Google |
| Crawler | Puppeteer (HTML, computed CSS, metadata, full-page JPEG) |
| AI | OpenAI structured outputs or Anthropic JSON, Zod schemas |
| Client state | TanStack Query (polls in-flight audits) |

---

## Quick start

**Requirements:** Node.js 20+ (22+ recommended). Chromium is downloaded with Puppeteer on `npm install`.

```bash
git clone https://github.com/<your-user>/aperture-cro.git
cd aperture-cro
cp .env.example .env
# Generate a signing secret:
#   openssl rand -base64 32
# Paste it into AUTH_SECRET in .env
# Optional: add OPENAI_API_KEY or ANTHROPIC_API_KEY

npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then sign in with the demo account above.

Paste a URL (for example `https://stripe.com`) on the dashboard and wait for the report.

### Optional LLM keys

| Variable | Effect |
| --- | --- |
| `OPENAI_API_KEY` | Preferred. Structured CRO JSON via `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | Used if OpenAI fails or is unset |
| Keys in **Settings** | Override server env for that user |

Without any key, Aperture still crawls the page and scores it with DOM/CSS heuristics (Fitts’s Law, heading structure, contrast, alt text, CTA size).

---

## Environment

Copy `.env.example` → `.env`. Never commit `.env`.

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_TRUST_HOST="true"
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# Optional
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
ANTHROPIC_MODEL="claude-sonnet-4-20250514"
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite file or PostgreSQL URL |
| `AUTH_SECRET` | Yes | Auth.js JWT signing secret |
| `AUTH_URL` / `NEXTAUTH_URL` | Local | Canonical app URL |
| `GOOGLE_CLIENT_ID` / `SECRET` | No | Enables “Continue with Google” |
| `OPENAI_API_KEY` | No | LLM audits |
| `ANTHROPIC_API_KEY` | No | LLM fallback |

---

## Pages

| Route | Description |
| --- | --- |
| `/` | Marketing landing |
| `/login` | Sign in (demo account works after seed) |
| `/register` | Create a workspace |
| `/dashboard` | Site grid, launch crawl, re-analyze, delete |
| `/dashboard/sites/[id]` | Full audit: score, metrics, code diffs, screenshot |
| `/dashboard/settings` | Profile, API keys, plan, danger zone |

---

## Audit pipeline

Entry point: [`src/lib/crawler/audit-engine.ts`](src/lib/crawler/audit-engine.ts)

1. **Scrape** — Puppeteer visits the URL (`networkidle2`, 1440×900), extracts headings, CTAs, fonts, colors, images, forms, meta tags, and a full-page JPEG saved under `public/uploads/screenshots/`.
2. **Analyze** — Serialized DOM/CSS context is passed to the LLM with a CRO system prompt (contrast, value proposition, CTA prominence, readability). Response is validated with Zod (`overallScore`, 3 summary points, 5–10 suggestions).
3. **Report** — Score category, metrics JSON, suggestion array, and overlay markers are stored on `AuditReport`.

Dashboard cards poll every 1.5s while status is `SCRAPING` | `ANALYZING` | `GENERATING`.

---

## Project structure

```
src/
  app/                    # App Router pages + Auth.js API
  components/
    ui/                   # Button, card, dialog, …
    auth/                 # Login / register forms
    dashboard/            # URL form, site grid, score badge
    audit/                # Gauge, metrics, suggestions, screenshot
    settings/             # Profile + API keys
  lib/
    actions/              # Server Actions (sites, auth, settings)
    crawler/              # Scraper, heuristics, LLM, audit engine
    auth.ts               # Auth.js config
    db.ts                 # Prisma client
prisma/
  schema.prisma           # User, Website, AuditReport
  seed.ts                 # demo@aperture.dev
docker-compose.yml        # Optional Postgres 16
```

---

## Database

Default provider is **SQLite** (`prisma/dev.db`) so `npm run dev` works without Docker.

```bash
npx prisma db push    # sync schema
npx prisma db seed    # create demo@aperture.dev / demo1234
npx prisma studio     # inspect tables
```

### PostgreSQL (optional)

1. Set `provider = "postgresql"` in `prisma/schema.prisma`.
2. Point `DATABASE_URL` at Postgres (or use `docker compose up -d`).
3. Run `npx prisma db push && npx prisma db seed`.

Models: **User** → **Website** → **AuditReport** (`overallScore`, `scoreCategory`, `summary`, `screenshotUrl`, `metrics` JSON, `suggestions` JSON).

---

## Scripts

| Script | Action |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Prisma generate + production build |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Seed demo user |
| `npm run db:studio` | Prisma Studio |
| `npm run lint` | ESLint |

---

## License

MIT
