export function now() {
  return Date.now();
}

export function isOocMessage(text) {
  return /^\s*\(?ooc\)?\b[:\s-]*/i.test(String(text || ''));
}

export function stripOocPrefix(text) {
  return String(text || '').replace(/^\s*\(?ooc\)?\b[:\s-]*/i, '').trim();
}

export function recentlyTyping(session, config) {
  if (!session.lastTypingMs) return false;
  return now() - session.lastTypingMs < config.typingIdleMs;
}

export function getSessionIdFromChannel(channel) {
  if (channel?.isThread?.()) return channel.id;
  return channel?.id;
}

export function getSessionIdFromMessage(msg) {
  return getSessionIdFromChannel(msg.channel);
}
