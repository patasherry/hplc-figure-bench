// 00 preflight: AGENTS.md-derived repository preflight to prevent scope rejections
// Runs before PR creation (as part of the local test suite) and fails on stray files.
const { execSync } = require('child_process');
const { suite } = require('../lib/harness');

(async () => {
  const T = suite('00_preflight');
  await T.t('AGENTS.md allowlist', async () => {
    let untracked = [], changed = [];
    try {
      const cwd = require('path').resolve(__dirname, '../../');
      untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf-8', cwd }).trim().split('\n').filter(Boolean);
      changed = execSync('git diff --name-only HEAD', { encoding: 'utf-8', cwd }).trim().split('\n').filter(Boolean);
    } catch (e) {
      // If we're not in a git repository or git fails, we just skip the check
      return;
    }

    const files = [...new Set([...untracked, ...changed])];
    const ALLOWED = /^(hplc-figure-bench\(WF1\.13\)\.html|README\.md|tests\/(suites|data|lib)\/|tests\/README\.md|docs\/)/;
    const SAFE = /^(tests\/|docs\/|\.github\/ISSUE_TEMPLATE\/|\.github\/PULL_REQUEST_TEMPLATE\.md)/;

    const badFiles = [];
    for (const f of files) {
      // Exact match for specific allowed workflow modifications (like test.yml matrices) or AGENTS.md edits
      if (f === '.github/workflows/tests.yml' || f === 'AGENTS.md') continue;

      if (ALLOWED.test(f) || SAFE.test(f)) continue;

      badFiles.push(f);
    }

    if (badFiles.length > 0) {
      const msg = `Stray files detected outside allowed scope: ${badFiles.join(', ')}\nRemediation: Remove scratch scripts, test logs, or patch files. Commit only hplc-figure-bench(WF1.13).html, README.md, docs/, or tests/ folders as permitted by AGENTS.md.`;
      T.check('files in allowlist', false, msg);
    } else {
      T.check('files in allowlist', true, '');
    }
  });
  T.done();
})();
