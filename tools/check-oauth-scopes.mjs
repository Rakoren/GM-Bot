import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const target = path.join(ROOT, 'admin', 'server.js');

const allowedScopes = new Set(['identify', 'guilds']);

function extractScopes(source, name) {
  const re = new RegExp(`${name}\\s*=\\s*'([^']*)'`);
  const match = source.match(re);
  if (!match) {
    return { name, scopes: [], found: false };
  }
  const scopes = match[1]
    .split(/\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  return { name, scopes, found: true };
}

function findScopeAssignments(source) {
  return source
    .split('\n')
    .map((line, idx) => ({ line, idx: idx + 1 }))
    .filter(entry => entry.line.includes('scope:'));
}

function main() {
  if (!fs.existsSync(target)) {
    console.error(`Missing file: ${target}`);
    process.exit(1);
  }

  const source = fs.readFileSync(target, 'utf8');
  const admin = extractScopes(source, 'DISCORD_OAUTH_SCOPES_ADMIN');
  const player = extractScopes(source, 'DISCORD_OAUTH_SCOPES_PLAYER');

  const missing = [admin, player].filter(entry => !entry.found);
  if (missing.length) {
    console.error(
      `Missing scope constants: ${missing.map(entry => entry.name).join(', ')}`
    );
    process.exit(1);
  }

  const invalid = [];
  for (const entry of [admin, player]) {
    for (const scope of entry.scopes) {
      if (!allowedScopes.has(scope)) {
        invalid.push({ name: entry.name, scope });
      }
    }
  }

  if (invalid.length) {
    for (const entry of invalid) {
      console.error(`Invalid scope in ${entry.name}: ${entry.scope}`);
    }
    process.exit(1);
  }

  const scopeLines = findScopeAssignments(source);
  const nonConstant = scopeLines.filter(entry => !entry.line.includes('DISCORD_OAUTH_SCOPES_'));
  if (nonConstant.length) {
    for (const entry of nonConstant) {
      console.error(`Direct scope assignment at ${target}:${entry.idx}`);
    }
    process.exit(1);
  }

  const adminRefs = (source.match(/DISCORD_OAUTH_SCOPES_ADMIN/g) || []).length;
  const playerRefs = (source.match(/DISCORD_OAUTH_SCOPES_PLAYER/g) || []).length;
  if (adminRefs < 1) {
    console.error('DISCORD_OAUTH_SCOPES_ADMIN is not used in OAuth flows.');
    process.exit(1);
  }
  if (playerRefs < 1) {
    console.error('DISCORD_OAUTH_SCOPES_PLAYER is not used in OAuth flows.');
    process.exit(1);
  }

  console.log('OAuth scope audit OK.');
}

main();
