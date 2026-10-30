const fs = require('fs');
fs.writeFileSync('tests/data/nd/umol_10mg.tsv', 'Sample ID\tUser name\tDate\tTime\tmg/ml\tA280 10 mm\tA260 10 mm\t260/280\tSample Type\tFactor\nPool\tPS\t10/22/2026\t15:02\t10.0\t10.0\t5\t2\t1 Abs = 1 mg/ml\t1.00');
fs.writeFileSync('tests/data/nd/umol_5mg.tsv', 'Sample ID\tUser name\tDate\tTime\tmg/ml\tA280 10 mm\tA260 10 mm\t260/280\tSample Type\tFactor\nConcentrated\tPS\t10/22/2026\t15:02\t5.0\t5.0\t2.5\t2\t1 Abs = 1 mg/ml\t1.00');
fs.writeFileSync('tests/data/nd/umol_4mg.tsv', 'Sample ID\tUser name\tDate\tTime\tmg/ml\tA280 10 mm\tA260 10 mm\t260/280\tSample Type\tFactor\nPool\tPS\t10/22/2026\t15:02\t4.0\t4.0\t2\t2\t1 Abs = 1 mg/ml\t1.00');
