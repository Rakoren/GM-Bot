const authStatus = document.getElementById('auth-status');
const authActions = document.getElementById('auth-actions');
const featuresList = document.getElementById('features-list');
const aiModeRow = document.getElementById('ai-mode-row');
const aiModePill = document.getElementById('ai-mode-pill');
const commandRegistryList = document.getElementById('command-registry-list');
const commandsList = document.getElementById('commands-list');
const saveBtn = document.getElementById('save-config');
const saveStatus = document.getElementById('save-status');
const datasetTarget = document.getElementById('dataset-target');
const datasetFile = document.getElementById('dataset-file');
const datasetUpload = document.getElementById('dataset-upload');
const datasetStatus = document.getElementById('datasets-status');
const homebrewFile = document.getElementById('homebrew-file');
const homebrewUpload = document.getElementById('homebrew-upload');
const homebrewStatus = document.getElementById('homebrew-status');
const pasteType = document.getElementById('paste-type');
const pasteText = document.getElementById('paste-text');
const pasteSubmit = document.getElementById('paste-submit');
const pasteStatus = document.getElementById('paste-status');

let currentConfig = null;
let manifest = [];
let roles = [];
let authenticated = false;
let guilds = [];
let selectedGuildId = null;

const featureLabels = [
  { key: 'enableSlashCommands', label: 'Slash commands', detail: 'Master switch for all slash commands.' },
  { key: 'enableMessageCommands', label: 'Message shortcuts', detail: 'Allow /save: and other text shortcuts.' },
  { key: 'enableAutoReplies', label: 'DM auto replies', detail: 'Model responses during gameplay.' },
  { key: 'enableTts', label: 'Text to speech', detail: 'Narration via OpenAI TTS.' },
  { key: 'enableVoice', label: 'Voice channel features', detail: 'Voice login and playback.' },
  { key: 'enableHomebrew', label: 'Homebrew tools', detail: 'Allow homebrew commands and uploads.' },
  { key: 'enableImports', label: 'Paste imports', detail: 'Allow paste-based imports.' },
  { key: 'enableDataReload', label: 'Data reload', detail: 'Allow CSV reload command.' },
  { key: 'enableUploads', label: 'File uploads', detail: 'Enable uploads in this UI.' },
];

const aiModeOptions = [
  {
    value: 'active',
    label: 'AI-Active',
    detail: 'AI drives narrative responses and narration.',
  },
  {
    value: 'passive',
    label: 'AI-Passive',
    detail: 'AI only responds to lookup or explicit requests.',
  },
];

const commandGroupLabels = [
  { key: 'core', label: 'Core', detail: 'Help and general safety commands.' },
  { key: 'setup', label: 'Setup', detail: 'Campaign and character setup flows.' },
  { key: 'play', label: 'Play', detail: 'Gameplay commands like mode/turn/roll.' },
  { key: 'bank', label: 'Bank', detail: 'Character bank and sheets.' },
  { key: 'npc', label: 'NPCs', detail: 'NPC create/list/sheet commands.' },
  { key: 'profile', label: 'Profile', detail: 'Profile cards and clearing.' },
  { key: 'save', label: 'Saves', detail: 'Save, load, reset, and clear campaigns.' },
  { key: 'voice', label: 'Voice', detail: 'Voice login and narration.' },
  { key: 'homebrew', label: 'Homebrew', detail: 'Homebrew additions.' },
];

function setAuthUI() {
  if (!authActions || !authStatus) return;
  authActions.innerHTML = '';
  if (!authenticated) {
    authStatus.textContent = 'Log in with Discord to unlock controls.';
    const link = document.createElement('a');
    link.href = '/auth/discord';
    link.textContent = 'Connect Discord';
    authActions.appendChild(link);
    setControlsDisabled(true);
    return;
  }
  const guildName = getSelectedGuildName();
  authStatus.textContent = guildName
    ? `Signed in as ${currentConfig?.userName || 'Guild Owner'} · Server: ${guildName}.`
    : `Signed in as ${currentConfig?.userName || 'Guild Owner'} · Select a server to manage.`;
  const logout = document.createElement('button');
  logout.textContent = 'Log out';
  logout.addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    location.reload();
  });
  authActions.appendChild(logout);
  renderGuildPicker();
  setControlsDisabled(false);
}

