const playerAuthStatus = document.getElementById('player-auth-status');
const playerAuthActions = document.getElementById('player-auth-actions');
const profileStatus = document.getElementById('player-profile-status');
const profileBody = document.getElementById('player-profile-body');
const deleteModal = document.getElementById('delete-modal');
const deleteConfirmInput = document.getElementById('delete-confirm-input');
const deleteModalError = document.getElementById('delete-modal-error');
const deleteModalCancel = document.getElementById('delete-modal-cancel');
const deleteModalConfirm = document.getElementById('delete-modal-confirm');

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
    await loadCharacters();
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

function getCharacterArtUrl(entry) {
  if (!entry || typeof entry !== 'object') return '';
  return (
    entry.art ||
    entry.image ||
    entry.art_url ||
    entry.character_art ||
    entry.portrait ||
    entry.avatar ||
    ''
  );
}

function createCharacterCard(name, artUrl, id) {
  const card = document.createElement('a');
  card.className = 'character-card';
  if (id) {
    card.dataset.characterId = id;
    card.href = `/wizard.html?load=${encodeURIComponent(id)}`;
    card.addEventListener('click', event => {
      event.preventDefault();
      window.location.assign(card.href);
    });
  }

  const art = document.createElement('div');
  art.className = 'character-art';
  art.setAttribute('aria-hidden', 'true');

  const img = document.createElement('img');
  img.className = 'character-art-img';
  img.alt = '';

  const fallback = document.createElement('span');
  fallback.className = 'character-art-text';

  const initials = String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('');
  fallback.textContent = initials || '?';

  if (artUrl) {
    img.src = artUrl;
    img.style.display = 'block';
    fallback.style.display = 'none';
  } else {
    img.style.display = 'none';
    fallback.style.display = 'block';
  }

  art.appendChild(img);
  art.appendChild(fallback);

  const nameEl = document.createElement('div');
  nameEl.className = 'character-name';
  nameEl.textContent = name || 'Unknown';
  card.title = `Open ${name || 'character'}`;

  card.appendChild(art);
  card.appendChild(nameEl);

  const actions = document.createElement('div');
  actions.className = 'character-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete-button';
  deleteBtn.textContent = '🗑';
  deleteBtn.title = 'Delete character';
  console.log('attach delete', { id, name });
  deleteBtn.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openDeleteModal({ id, name: name || 'Unknown' });
  });

  actions.appendChild(deleteBtn);
  card.appendChild(actions);

  return card;
}

let deleteTarget = null;

function openDeleteModal(target) {
  if (!deleteModal || !deleteConfirmInput) return;
  console.log('open delete modal', target);
  deleteTarget = target;
  deleteConfirmInput.value = '';
  if (deleteModalError) deleteModalError.textContent = '';
  deleteModal.classList.add('active');
  deleteModal.setAttribute('aria-hidden', 'false');
  deleteConfirmInput.focus();
}

function closeDeleteModal() {
  if (!deleteModal) return;
  deleteModal.classList.remove('active');
  deleteModal.setAttribute('aria-hidden', 'true');
  deleteTarget = null;
}

async function confirmDelete() {
  if (!deleteTarget || !deleteConfirmInput) return;
  const typed = String(deleteConfirmInput.value || '').trim();
  if (typed !== deleteTarget.name) {
    if (deleteModalError) deleteModalError.textContent = 'Name does not match.';
    return;
  }
  if (deleteModalError) deleteModalError.textContent = '';
  try {
    const response = await fetch('/api/player/characters/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteTarget.id, name: deleteTarget.name }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || `HTTP ${response.status}`);
    }
    closeDeleteModal();
    await loadCharacters();
  } catch (err) {
    if (deleteModalError) deleteModalError.textContent = `Delete failed: ${err.message}`;
  }
}

if (deleteModalCancel) {
  deleteModalCancel.addEventListener('click', closeDeleteModal);
}
if (deleteModalConfirm) {
  deleteModalConfirm.addEventListener('click', confirmDelete);
}

async function loadCharacters() {
  if (!profileStatus || !profileBody) return;
  profileStatus.textContent = 'Loading characters...';
  profileBody.innerHTML = '';

  const response = await fetch('/api/player/characters/list');
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
    profileStatus.textContent = 'Failed to load characters.';
    return;
  }

  const data = await response.json();
  const characters = Array.isArray(data.characters) ? data.characters : [];
  if (!characters.length) {
    profileStatus.textContent = 'No saved characters yet.';
    return;
  }

  profileStatus.textContent = '';

  characters.forEach(entry => {
    const name = String(entry?.name || '').trim();
    const artUrl = getCharacterArtUrl(entry);
    const card = createCharacterCard(name || 'Unknown', artUrl, entry.id);
    profileBody.appendChild(card);
  });
}

async function init() {
  await loadAuth();
  if (player && selectedGuildId) {
    await loadCharacters();
  }
}

init();

