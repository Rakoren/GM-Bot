import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'admin', 'public');
const SERVER_PATH = path.join(ROOT, 'admin', 'server.js');

function collectHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(name => name.endsWith('.html'))
    .map(name => path.join(dir, name));
}

function findInlineScripts(content) {
  const matches = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(content))) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    if (!/\bsrc=/.test(attrs) && body.trim().length > 0) {
      matches.push(match[0]);
    }
  }
  return matches;
}

function findStyleAttributes(content) {
  const re = /\sstyle\s*=\s*["'][^"']+["']/gi;
  const matches = content.match(re);
  return matches ? matches : [];
}

function checkCspHeader(source) {
  return source.includes('Content-Security-Policy');
}

function main() {
  const errors = [];
  const htmlFiles = collectHtmlFiles(PUBLIC_DIR);
  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const inlineScripts = findInlineScripts(content);
    if (inlineScripts.length) {
      errors.push(`${file}: inline <script> tag detected`);
    }
    const inlineStyles = findStyleAttributes(content);
    if (inlineStyles.length) {
      errors.push(`${file}: inline style attribute detected`);
    }
  }

  if (!fs.existsSync(SERVER_PATH)) {
    errors.push(`Missing server file: ${SERVER_PATH}`);
  } else {
    const serverSource = fs.readFileSync(SERVER_PATH, 'utf8');
    if (!checkCspHeader(serverSource)) {
      errors.push(`Missing CSP header in ${SERVER_PATH}`);
    }
  }

  if (errors.length) {
    for (const err of errors) console.error(err);
    process.exit(1);
  }

  console.log('CSP regression check OK.');
}

main();
