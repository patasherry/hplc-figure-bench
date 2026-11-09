const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf-8');

html = html.replace(
  '<label class="f">Margin around fractions (%)<input type="number" id="o-runPad" data-opt="runPad" min="0" step="5"></label>',
  '<label class="f">Margin around fractions (%)<input type="number" id="o-runPad" data-opt="runPad" min="0" step="5"></label>\n        <label class="f" title="Extra room to prevent labels from clipping">Safety margin (pt)<input type="number" id="o-min_safety_margin" data-opt="min_safety_margin" min="0" step="1"></label>'
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
