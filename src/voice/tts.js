import { Readable } from 'stream';
import {
  AudioPlayerStatus,
  StreamType,
  VoiceConnectionStatus,
  createAudioResource,
  entersState,
} from '@discordjs/voice';

export async function ttsSpeak({
  session,
  channel,
  text,
  openai,
  config,
  isFeatureEnabled,
  getLoginVoiceChannelId,
  getOrCreateVoiceConnection,
  getOrCreateAudioPlayer,
  voiceActive,
  voiceConnections,
  voicePlayers,
}) {
  if (!isFeatureEnabled('enableTts') || !isFeatureEnabled('enableVoice')) return;
  const loginVoiceChannelId = getLoginVoiceChannelId();
  if (!loginVoiceChannelId) return;
  const anyoneLoggedIn = [...voiceActive.values()].some(
    entry => entry.inVoice && entry.voiceChannelId === loginVoiceChannelId
  );
  if (!anyoneLoggedIn) return;

  const guild = channel?.guild;
  if (!guild) return;

  let connection = await getOrCreateVoiceConnection({
    guild,
    channelId: loginVoiceChannelId,
    voiceConnections,
  });
  if (!connection) return;
  let ready = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
      ready = true;
      break;
    } catch (err) {
      console.warn('Voice connection not ready for TTS:', err?.message || err);
      connection.destroy();
      voiceConnections.delete(guild.id);
      connection = await getOrCreateVoiceConnection({
        guild,
        channelId: loginVoiceChannelId,
        voiceConnections,
      });
      if (!connection) break;
    }
  }
  if (!ready) return;

  const player = getOrCreateAudioPlayer({
    guildId: guild.id,
    connection,
    voicePlayers,
  });
  connection.subscribe(player);

  session.dmSpeaking = true;
  try {
    if (player.state.status !== AudioPlayerStatus.Idle) {
      await entersState(player, AudioPlayerStatus.Idle, 10_000);
    }

    const speech = await openai.audio.speech.create({
      model: config.openaiTtsModel,
      voice: config.openaiTtsVoice,
      input: text,
      response_format: 'opus',
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    const resource = createAudioResource(Readable.from(buffer), {
      inputType: StreamType.OggOpus,
    });

    player.play(resource);
    await entersState(player, AudioPlayerStatus.Playing, 5_000);
    await entersState(player, AudioPlayerStatus.Idle, 60_000);
  } catch (err) {
    console.error('TTS speak failed:', err);
  } finally {
    session.dmSpeaking = false;
  }
}
