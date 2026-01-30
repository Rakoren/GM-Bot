import { Events } from 'discord.js';

export function registerEvents({
  client,
  onInteractionCreate,
  onMessageCreate,
  onTypingStart,
  onVoiceStateUpdate,
  onReady,
}) {
  if (onInteractionCreate) {
    client.on(Events.InteractionCreate, onInteractionCreate);
  }
  if (onMessageCreate) {
    client.on(Events.MessageCreate, onMessageCreate);
  }
  if (onTypingStart) {
    client.on(Events.TypingStart, onTypingStart);
  }
  if (onVoiceStateUpdate) {
    client.on(Events.VoiceStateUpdate, onVoiceStateUpdate);
  }
  if (onReady) {
    client.once(Events.ClientReady, onReady);
  }
}
