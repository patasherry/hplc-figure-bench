// Test suite for jules-leader.js prompt generation and question handling
const fs = require('fs');
const assert = require('assert');

const leaderSrc = fs.readFileSync('.github/scripts/jules-leader.js', 'utf8');

// Extract the prompt function
const promptFnMatch = leaderSrc.match(/const prompt = \([\s\S]*?\n  \};/);
assert(promptFnMatch, 'Could not find prompt function in jules-leader.js');

const owner = 'patasherry', repo = 'hplc-figure-bench';
const promptFn = new Function('owner', 'repo', promptFnMatch[0] + '\nreturn prompt;')(owner, repo);

// Test 1: Bug found by test suite with triage boilerplate in body
const issue1 = {
  number: 1178,
  title: 'Bug found by 22_protein/10_cleavage_consistency:threw',
  body: 'The check `22_protein/10_cleavage_consistency:threw`, added in #1173, fails on main:\n\n> page.click: Timeout 30000ms exceeded.\n\nThe PR description in #1173 may say more about the cause. Triage: if this is a real app bug, fill in the bug template headings and move it to `jules-queue` (or to Claude for scientific changes).'
};

const p1 = promptFn(issue1, 1);
assert(!p1.includes('Triage: if this is a real app bug'), 'Triage boilerplate should be stripped');
assert(p1.includes('Target test suite: tests/suites/22_protein.js'), 'Should identify tests/suites/22_protein.js');
assert(p1.includes('Reproduce command: node tests/suites/22_protein.js'), 'Should provide reproduce command');
assert(p1.includes('Closes #1178'), 'Should include Closes #1178');

// Test 2: Another check pattern
const issue2 = {
  number: 1176,
  title: 'Bug found by 10_data_truth/fixture_frac_uneven/step-name',
  body: 'The check `10_data_truth/fixture_frac_uneven/step-name`, added in #1173, fails on main:\n\n> expected "Size exclusion", timeline says "fixture frac uneven"\n\nThe PR description in #1173 may say more about the cause. Triage: if this is a real app bug, fill in the bug template headings and move it to `jules-queue` (or to Claude for scientific changes).'
};

const p2 = promptFn(issue2, 1);
assert(!p2.includes('Triage: if this is a real app bug'), 'Triage boilerplate should be stripped');
assert(p2.includes('Target test suite: tests/suites/10_data_truth.js'), 'Should identify tests/suites/10_data_truth.js');
assert(p2.includes('Reproduce command: node tests/suites/10_data_truth.js'), 'Should provide reproduce command');

// Test 3: Normal task without check pattern
const issue3 = {
  number: 1141,
  title: 'Collision-aware label offsetting',
  body: 'Ensure labels do not collide when rendered closely.'
};

const p3 = promptFn(issue3, 1);
assert(!p3.includes('Target test suite:'), 'Non-check issue should not have Target test suite');
assert(p3.includes('Closes #1141'), 'Should include Closes #1141');

// Test 4: Attempt > 1 guidance
const p3Retry = promptFn(issue3, 2, 'timed out');
assert(p3Retry.includes('NOTE: attempt 2. The previous attempt ended with an error (timed out)'), 'Should include retry note');

// Test 5: Verify question regexes
const DONE_Q = /\b(ready to (open|create|submit|finalize)|shall|should|may|can|would you like me to) (i |we )?(now )?(proceed|submit|finalize|wrap up|open|create|push)\b[^?]{0,80}\b(pr|pull request|changes|commit)?\?/i;
const QUICK = /\b(skip|bypass|without (running|waiting)|instead of)\b[^.?]{0,60}\b(compare(\.js)?|test suite|tests?|comparison)\b|\b(compare(\.js)?|comparison|test suite|bash|shell|environment)\b[^.?]{0,60}\b(too (slow|long)|time[sd]? ?out|stopped responding|not responding|hang|hung|unresponsive)\b|\b(shall|should|may|can) i (now )?(proceed|submit|open the (pr|pull request)|commit)\b/i;

assert(DONE_Q.test('Should I now proceed to open the PR?'), 'DONE_Q match');
assert(DONE_Q.test('May I create the pull request?'), 'DONE_Q match');
assert(QUICK.test('compare.js is too slow, can I proceed?'), 'QUICK match');
assert(QUICK.test('Can I skip compare.js?'), 'QUICK match');

console.log('All jules-leader tests passed successfully!');
