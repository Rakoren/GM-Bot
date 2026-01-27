const authStatus = document.getElementById('auth-status');
const authActions = document.getElementById('auth-actions');
const npcList = document.getElementById('npc-list');
const npcFilter = document.getElementById('npc-filter');
const npcStatus = document.getElementById('npc-status');

let authenticated = false;
let npcs = [];

function setAuthUI(user) {
  if (!authActions || !authStatus) return;
  authActions.innerHTML = '';
  if (!user) {
    authStatus.textContent = 'Log in with Discord to view NPCs.';
    const link = document.createElement('a');
    link.href = '/auth/discord';
    link.textContent = 'Connect Discord';
    authActions.appendChild(link);
    return;
  }
  authStatus.textContent = `Signed in as ${user.username}.`;
  const logout = document.createElement('button');
  logout.textContent = 'Log out';
  logout.addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    location.reload();
  });
  authActions.appendChild(logout);
}

async function loadAuth() {
  const response = await fetch('/api/me');
  const data = await response.json().catch(() => ({}));
  authenticated = !!data.authenticated;
  setAuthUI(data.user || null);
}

function renderList() {
  if (!npcList) return;
  npcList.innerHTML = '';
  const query = (npcFilter?.value || '').trim().toLowerCase();
  const filtered = npcs.filter(npc => {
    if (!query) return true;
    return (
      String(npc.name || '').toLowerCase().includes(query) ||
      String(npc.role || '').toLowerCase().includes(query)
    );
  });
  if (!filtered.length) {
    npcList.textContent = 'No NPCs found.';
    return;
  }
  filtered.forEach(npc => {
    const card = document.createElement('div');
    card.className = 'npc-card';
    const title = document.createElement('div');
    title.className = 'npc-title';
    title.textContent = `${npc.name || 'Unknown'}${npc.role ? ` · ${npc.role}` : ''}`;
    const meta = document.createElement('div');
    meta.className = 'npc-meta';
    meta.innerHTML = [
      npc.personality ? `<strong>Personality:</strong> ${npc.personality}` : '',
      npc.motive ? `<strong>Motive:</strong> ${npc.motive}` : '',
      npc.voice ? `<strong>Voice:</strong> ${npc.voice}` : '',
      npc.quirk ? `<strong>Quirk:</strong> ${npc.quirk}` : '',
      npc.appearance ? `<strong>Appearance:</strong> ${npc.appearance}` : '',
    ].filter(Boolean).join('<br>');
    card.appendChild(title);
    if (meta.innerHTML) card.appendChild(meta);
    npcList.appendChild(card);
  });
}

async function loadNpcs() {
  if (!authenticated) return;
  const response = await fetch('/api/npcs');
  if (!response.ok) {
    npcStatus.textContent = 'Failed to load NPCs.';
    return;
  }
  const data = await response.json().catch(() => ({}));
  npcs = Array.isArray(data.npcs) ? data.npcs : [];
  npcStatus.textContent = npcs.length ? `Loaded ${npcs.length} NPCs.` : 'No NPCs saved yet.';
  renderList();
}

async function init() {
  await loadAuth();
  if (!authenticated) return;
  await loadNpcs();
  if (npcFilter) {
    npcFilter.addEventListener('input', renderList);
  }
}

init();
