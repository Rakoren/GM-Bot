# Deployment Checklist + Runbook (Mimic)

## Overview
This is a pragmatic checklist + runbook for deploying the Discord bot + Admin UI on a single Windows host with Cloudflare Tunnel.

---

## 0) Pre-flight
- [ ] Install Node.js (LTS recommended).
- [ ] Install dependencies: `npm install`
- [ ] Confirm `cloudflared` installed and authenticated.

---

## 1) Environment Configuration
Create `.env` with at least:

Required:
- `DISCORD_TOKEN`
- `OPENAI_API_KEY`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `ADMIN_SESSION_SECRET`

Recommended:
- `ADMIN_ROLE_IDS=1462177449088389181` (comma-separated IDs)
- `ADMIN_BASE_URL=https://your-domain`
- `ADMIN_COOKIE_SECURE=true`
- `GUILD_ID=<guild id>`
- `ADMIN_GUILD_ID=<guild id>` (if different)

Operational:
- `APP_DB_PATH=data/app.sqlite`
- `BACKUP_DIR=data/backups`
- `BACKUP_KEEP=10`
- `BACKUP_INTERVAL_MIN=1440`
- `LOG_DIR=logs`
- `LOG_LEVEL=info`
- `LOG_MAX_BYTES=5242880`
- `LOG_MAX_FILES=5`
- `BOT_HEALTH_HOST=127.0.0.1`
- `BOT_HEALTH_PORT=3099`

---

## 2) Start Services
In separate terminals:
- Bot: `npm run start`
- Admin UI: `npm run admin`

Expected:
- Admin: `Admin UI listening on ...`
- Bot: `Bot healthz on http://127.0.0.1:3099/healthz`

---

## 3) Health & Readiness
- Admin health: `http://localhost:3001/healthz`
- Admin ready: `http://localhost:3001/readyz`
- Admin version: `http://localhost:3001/version`
- Bot health: `http://127.0.0.1:3099/healthz`
- Bot version: `http://127.0.0.1:3099/version`

---

## 4) Cloudflare Tunnel
Example:
- `cloudflared tunnel run mimicgm`
- DNS routes should point to your configured tunnel.

Verify:
- `ADMIN_BASE_URL` matches public URL.
- `/version` loads in browser.

---

## 5) Admin Auth
- OAuth login works.
- `ADMIN_ROLE_IDS` role required to access `/admin.html`.
- If blocked: verify role ID and bot token permissions.

---

## 6) Data & Backups
- SQLite at `data/app.sqlite`
- Backups rotate in `data/backups`

---

## Runbook

### Restart Bot
1. Stop process.
2. `npm run start`

### Restart Admin UI
1. Stop process.
2. `npm run admin`

### Crash Recovery (Quick Steps)
1. Restart the failed service (bot or admin).
2. Check `logs/bot.log` or `logs/admin.log` for the last error.
3. Verify readiness:
   - Admin: `/readyz`
   - Bot: `/healthz`
4. If DB corruption is suspected:
   - Restore latest backup from `data/backups` to `data/app.sqlite`
   - Restart services

### Crash Recovery (Common Causes)
- Missing env vars: set `.env` and restart.
- Role check failures: verify `ADMIN_ROLE_IDS` + bot token.
- DB locked/corrupt: restore from backup.
- OAuth mismatch: verify redirect URLs + `ADMIN_BASE_URL`.

---

## Ops Scripts (Windows)
Located in `tools/ops/`:
- `start-bot.ps1`
- `start-admin.ps1`
- `restart-bot.ps1`
- `restart-admin.ps1`
- `health-check.ps1`
- `backup-verify.ps1`

Examples:
- `powershell -ExecutionPolicy Bypass -File tools/ops/health-check.ps1`
- `powershell -ExecutionPolicy Bypass -File tools/ops/backup-verify.ps1`
### Rotate Logs Manually
- Delete old logs in `logs/` if needed.

### DB Restore
1. Stop bot + admin.
2. Copy latest backup from `data/backups/*.sqlite` to `data/app.sqlite`.
3. Restart services.

---

## Data Migration Checklist (DB + Backups)

Pre-migration:
- [ ] Stop bot and admin UI.
- [ ] Confirm `data/app.sqlite` exists or is empty.
- [ ] Ensure legacy JSON files are present if you want to import:
  - `profiles.json`
  - `characters.json`
  - `npc_personas.json`
  - `trades.json`
  - `campaign_save.json`
  - `campaigns/*.json`
- [ ] Set `APP_DB_PATH` if non-default.
- [ ] Confirm backup settings: `BACKUP_DIR`, `BACKUP_KEEP`, `BACKUP_INTERVAL_MIN`.

Migration:
- [ ] Start admin UI (it triggers legacy import on boot).
- [ ] Check logs for "Admin DB" path and backup confirmation.
- [ ] Hit `/readyz` to confirm DB + rules registry OK.

Verification:
- [ ] Admin UI loads data (profiles/characters/NPCs).
- [ ] Bot can read character bank and profiles.
- [ ] Campaign save/load works.
- [ ] New backup file appears in `data/backups`.

Post-migration:
- [ ] Optionally archive legacy JSON files.
- [ ] Restart bot + admin for clean state.

### OAuth Issues
- Verify `DISCORD_CLIENT_ID/SECRET`.
- Check `ADMIN_BASE_URL` and OAuth redirect URLs.

### Access Issues
- Confirm user has role in `ADMIN_ROLE_IDS`.
- Verify `DISCORD_BOT_TOKEN` or `DISCORD_TOKEN` is set for role checks.

---

## Production Reminders
- Keep `ADMIN_SESSION_SECRET` set and private.
- Use HTTPS (Cloudflare Tunnel) with `ADMIN_COOKIE_SECURE=true`.
- Verify `/readyz` after each deploy.
