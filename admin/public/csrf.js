function getCookieValue(name) {
  const parts = document.cookie.split(';').map(part => part.trim());
  for (const part of parts) {
    if (!part) continue;
    const [key, ...rest] = part.split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const options = init || {};
  const method = String(options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const headers = new Headers(options.headers || {});
    const token = getCookieValue('csrf_token');
    if (token) headers.set('x-csrf-token', token);
    options.headers = headers;
  }
  return originalFetch(input, options);
};
