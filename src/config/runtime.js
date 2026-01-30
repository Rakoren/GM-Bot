import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..', '..');

export const CONFIG = {
  // REQUIRED: set these in .env
  token: process.env.DISCORD_TOKEN,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiTtsModel: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
  openaiTtsVoice: process.env.OPENAI_TTS_VOICE || 'alloy',
  adminBaseUrl: process.env.ADMIN_BASE_URL || null,
  guildId: process.env.GUILD_ID || null,
  characterCreatorChannelId: process.env.CHARACTER_CREATOR_CHANNEL_ID || null,
  avraeChannelId: process.env.AVRAE_CHANNEL_ID || null,
  avraeBotUserId: process.env.AVRAE_BOT_USER_ID || null,

  // Put your #game-table channel id here (the parent channel for play)
  gameTableChannelId: process.env.GAME_TABLE_CHANNEL_ID,

  // Optional: voice channel id used to treat users as "logged in"
  gameTableVoiceChannelId: process.env.GAME_TABLE_VOICE_CHANNEL_ID || null,

  // Optional: voice channel id for the "session VC" where DM narrates
  sessionVoiceChannelId: process.env.SESSION_VOICE_CHANNEL_ID || null,

  // How long (ms) since last text message to count as "ACTIVE"
  activeWindowMs: 10 * 60 * 1000, // 10 min

  // In FREE mode, wait this long after last message before DM responds (ms)
  freeModeIdleMs: 3500,
  // Wait this long after last typing indicator before DM responds (ms)
  typingIdleMs: 2500,

  // If true: only allow play in threads under #game-table (recommended).
  // If false: allow play directly in #game-table as well.
  threadsOnly: false,
};

export const DATASET_GROUP = process.env.DATASET_GROUP || 'D&D';

export const PROFILE_STORE_PATH = path.join(ROOT_DIR, 'profiles.json');
export const CAMPAIGN_SAVE_PATH = path.join(ROOT_DIR, 'campaign_save.json');
export const CAMPAIGN_DIR = path.join(ROOT_DIR, 'campaigns');
export const ADMIN_CONFIG_PATH = process.env.ADMIN_CONFIG_PATH
  ? path.resolve(process.env.ADMIN_CONFIG_PATH)
  : path.join(ROOT_DIR, 'admin_config.json');
export const COMBAT_STATE_PATH = path.join(ROOT_DIR, 'combat_state.json');
export const LOOT_STATE_PATH = path.join(ROOT_DIR, 'loot_state.json');
export const WEB_CHARACTER_BANK_PATH = path.join(ROOT_DIR, 'characters.json');
export const NPC_PERSONAS_PATH = path.join(ROOT_DIR, 'npc_personas.json');
