
const fs = require('fs');
fs.writeFileSync('tests/data/nd/synthetic_10mg.tsv', 'Sample ID\tUser name\tDate\tTime\tmg/ml\tA280 10 mm\tA260 10 mm\t260/280\nPool\tuser\t1/1/22\t1:00\t10.0\t10.0\t5\t2');
fs.writeFileSync('tests/data/nd/synthetic_5mg.tsv', 'Sample ID\tUser name\tDate\tTime\tmg/ml\tA280 10 mm\tA260 10 mm\t260/280\nConcentrated\tuser\t1/1/22\t1:00\t5.0\t5.0\t2.5\t2');
fs.writeFileSync('tests/data/nd/synthetic_4mg.tsv', 'Sample ID\tUser name\tDate\tTime\tmg/ml\tA280 10 mm\tA260 10 mm\t260/280\nPool\tuser\t1/1/22\t1:00\t4.0\t4.0\t2\t2');
