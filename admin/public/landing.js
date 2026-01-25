const landingStatus = document.getElementById('landing-status');
const landingActions = document.getElementById('landing-actions');
const adminLink = document.getElementById('admin-link');

async function loadAdminSession() {
  const response = await fetch('/api/me');
  const data = await response.json();
  return data.authenticated ? data.user : null;
}

async function loadPlayerSession() {
  const response = await fetch('/api/player/me');
  const data = await response.json();
  return data.authenticated ? data.user : null;
}

async function init() {
  const [adminUser, playerUser] = await Promise.all([loadAdminSession(), loadPlayerSession()]);

  if (adminUser) {
    landingStatus.textContent = `Signed in as ${adminUser.username}.`;
    if (adminLink) adminLink.style.display = 'block';
    return;
  }

  if (adminLink) adminLink.style.display = 'none';

  if (playerUser) {
    landingStatus.textContent = `Signed in as ${playerUser.username}.`;
  } else {
    landingStatus.textContent = 'Sign in to access the player portal.';
    const link = document.createElement('a');
    link.href = '/auth/discord';
    link.textContent = 'Sign in with Discord';
    landingActions.appendChild(link);
  }
}

init();
