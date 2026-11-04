# India Mornings — Single Vercel App (Frontend + Backend + Roles)

This repo is **end-to-end**:
- Public news website (Home, Category, Article)
- CMS UI (Journalist / Admin / Super Admin)
- Backend APIs (Auth, RBAC, Articles workflow, Review queue, Users, Taxonomy)
- PostgreSQL + Prisma (single Next.js app)

## Features
- Roles: `SUPER_ADMIN`, `ADMIN`, `JOURNALIST`
- Article workflow: `DRAFT → IN_REVIEW → APPROVED → PUBLISHED` (or `REJECTED`)
- Journalists can only see/manage their own drafts
- Admin/Super Admin can review + publish
- Simple taxonomy: categories + tags
- Cookies-based auth (HTTP-only)

## Local Setup

1) Copy env
```bash
cp .env.example .env
```

2) Set required env vars in `.env`:
- `DATABASE_URL` (Postgres)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `BOOTSTRAP_KEY`

3) Install + migrate
```bash
npm i
npx prisma migrate dev --name init
```

4) (Optional) seed SUPER_ADMIN
```bash
npm run seed
```

5) Run
```bash
npm run dev
```

## First-time Admin (Bootstrap page)
If you didn’t use seed, you can create the first Super Admin via:
- Visit: `/admin/bootstrap`
- Enter `BOOTSTRAP_KEY` + details
- Click "Run Bootstrap"

## Deploy to Vercel

- Create a Postgres DB (Vercel Postgres / Supabase / Neon)
- Set Vercel environment variables:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - `BOOTSTRAP_KEY`
  - (Optional) `NEXT_PUBLIC_BASE_URL` (usually leave empty on Vercel)

### Prisma migrations on Vercel
Vercel does **not** automatically run Prisma migrations for you.
Recommended options:
1) Run `npx prisma migrate deploy` in CI before deploying, OR
2) Run it manually after deployment (locally against the production DB), OR
3) Use Vercel/DB provider’s migration workflow.

---

If you want next: WYSIWYG editor, media uploads (S3), scheduled publishing, SEO auto-packages, and a proper “India Mornings” design system — tell me.
