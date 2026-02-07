const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'admin', 'public');
const files = fs.readdirSync(dir).filter(name => name.endsWith('.html'));

for (const file of files) {
  const full = path.join(dir, file);
  let html = fs.readFileSync(full, 'utf8');
  const scriptTag = '    <script src="/csrf.js"></script>\n';
  if (!html.includes('csrf.js')) {
    if (html.includes('</body>')) {
      html = html.replace(/\s*<\/body>/i, `\n${scriptTag}</body>`);
    } else {
      html += `\n${scriptTag}`;
    }
  }
  const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  if (scripts.length > 1) {
    const csrfScript = scripts.find(s => s.includes('csrf.js'));
    if (csrfScript) {
      const withoutCsrf = scripts.filter(s => s !== csrfScript);
      html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/\s*<\/body>/i, '\n</body>');
      const rebuilt = [csrfScript, ...withoutCsrf].join('\n');
      html = html.replace(/<\/body>/i, `\n${rebuilt}\n</body>`);
    }
  }
  fs.writeFileSync(full, html, 'utf8');
}

console.log(`Injected csrf.js into ${files.length} file(s).`);
