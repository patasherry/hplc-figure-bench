const fs = require('fs');

const file = fs.readFileSync('tests/suites/30_robust.js', 'utf8');

const regex = /await p.click\('#addManBtn'\);/;
const match = regex.exec(file);
if (match) {
    const newContent = file.slice(0, match.index) + "await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=other]');" + file.slice(match.index + 29);
    fs.writeFileSync('tests/suites/30_robust.js', newContent);
    console.log("Patched successfully");
} else {
    console.log("Regex not found");
}
