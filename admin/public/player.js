const playerAuthStatus = document.getElementById('player-auth-status');
const playerAuthActions = document.getElementById('player-auth-actions');
const profileStatus = document.getElementById('player-profile-status');
const profileBody = document.getElementById('player-profile-body');

let player = null;
let guilds = [];
let selectedGuildId = null;

function setAuthUI() {
  if (!playerAuthStatus || !playerAuthActions) return;
  playerAuthActions.innerHTML = '';
  if (!player) {
    playerAuthStatus.textContent = 'Log in with Discord to view your character.';
    const link = document.createElement('a');
    link.href = '/auth/discord/player';
    link.textContent = 'Connect Discord';
    playerAuthActions.appendChild(link);
    return;
  }
  const guildName = getSelectedGuildName();
  playerAuthStatus.textContent = guildName
    ? `Signed in as ${player.username} · Server: ${guildName}.`
    : `Signed in as ${player.username} · Select a server to continue.`;

  renderGuildPicker();

  const logout = document.createElement('button');
  logout.textContent = 'Log out';
  logout.addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    location.reload();
  });
  const wizardLink = document.createElement('a');
  wizardLink.href = '/wizard.html';
  wizardLink.textContent = 'Open Character Wizard';
  playerAuthActions.appendChild(wizardLink);
  playerAuthActions.appendChild(logout);
}

function getSelectedGuildName() {
  if (!selectedGuildId) return '';
  const match = guilds.find(guild => guild.id === selectedGuildId);
  return match ? match.name : '';
}

function renderGuildPicker() {
  if (!playerAuthActions) return;
  const existing = document.getElementById('player-guild-picker');
  if (existing) existing.remove();
  if (!guilds.length) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'player-guild-picker';
  wrapper.className = 'guild-picker';

  const label = document.createElement('label');
  label.textContent = 'Server';

  const select = document.createElement('select');
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a server';
  select.appendChild(placeholder);

  guilds.forEach(guild => {
    const option = document.createElement('option');
    option.value = guild.id;
    option.textContent = guild.name;
    select.appendChild(option);
  });

  select.value = selectedGuildId || '';
  label.appendChild(select);
  wrapper.appendChild(label);

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Use server';
  applyBtn.disabled = !select.value;
  applyBtn.addEventListener('click', async () => {
    if (!select.value) return;
    const response = await fetch('/api/player/select-guild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: select.value }),
    });
    if (!response.ok) {
      playerAuthStatus.textContent = 'Server selection failed.';
      return;
    }
    selectedGuildId = select.value;
    await loadProfile();
    setAuthUI();
  });
  wrapper.appendChild(applyBtn);

  select.addEventListener('change', () => {
    applyBtn.disabled = !select.value;
  });

  playerAuthActions.appendChild(wrapper);
}

async function loadAuth() {
  const response = await fetch('/api/player/me');
  const data = await response.json();
  player = data.authenticated ? data.user : null;
  if (player) {
    await loadGuilds();
  }
  setAuthUI();
}

async function loadGuilds() {
  const response = await fetch('/api/player/guilds');
  if (!response.ok) {
    guilds = [];
    selectedGuildId = null;
    return;
  }
  const data = await response.json();
  guilds = data.guilds || [];
  selectedGuildId = data.selectedGuildId || null;
}

function parseStats(raw) {
  const text = String(raw || '');
  const map = {};
  const regex = /\b(STR|DEX|CON|INT|WIS|CHA)\s*(\d+)/gi;
  let match;
  while ((match = regex.exec(text))) {
    map[match[1].toUpperCase()] = Number(match[2]);
  }
  return map;
}

function setFieldValue(field, value) {
  const el = profileBody?.querySelector(`[data-field="${field}"]`);
  if (el) el.textContent = value || '—';
}

function renderStats(statsMap) {
  const statsEl = document.getElementById('sheet-stats');
  if (!statsEl) return;
  const order = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  statsEl.innerHTML = '';
  order.forEach(key => {
    const score = statsMap?.[key];
    const block = document.createElement('div');
    block.className = 'stat-card';
    block.innerHTML = `
      <span class="stat-label">${key}</span>
      <span class="stat-score">${Number.isFinite(score) ? score : '—'}</span>
    `;
    statsEl.appendChild(block);
  });
}

function renderProfile(profile) {
  if (!profileBody || !profileStatus) return;
  if (!profile) {
    profileStatus.textContent = 'No profile found for this account.';
    return;
  }
  profileStatus.textContent = '';

  setFieldValue('name', profile.name);
  setFieldValue('class', profile.class);
  setFieldValue('level', profile.level);
  setFieldValue('species', profile.species || profile.lineage);
  setFieldValue('background', profile.background);
  setFieldValue('languages', profile.languages);
  setFieldValue('feat', profile.feat);
  setFieldValue('alignment', profile.alignment);
  setFieldValue('trait', profile.trait);
  setFieldValue('goal', profile.goal);
  setFieldValue('cantrips', profile.cantrips);
  setFieldValue('spells', profile.spells);
  setFieldValue('equipment', profile.equipment);

  renderStats(parseStats(profile.stats));
}

async function loadProfile() {
  if (!profileStatus) return;
  profileStatus.textContent = 'Loading profile...';
  const response = await fetch('/api/player/profile');
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (data.error === 'player-role-missing') {
      profileStatus.textContent = 'Player role not found in this server.';
      return;
    }
    if (data.error === 'not-player') {
      profileStatus.textContent = 'You do not have the Player role.';
      return;
    }
    if (data.error === 'guild-id-missing') {
      profileStatus.textContent = 'Select a server to continue.';
      return;
    }
    profileStatus.textContent = 'Failed to load profile.';
    return;
  }
  const data = await response.json();
  renderProfile(data.profile);
}

async function init() {
  await loadAuth();
  if (player && selectedGuildId) {
    await loadProfile();
  }
}

init();
