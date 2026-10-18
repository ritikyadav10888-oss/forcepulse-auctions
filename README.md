# Force Pulse — Player Auctions

Next.js app with its own Node server: API, database (Prisma), and Socket.IO so every bid shows up live on every screen and device.

## Run it

```bash
npm install
cp .env.example .env      # then set ADMIN_EMAIL / ADMIN_PASSWORD
npx prisma db push        # creates the database
npm run dev               # http://localhost:3000
```

Production: `npm run build` then `npm start`. To put it online on any Linux server (Docker or not), follow [deploy/README.md](deploy/README.md).

The Force Pulse admin account is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on first start. Organisers sign up themselves or are created by the admin.

Forgot password emails a reset link through the SMTP settings in `.env` (`SMTP_*`, `MAIL_FROM`, `APP_URL`, `AUTH_SECRET`). Until SMTP is set, the link is printed in the server console.

## Where things are

| | |
|---|---|
| `server.js` | Starts Next.js + Socket.IO |
| `app/api/*` | Sign-in, state, saving changes, player registration, image uploads |
| `lib/server/store.js` | Who may see and change what; pushes changes to open screens |
| `prisma/schema.prisma` | Database tables |
| `src/` | The app (React) |
| `deploy/`, `Dockerfile`, `docker-compose.yml` | Server setup (any Linux, Docker or not), updates and backups |

## Database

Local development uses SQLite (`prisma/dev.db`). For PostgreSQL, set `provider = "postgresql"` in `prisma/schema.prisma`, point `DATABASE_URL` at it and run `npx prisma db push`.

Uploaded photos and logos are stored in `uploads/`; back it up with the database.
