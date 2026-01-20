export async function callDmModel({
  openai,
  model,
  systemPrompt,
  rosterBlock,
  mode,
  history,
  playerBatch,
  getCharacterName,
}) {
  const transcript = playerBatch
    .map(m => `${m.authorName} (${getCharacterName(m.userId, m.authorName)}):\n${m.content}`)
    .join('\n\n');

  const userContent = `
${rosterBlock}

MODE: ${mode.toUpperCase()}

PLAYER INPUT:
${transcript}
`.trim();

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: rosterBlock },
    ...history,
    { role: 'user', content: userContent },
  ];

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_completion_tokens: 450,
  });

  const text = response.choices?.[0]?.message?.content?.trim();
  return { text: text || 'The scene continues.', nextPlayerId: null, debugUserContent: userContent };
}
