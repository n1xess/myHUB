# Realm Riches

Vite + React frontend with Vercel Functions API and Postgres storage.

## Local Setup

```powershell
cd C:\Users\yura\Desktop\site-arb-skins-ver\123\realm-riches-main
npm install
```

Create `.env` from `.env.example` and set a Postgres connection string:

```env
DATABASE_URL=postgres://...
VITE_API_BASE_URL=
```

Run the same shape as Vercel locally:

```powershell
npm run dev
```

Open the URL printed by Vercel CLI, usually `http://localhost:3000`.

## Deploy To Vercel

1. Push this project to GitHub.
2. In Vercel, import the repo.
3. Add a Postgres database from Vercel Marketplace: Neon or Supabase are good fits.
4. Make sure Vercel has `DATABASE_URL` or `POSTGRES_URL` in Environment Variables.
5. Deploy.

Build settings are already in `vercel.json`:

- framework: `vite`
- install: `npm ci`
- build: `npm run build`
- output: `dist`
- API: `api/index.ts`

The API auto-creates the required tables on first request. The SQL is also available in `database/schema.sql` if you want to run it manually.

## API

- `GET /api/health`
- `GET /api/trades`
- `POST /api/trades`
- `PUT /api/trades/:id`
- `DELETE /api/trades/:id`
- `GET /api/portfolio`
- `POST /api/portfolio`
- `PUT /api/portfolio/:id`
- `DELETE /api/portfolio/:id`
- `GET /api/circles`
- `POST /api/circles`
- `PUT /api/circles/:id`
- `DELETE /api/circles/:id`
- `GET /api/screener/scan`
- `GET /api/screener/config`

## Notes

The old local SQLite backend is no longer used by the deployed app. Vercel Functions need persistent external storage, so runtime data lives in Postgres.
