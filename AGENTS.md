# AGENTS.md
> Canonical data architecture and shard rules are defined in `docs/DESIGN.md`.
> All agents must follow it.
> Use javascript

## Scope Outline

### 1. The AI Game Master (The Engine)
The AI acts as the creative brain of the system, capable of switching between a primary narrator and a background assistant.

- Multimodal Narration: Text + Text-to-Speech (TTS) voice acting for NPCs and atmospheric descriptions in Discord voice channels.
- AI should interact with the combat engine when player are fights

### 2. The Web UI (The Command Center)
The Web UI is the Source of Truth and the primary visual interface.

The Player Experience
- Character Creator Wizard: Guided creation with automated D&D math and exportable interactive sheet.
- Visual Dashboard: Central hub for map, combat initiative, and shared party loot.
- Live Rules Compendium: Searchable spells, feats, and mechanics.

The Admin/DM Suite
- The "AI Toggle": Master switch for AI agency.
  - AI-Active: AI drives the narrative.
  - AI-Passive: AI is a co-pilot (lookup/on-demand generation only).
- Guild Configuration: Permissions, channel routing, prefix management per Discord server.

### 3. Discord Integration (The Social Layer)
Discord is the table where play occurs.

- Dual-Mode Functionality:
  - Narrator Mode: Rich-embed descriptions, images, and dialogue in chat.
  - Assistant Mode: Crunchy mechanics like `/lookup Ancient Red Dragon` or `/generate random_loot`.
- Information Retrieval: Fast access to Web UI data (monster stats, magic items, NPC dossiers).

### 4. The Combat Engine (The Mechanics)
The rules-enforcement layer for D&D 5e (or chosen system).

- State Machine Tracking: Initiative Roll → Turn Start → Action Phase → Bonus/Reaction → Turn End.
- The AI Command Bridge: Prompts AI for tactical actions when AI is On.
- The DM Override: Manual adjustments to HP, conditions, or rolls.
- Automated Stat Management: Real-time AC, Spell Save DCs, and health bars synced between Web UI and Discord.

## Working Agreements
- Prefer read-first: inspect relevant files before editing.
- Keep changes minimal and scoped to the request.
- Avoid destructive git commands unless explicitly requested.
- Do not modify secrets; use `.env` for local configuration.
- Document any new env vars or commands here.

## Repo Map (high level)
- `index.js`: Discord bot entry point.
- `admin/server.js`: Admin web server + OAuth + dataset endpoints.
- `src/`: bot logic (commands, combat engine, session state, data store, voice).
- `admin/public/`: admin UI (HTML/JS/CSS).
- `data_sets/`: CSV/JSON content used by the bot and wizard.
- `docs/`: PHB markdown + chapter index reference materials.

## Setup
- Install deps: `npm install`
- Run bot: `npm run start`
- Run admin UI: `npm run admin`

## Environment
Expected in `.env` (typical):
- `DISCORD_TOKEN`
- `OPENAI_API_KEY`
- `GUILD_ID` (optional)
- `ADMIN_BASE_URL` (optional)
- `ADMIN_ROLE_IDS` (recommended, comma-separated role IDs for admin UI access)
- `APP_DB_PATH` (optional, default `data/app.sqlite`)
- `ADMIN_SESSION_SECRET` (recommended)
- `ADMIN_COOKIE_SECURE` (optional, set `true` for HTTPS)
- `ADMIN_SESSION_STORE` (optional: `memory` or `file`)
- `ADMIN_SESSION_FILE` (optional: path for file session store)

## Testing
- No automated tests configured yet.
- If you add tests, list the command(s) here.

## Security Notes
- Admin server is authenticated via Discord OAuth; keep `ADMIN_SESSION_SECRET` set.
- Treat upload/paste endpoints as admin-only surfaces.

## When Making Changes
- Note any migration steps in this file.
- If touching `admin/server.js`, consider auth/session safety and file path handling.
