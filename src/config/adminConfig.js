import fs from 'fs';
import { PermissionsBitField } from 'discord.js';

export const DEFAULT_FEATURE_FLAGS = {
  enableSlashCommands: true,
  enableMessageCommands: true,
  enableAutoReplies: true,
  enableTts: true,
  enableVoice: true,
  enableHomebrew: true,
  enableImports: true,
  enableDataReload: true,
  enableUploads: true,
};
export const DEFAULT_AI_MODE = 'active';

const COMMAND_GROUP_BY_NAME = {
  check: 'core',
  percent: 'core',
  rolltable: 'core',
  status: 'core',
  setup: 'setup',
  mode: 'play',
  setchar: 'play',
  turn: 'play',
  roll: 'play',
  combat: 'play',
  lookup: 'play',
  xp: 'play',
  'campaign-setup': 'setup',
  'character-setup': 'setup',
  start: 'setup',
  test: 'setup',
  bank: 'bank',
  npc: 'npc',
  sheet: 'bank',
  profile: 'profile',
  'profile-clear': 'profile',
  save: 'save',
  load: 'save',
  delete: 'save',
  reset: 'save',
  clear: 'save',
  'log-in': 'voice',
  'log-out': 'voice',
  say: 'voice',
  homebrew: 'homebrew',
  help: 'core',
};

let adminConfig = {
  version: 1,
  aiMode: DEFAULT_AI_MODE,
  features: { ...DEFAULT_FEATURE_FLAGS },
  commands: {},
  channels: {
    gameTableChannelId: null,
    characterCreatorChannelId: null,
    gameTableVoiceChannelId: null,
    sessionVoiceChannelId: null,
    avraeChannelId: null,
  },
};

let configRef = null;
let adminConfigPath = null;
let commandListRef = [];

export function getAdminConfig() {
  return adminConfig;
}

export function buildDefaultAdminConfig(commandList = []) {
  const commands = {};
  for (const name of commandList) {
    commands[name] = { enabled: true, access: 'everyone', roles: [] };
  }
  if (commands.setup) {
    commands.setup.access = 'admin';
  }
  return {
    version: 1,
    aiMode: DEFAULT_AI_MODE,
    features: { ...DEFAULT_FEATURE_FLAGS },
    commands,
    channels: {
      gameTableChannelId: null,
      characterCreatorChannelId: null,
      gameTableVoiceChannelId: null,
      sessionVoiceChannelId: null,
      avraeChannelId: null,
    },
    commandRegistry: {
      groups: {
        core: true,
        setup: true,
        play: true,
        bank: true,
        npc: true,
        profile: true,
        save: true,
        voice: true,
        homebrew: true,
      },
    },
    commandPoliciesByGuild: {},
  };
}

export function normalizeAdminConfig(raw, commandList = []) {
  const base = buildDefaultAdminConfig(commandList);
  const config = typeof raw === 'object' && raw ? raw : {};
  const features = typeof config.features === 'object' && config.features ? config.features : {};
  const commands = typeof config.commands === 'object' && config.commands ? config.commands : {};
  const channels = typeof config.channels === 'object' && config.channels ? config.channels : {};
  const commandRegistry =
    typeof config.commandRegistry === 'object' && config.commandRegistry
      ? config.commandRegistry
      : null;
  const commandPoliciesByGuild =
    typeof config.commandPoliciesByGuild === 'object' && config.commandPoliciesByGuild
      ? config.commandPoliciesByGuild
      : null;
  const aiMode =
    typeof config.aiMode === 'string' ? config.aiMode.trim().toLowerCase() : '';
  if (aiMode === 'active' || aiMode === 'passive') {
    base.aiMode = aiMode;
  }

  base.features = { ...base.features };
  for (const [key, value] of Object.entries(features)) {
    if (typeof value === 'boolean') base.features[key] = value;
  }

  for (const name of commandList) {
    const entry = commands[name];
    if (typeof entry === 'boolean') {
      base.commands[name].enabled = entry;
      continue;
    }
    if (typeof entry === 'object' && entry) {
      if (typeof entry.enabled === 'boolean') base.commands[name].enabled = entry.enabled;
      if (typeof entry.access === 'string') base.commands[name].access = entry.access;
      if (Array.isArray(entry.roles)) {
        base.commands[name].roles = entry.roles.map(id => String(id)).filter(Boolean);
      }
    }
  }

  if (commandRegistry && typeof commandRegistry.groups === 'object') {
    base.commandRegistry = {
      groups: { ...base.commandRegistry.groups, ...commandRegistry.groups },
    };
  }

  for (const [key, value] of Object.entries(base.channels)) {
    const incoming = channels[key];
    if (typeof incoming === 'string' && incoming.trim()) {
      base.channels[key] = incoming.trim();
    }
  }

  if (commandPoliciesByGuild) {
    base.commandPoliciesByGuild = { ...commandPoliciesByGuild };
  }

  return base;
}

