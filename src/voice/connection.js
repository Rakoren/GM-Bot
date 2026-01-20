import {
  VoiceConnectionStatus,
  createAudioPlayer,
  entersState,
  joinVoiceChannel,
} from '@discordjs/voice';

export async function getOrCreateVoiceConnection({ guild, channelId, voiceConnections }) {
  if (!guild || !channelId) return null;
  const existing = voiceConnections.get(guild.id);
  if (existing && existing.joinConfig?.channelId === channelId) return existing;
  if (existing) existing.destroy();

  const connection = joinVoiceChannel({
    channelId,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });
  voiceConnections.set(guild.id, connection);
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
  } catch (err) {
    console.warn('Voice connection not ready:', err?.message || err);
  }
  return connection;
}

export function getOrCreateAudioPlayer({ guildId, connection, voicePlayers }) {
  if (voicePlayers.has(guildId)) return voicePlayers.get(guildId);
  const player = createAudioPlayer();
  if (connection) connection.subscribe(player);
  voicePlayers.set(guildId, player);
  return player;
}
