export function validateEnv({ appName, required = [], optional = [] } = {}) {
  const missing = required.filter(key => !process.env[key] || String(process.env[key]).trim() === '');
  if (missing.length) {
    const lines = [
      `${appName || 'App'} startup blocked: missing required env vars.`,
      `Missing: ${missing.join(', ')}`,
    ];
    throw new Error(lines.join(' '));
  }
  const optionalMissing = optional.filter(key => !process.env[key] || String(process.env[key]).trim() === '');
  return { missing, optionalMissing };
}
