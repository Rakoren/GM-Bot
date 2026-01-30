const fs = require('fs');

const text = fs.readFileSync('admin/public/wizard.js', 'utf8');
console.log(text.includes('Spent ${'));
