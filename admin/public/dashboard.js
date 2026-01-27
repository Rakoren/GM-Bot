const authStatus = document.getElementById('auth-status');
const authActions = document.getElementById('auth-actions');
const combatStatus = document.getElementById('combat-status');
const combatSummary = document.getElementById('combat-summary');
const initiativeList = document.getElementById('initiative-list');
const lootList = document.getElementById('loot-list');
const updatedAt = document.getElementById('dashboard-updated');

let authenticated = false;

function setAuthUI(user) {
  if (!authActions || !authStatus) return;
  authActions.innerHTML = '';
  if (!user) {
    authStatus.textContent = 'Log in with Discord to view the dashboard.';
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

function renderCombat(snapshot) {
  if (!combatSummary || !combatStatus) return;
  if (!snapshot || !snapshot.active) {
    combatStatus.textContent = snapshot?.status ? `Status: ${snapshot.status}` : 'No active combat.';
    combatSummary.textContent = 'Start combat in Discord to populate this panel.';
    initiativeList.textContent = '';
    return;
  }
  const active = snapshot.activeCombatantId
    ? snapshot.initiativeOrder.find(c => c.id === snapshot.activeCombatantId)
    : null;
  combatStatus.textContent = `${snapshot.name} · Round ${snapshot.round} · Phase ${snapshot.phase || '—'}`;
  combatSummary.innerHTML = '';
  const list = document.createElement('ul');
  list.className = 'status-list';
  list.appendChild(makeStatItem('Status', snapshot.status));
  list.appendChild(makeStatItem('Turn', active ? active.name : '—'));
  list.appendChild(makeStatItem('Combatants', String(snapshot.roster?.length || 0)));
  combatSummary.appendChild(list);

  initiativeList.innerHTML = '';
  const order = snapshot.initiativeOrder || [];
  if (!order.length) {
    initiativeList.textContent = 'No initiative order yet.';
    return;
  }
  order.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'initiative-row';
    if (entry.id === snapshot.activeCombatantId) row.classList.add('active');
    const hp = Number.isFinite(entry.hp) ? `${entry.hp}/${entry.maxHp ?? '?'}` : '?';
    const ac = Number.isFinite(entry.ac) ? entry.ac : '?';
    const conditions = entry.conditions?.length ? entry.conditions.join(', ') : '—';
    row.innerHTML = `
      <div class="initiative-name">${entry.name}</div>
      <div class="initiative-meta">Init ${entry.initiative ?? '?'}</div>
      <div class="initiative-meta">HP ${hp}</div>
      <div class="initiative-meta">AC ${ac}</div>
      <div class="initiative-meta">Cond ${conditions}</div>
    `;
    initiativeList.appendChild(row);
  });
}

function renderLoot(payload) {
  if (!lootList) return;
  const items = Array.isArray(payload?.items) ? payload.items : [];
  lootList.innerHTML = '';
  if (!items.length) {
    lootList.textContent = 'No shared loot yet.';
    return;
  }
  const list = document.createElement('ul');
  list.className = 'status-list';
  items.forEach(item => {
    const label = typeof item === 'string' ? item : item?.name || 'Loot';
    list.appendChild(makeStatItem(label, item?.qty ? `x${item.qty}` : ''));
  });
  lootList.appendChild(list);
}

function makeStatItem(label, value) {
  const li = document.createElement('li');
  li.className = 'status-item';
  li.innerHTML = `<span>${label}</span><span>${value}</span>`;
  return li;
}

async function refresh() {
  if (!authenticated) return;
  const [combatResp, lootResp] = await Promise.all([
    fetch('/api/combat/state'),
    fetch('/api/loot'),
  ]);
  const combat = await combatResp.json().catch(() => ({}));
  const loot = await lootResp.json().catch(() => ({}));
  renderCombat(combat);
  renderLoot(loot);
  if (updatedAt) {
    const stamp = combat?.updatedAt || loot?.updatedAt || new Date().toISOString();
    updatedAt.textContent = `Last updated: ${new Date(stamp).toLocaleString()}`;
  }
}

async function init() {
  await loadAuth();
  if (!authenticated) return;
  await refresh();
  setInterval(refresh, 5000);
}

init();
