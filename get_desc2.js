const fs = require('fs');
const desc = fs.readFileSync('pr_description2.md', 'utf8');
console.log(JSON.stringify(desc));
