const fs = require('fs');

const text = fs.readFileSync('admin/public/wizard.js', 'utf8');
const lines = text.split(/\r?\n/);

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  if (line.includes('parseGoldCost') || line.includes('showMessage')) {
    console.log(i + 1, JSON.stringify(line));
  }
}
