// Synthetic vendor-style exports; no real measurements. Values deliberately differ from A280.
module.exports = function ndUnits(header = 'Concentration', rows = [['Unknown', '7.25', 'widgets/mL']], metadata = []) {
  const wl = Array.from({length: 13}, (_, i) => 260 + i * 2);
  const lines = ['Vendor: Synthetic Agilent-style export', 'Sample Name:\tConc (mg/mL)', ...metadata,
    ['Sample Name', header, 'Units', 'A280', 'Corrected Conc.', ...wl].join('\t'),
    ...rows.map(r => [...r, '1.5', '0.5', ...wl.map(() => '1.5')].join('\t'))];
  return {name: 'synthetic_units.tsv', mimeType: 'text/plain', buffer: Buffer.from(lines.join('\r\n'))};
};