function getSelectedGuildName() {
  if (!selectedGuildId) return '';
  const match = guilds.find(guild => guild.id === selectedGuildId);
  return match ? match.name : '';
}

function renderGuildPicker() {
  if (!authActions) return;
  const existing = document.getElementById('guild-picker');
  if (existing) existing.remove();
  if (!guilds.length) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'guild-picker';
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
    const response = await fetch('/api/select-guild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: select.value }),
    });
    if (!response.ok) {
      authStatus.textContent = 'Server selection failed.';
      return;
    }
    selectedGuildId = select.value;
    location.reload();
  });
  wrapper.appendChild(applyBtn);

  select.addEventListener('change', () => {
    applyBtn.disabled = !select.value;
  });

  authActions.appendChild(wrapper);
}

function setControlsDisabled(disabled) {
  document.querySelectorAll('input, select, button').forEach(el => {
    if (el.closest('#auth-card')) return;
    el.disabled = disabled;
  });
}

function renderFeatures() {
  if (aiModePill) {
    const mode = (currentConfig?.aiMode || 'active').toLowerCase() === 'passive'
      ? 'AI-Passive'
      : 'AI-Active';
    aiModePill.textContent = mode;
    aiModePill.classList.toggle('status-pill--passive', mode === 'AI-Passive');
  }
  if (aiModeRow) {
    aiModeRow.innerHTML = '';
    const label = document.createElement('label');
    label.textContent = 'AI Agency';
    const select = document.createElement('select');
    select.id = 'ai-mode-select';
    aiModeOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      select.appendChild(opt);
    });
    select.value = currentConfig?.aiMode || 'active';
    const detail = document.createElement('small');
    detail.textContent = aiModeOptions.find(opt => opt.value === select.value)?.detail || '';
    select.addEventListener('change', () => {
      detail.textContent = aiModeOptions.find(opt => opt.value === select.value)?.detail || '';
    });
    const stack = document.createElement('div');
    stack.className = 'ai-mode-stack';
    stack.appendChild(label);
    stack.appendChild(select);
    stack.appendChild(detail);
    aiModeRow.appendChild(stack);
  }
  if (!featuresList) return;
  featuresList.innerHTML = '';
  featureLabels.forEach(feature => {
    const wrapper = document.createElement('label');
    wrapper.className = 'toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.feature = feature.key;
    checkbox.checked = currentConfig?.features?.[feature.key] !== false;
    const text = document.createElement('span');
    text.innerHTML = `${feature.label}<small>${feature.detail}</small>`;
    wrapper.appendChild(checkbox);
    wrapper.appendChild(text);
    featuresList.appendChild(wrapper);
  });
}

function renderCommandRegistry() {
  if (!commandRegistryList) return;
  commandRegistryList.innerHTML = '';
  const groups = currentConfig?.commandRegistry?.groups || {};
  commandGroupLabels.forEach(group => {
    const wrapper = document.createElement('label');
    wrapper.className = 'toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.commandGroup = group.key;
    checkbox.checked = groups[group.key] !== false;
    const text = document.createElement('span');
    text.innerHTML = `${group.label}<small>${group.detail}</small>`;
    wrapper.appendChild(checkbox);
    wrapper.appendChild(text);
    commandRegistryList.appendChild(wrapper);
  });
}