export function applyChannelConfigFromAdmin() {
  const channels = adminConfig?.channels || {};
  if (!configRef) return;
  if (!configRef.gameTableChannelId && channels.gameTableChannelId) {
    configRef.gameTableChannelId = channels.gameTableChannelId;
  }
  if (!configRef.characterCreatorChannelId && channels.characterCreatorChannelId) {
    configRef.characterCreatorChannelId = channels.characterCreatorChannelId;
  }
  if (!configRef.gameTableVoiceChannelId && channels.gameTableVoiceChannelId) {
    configRef.gameTableVoiceChannelId = channels.gameTableVoiceChannelId;
  }
  if (!configRef.sessionVoiceChannelId && channels.sessionVoiceChannelId) {
    configRef.sessionVoiceChannelId = channels.sessionVoiceChannelId;
  }
  if (!configRef.avraeChannelId && channels.avraeChannelId) {
    configRef.avraeChannelId = channels.avraeChannelId;
  }
}

export function updateChannelConfig(nextChannels = {}) {
  if (!adminConfig?.channels) {
    adminConfig = { ...(adminConfig || {}), channels: { ...buildDefaultAdminConfig().channels } };
  }
  adminConfig.channels = { ...adminConfig.channels, ...nextChannels };
  saveAdminConfig(adminConfig);
  if (configRef) {
    if (typeof nextChannels.gameTableChannelId === 'string' && nextChannels.gameTableChannelId) {
      configRef.gameTableChannelId = nextChannels.gameTableChannelId;
    }
    if (typeof nextChannels.characterCreatorChannelId === 'string' && nextChannels.characterCreatorChannelId) {
      configRef.characterCreatorChannelId = nextChannels.characterCreatorChannelId;
    }
    if (typeof nextChannels.gameTableVoiceChannelId === 'string' && nextChannels.gameTableVoiceChannelId) {
      configRef.gameTableVoiceChannelId = nextChannels.gameTableVoiceChannelId;
    }
    if (typeof nextChannels.sessionVoiceChannelId === 'string' && nextChannels.sessionVoiceChannelId) {
      configRef.sessionVoiceChannelId = nextChannels.sessionVoiceChannelId;
    }
    if (typeof nextChannels.avraeChannelId === 'string' && nextChannels.avraeChannelId) {
      configRef.avraeChannelId = nextChannels.avraeChannelId;
    }
  }
  applyChannelConfigFromAdmin();
}

export function loadAdminConfig(commandList = []) {
  if (!adminConfigPath) {
    return buildDefaultAdminConfig(commandList);
  }
  if (!fs.existsSync(adminConfigPath)) {
    return buildDefaultAdminConfig(commandList);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(adminConfigPath, 'utf8'));
    return normalizeAdminConfig(raw, commandList);
  } catch (err) {
    console.warn('Failed to load admin_config.json, using defaults:', err?.message || err);
    return buildDefaultAdminConfig(commandList);
  }
}

export function saveAdminConfig(config) {
  if (!adminConfigPath) return;
  try {
    fs.writeFileSync(adminConfigPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to write admin_config.json:', err?.message || err);
  }
}

export function initAdminConfig({ config, adminConfigPath: pathValue, commandList = [] }) {
  configRef = config || null;
  adminConfigPath = pathValue || null;
  commandListRef = Array.isArray(commandList) ? commandList : [];
  adminConfig = loadAdminConfig(commandListRef);
  saveAdminConfig(adminConfig);
  applyChannelConfigFromAdmin();
  if (!adminConfigPath) return;
  fs.watchFile(adminConfigPath, { interval: 1000 }, () => {
    adminConfig = loadAdminConfig(commandListRef);
    applyChannelConfigFromAdmin();
    console.log('Admin config reloaded.');
  });
}

export function isFeatureEnabled(key) {
  return adminConfig?.features?.[key] !== false;
}

export function getAiMode() {
  return adminConfig?.aiMode === 'passive' ? 'passive' : 'active';
}

export function isAiActive() {
  return getAiMode() === 'active';
}

export function isCommandEnabled(name) {
  return (
    isCommandGroupEnabled(name) &&
    isFeatureEnabled('enableSlashCommands') &&
    adminConfig?.commands?.[name]?.enabled !== false
  );
}

export function isMessageCommandEnabled(name) {
  return (
    isCommandGroupEnabled(name) &&
    isFeatureEnabled('enableMessageCommands') &&
    adminConfig?.commands?.[name]?.enabled !== false
  );
}

export function isCommandGroupEnabled(name) {
  const group = COMMAND_GROUP_BY_NAME[name] || 'core';
  return adminConfig?.commandRegistry?.groups?.[group] !== false;
}

export function getCommandAccess(name) {
  return adminConfig?.commands?.[name]?.access || 'everyone';
}

export function getCommandRoles(name) {
  return adminConfig?.commands?.[name]?.roles || [];
}

export function hasAdminAccess(member, userId, guild) {
  if (!guild) return false;
  if (guild.ownerId && userId === guild.ownerId) return true;
  return !!member?.permissions?.has(PermissionsBitField.Flags.Administrator);
}

export function hasRoleAccess(member, roleIds) {
  if (!member || !Array.isArray(roleIds) || roleIds.length === 0) return false;
  return roleIds.some(roleId => member.roles?.cache?.has(roleId));
}

export function isCommandAllowedForMember({ name, member, userId, guild }) {
  if (name === 'homebrew') return true;
  const access = getCommandAccess(name);
  if (access === 'admin') return hasAdminAccess(member, userId, guild);
  if (access === 'roles') return hasRoleAccess(member, getCommandRoles(name));
  return true;
}
