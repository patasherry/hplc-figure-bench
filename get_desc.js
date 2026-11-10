const fs = require('fs');
const desc = fs.readFileSync('pr_description.md', 'utf8');
console.log(JSON.stringify(desc));