function renderCommands() {
  if (!commandsList) return;
  commandsList.innerHTML = '';
  manifest.forEach(cmd => {
    const wrapper = document.createElement('div');
    wrapper.className = 'command-card';
    const toggle = document.createElement('label');
    toggle.className = 'toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.command = cmd.name;
    checkbox.checked = currentConfig?.commands?.[cmd.name]?.enabled !== false;
    const text = document.createElement('span');
    text.innerHTML = `${cmd.name}<small>${cmd.description || ''}</small>`;
    toggle.appendChild(checkbox);
    toggle.appendChild(text);
    wrapper.appendChild(toggle);

    const accessRow = document.createElement('div');
    accessRow.className = 'access-row';

    const accessLabel = document.createElement('label');
    accessLabel.textContent = 'Access';

    const accessSelect = document.createElement('select');
    accessSelect.dataset.access = cmd.name;
    ['everyone', 'admin', 'roles'].forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value === 'everyone' ? 'Everyone' : value === 'admin' ? 'Admin only' : 'Specific roles';
      accessSelect.appendChild(option);
    });
    accessSelect.value = currentConfig?.commands?.[cmd.name]?.access || 'everyone';
    accessLabel.appendChild(accessSelect);
    accessRow.appendChild(accessLabel);

    const roleList = document.createElement('div');
    roleList.className = 'role-list';
    roleList.dataset.rolesFor = cmd.name;
    if (!roles.length) {
      const empty = document.createElement('div');
      empty.className = 'role-empty';
      empty.textContent = 'No roles loaded.';
      roleList.appendChild(empty);
    } else {
      const selected = new Set(currentConfig?.commands?.[cmd.name]?.roles || []);
      roles.forEach(role => {
        const roleWrap = document.createElement('label');
        roleWrap.className = 'role-chip';
        const roleCheck = document.createElement('input');
        roleCheck.type = 'checkbox';
        roleCheck.dataset.commandRole = cmd.name;
        roleCheck.value = role.id;
        roleCheck.checked = selected.has(role.id);
        const roleName = document.createElement('span');
        roleName.textContent = role.name;
        roleWrap.appendChild(roleCheck);
        roleWrap.appendChild(roleName);
        roleList.appendChild(roleWrap);
      });
    }

    accessSelect.addEventListener('change', () => {
      roleList.style.display = accessSelect.value === 'roles' ? 'grid' : 'none';
    });
    roleList.style.display = accessSelect.value === 'roles' ? 'grid' : 'none';

    wrapper.appendChild(accessRow);
    wrapper.appendChild(roleList);
    commandsList.appendChild(wrapper);
  });
}

function collectConfigFromUI() {
  const next = JSON.parse(JSON.stringify(currentConfig || {}));
  next.features = next.features || {};
  next.commands = next.commands || {};
  const aiModeSelect = document.getElementById('ai-mode-select');
  if (aiModeSelect) {
    next.aiMode = aiModeSelect.value || 'active';
  }
  next.commandRegistry = next.commandRegistry || { groups: {} };
  next.commandRegistry.groups = next.commandRegistry.groups || {};
  if (featuresList) {
    document.querySelectorAll('input[data-feature]').forEach(input => {
      next.features[input.dataset.feature] = input.checked;
    });
  }
  if (commandRegistryList) {
    document.querySelectorAll('input[data-command-group]').forEach(input => {
      next.commandRegistry.groups[input.dataset.commandGroup] = input.checked;
    });
  }
  if (commandsList) {
    manifest.forEach(cmd => {
      const enabled = document.querySelector(`input[data-command="${cmd.name}"]`)?.checked ?? true;
      const access =
        document.querySelector(`select[data-access="${cmd.name}"]`)?.value || 'everyone';
      const roleInputs = document.querySelectorAll(`input[data-command-role="${cmd.name}"]`);
      const roleIds = Array.from(roleInputs)
        .filter(input => input.checked)
        .map(input => input.value);
      next.commands[cmd.name] = { enabled, access, roles: roleIds };
    });
  }
  return next;
}

async function loadAuth() {
  const response = await fetch('/api/me');
  const data = await response.json();
  authenticated = !!data.authenticated;
  if (authenticated) {
    currentConfig = currentConfig || {};
    currentConfig.userName = `${data.user.username}`;
    await loadGuilds();
  }
  setAuthUI();
}

