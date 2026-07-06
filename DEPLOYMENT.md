# Deployment Guide

## Goal
Deploy the frontend on Vercel and the backend on Railway, starting from a clean database.

## Backend: Railway

1. Create a new Railway project from `apps/api`.
2. Add a PostgreSQL database in Railway.
3. Set these environment variables in Railway:
   - `DATABASE_URL` = your Railway PostgreSQL connection string
   - `JWT_SECRET` = strong random secret
   - `JWT_REFRESH_SECRET` = strong random secret
   - `FRONTEND_URL` = your Vercel domain, for example `https://your-app.vercel.app`
   - `PORT` = Railway will inject this automatically; do not hardcode it
4. Build command:
   - `npm run build`
5. Start command:
   - `npm run start:prod`
6. After the first deploy, run Prisma against the Railway database:
   - `npx prisma db push`
   - `npx prisma generate`
7. Seed only if you want the default plans:
   - `npx prisma db seed`

## Frontend: Vercel

1. Create a new Vercel project from `apps/web`.
2. Set this environment variable in Vercel:
   - `NEXT_PUBLIC_API_URL` = your Railway backend URL, for example `https://your-railway-app.up.railway.app`
3. Build command:
   - `npm run build`
4. Output is handled by Next.js automatically.

## Local development

### Backend
1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Keep `DATABASE_URL=file:./dev.db` for local SQLite.
3. Run:
   - `npm run start:dev`

### Frontend
1. Copy `apps/web/.env.example` to `apps/web/.env.local`.
2. Keep `NEXT_PUBLIC_API_URL=http://localhost:3002` for local dev.
3. Run:
   - `npm run dev`

## Clean start

If you want the local backend blank again, the current SQLite database can be reset and the app will create a new manager account on registration.

## Notes

- Self-registration now creates a `MANAGER` account.
- Employees should not see the companies section.
- The backend CORS is restricted to the configured frontend URL plus local development origins.