async function loadGuilds() {
  const response = await fetch('/api/guilds');
  if (!response.ok) {
    guilds = [];
    selectedGuildId = null;
    return;
  }
  const data = await response.json();
  guilds = data.guilds || [];
  selectedGuildId = data.selectedGuildId || null;
}

async function loadConfig() {
  const response = await fetch('/api/config');
  currentConfig = await response.json();
}

async function loadManifest() {
  const response = await fetch('/api/command-manifest');
  manifest = await response.json();
}

async function loadRoles() {
  const response = await fetch('/api/roles');
  if (!response.ok) {
    roles = [];
    return;
  }
  roles = await response.json();
}

async function loadDatasets() {
  if (!datasetTarget) return;
  const response = await fetch('/api/datasets');
  const data = await response.json();
  datasetTarget.innerHTML = '';
  data.files.forEach(file => {
    const opt = document.createElement('option');
    opt.value = file;
    opt.textContent = file;
    datasetTarget.appendChild(opt);
  });
}

async function init() {
  await loadAuth();
  if (!authenticated) return;
  await loadConfig();
  if (commandsList) {
    await loadManifest();
    await loadRoles();
  }
  renderFeatures();
  renderCommandRegistry();
  renderCommands();
  await loadDatasets();
}

if (saveBtn) saveBtn.addEventListener('click', async () => {
  if (!authenticated) return;
  saveStatus.textContent = 'Saving...';
  const payload = collectConfigFromUI();
  const response = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    saveStatus.textContent = 'Save failed.';
    return;
  }
  const data = await response.json();
  currentConfig = data.config;
  saveStatus.textContent = 'Saved. Bot will hot reload.';
  setTimeout(() => (saveStatus.textContent = ''), 2500);
});

if (datasetUpload) datasetUpload.addEventListener('click', async () => {
  if (!authenticated) return;
  if (!datasetFile.files.length) {
    datasetStatus.textContent = 'Choose a file first.';
    return;
  }
  datasetStatus.textContent = 'Uploading...';
  const form = new FormData();
  form.append('target', datasetTarget.value);
  form.append('file', datasetFile.files[0]);
  const response = await fetch('/api/uploads/dataset', { method: 'POST', body: form });
  if (!response.ok) {
    datasetStatus.textContent = 'Upload failed.';
    return;
  }
  datasetStatus.textContent = 'Upload complete. Run /data reload in Discord.';
  datasetFile.value = '';
});

if (homebrewUpload) homebrewUpload.addEventListener('click', async () => {
  if (!authenticated) return;
  if (!homebrewFile.files.length) {
    homebrewStatus.textContent = 'Choose a file first.';
    return;
  }
  homebrewStatus.textContent = 'Uploading...';
  const form = new FormData();
  form.append('file', homebrewFile.files[0]);
  const response = await fetch('/api/uploads/homebrew', { method: 'POST', body: form });
  if (!response.ok) {
    homebrewStatus.textContent = 'Upload failed.';
    return;
  }
  homebrewStatus.textContent = 'Homebrew stored. Import when ready.';
  homebrewFile.value = '';
});

init();

if (pasteSubmit) pasteSubmit.addEventListener('click', async () => {
  if (!authenticated) return;
  const text = pasteText.value.trim();
  if (!text) {
    pasteStatus.textContent = 'Paste text first.';
    return;
  }
  pasteStatus.textContent = 'Parsing...';
  const response = await fetch('/api/paste-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: pasteType.value, text }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const typeInfo = data.type ? ` (type: ${data.type})` : '';
    pasteStatus.textContent = `Import failed: ${data.error || 'unknown error'}${typeInfo}.`;
    return;
  }
  const data = await response.json();
  const added = data.added?.length || 0;
  const dupes = data.duplicates?.length || 0;
  const errors = data.errors?.length || 0;
  pasteStatus.textContent = `Added ${added}. Duplicates ${dupes}. Errors ${errors}.`;
  pasteText.value = '';
});
