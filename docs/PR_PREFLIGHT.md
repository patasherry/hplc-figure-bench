# Numerical and import fix evidence preflight

When a Pull Request changes a reported numerical value (such as yields, concentrations, peak areas, SEC masses, gel purity, etc.), or fixes how a file is imported (chromatogram, NanoDrop, GenBank, gel, project JSON), it must demonstrate that the change demonstrably fixes a real user-visible case. For an import fix the displayed result is the value or message the user sees after loading the file (a number in a table, a toast, a warning, a peak or reading that appears or no longer appears).

To prevent agent capacity drain and ensure reliability, fill out the following checklist and include it in your Pull Request description.

If an existing UI test already verifies these conditions on the PR branch, you can skip adding duplicate coverage and simply reference the test.

## Preflight Checklist

- [ ] **Affected displayed value or message:** (What UI value or message is changing? e.g., "Monomer SEC mass", "Gel lane purity %", "the toast after loading a semicolon-separated file")
- [ ] **Synthetic input:** (What dataset or synthetic file triggers this case?)
- [ ] **Tolerance / Contract:** (What is the expected value and allowed tolerance? Or is exact text expected due to contractual rounding?)
- [ ] **Zero semantics:** (If the change involves zero, is it a measured zero or missing/unknown data?)
- [ ] **Main-versus-branch result:** (Demonstrate that a test fails on `main` but passes on this branch)
  - Result on `main` (displayed incorrect value): _____
  - Result on PR branch (expected displayed value): _____

## Note for existing coverage
If an existing test already covers this scenario without failing on `main` (e.g., verifying a different aspect), you *must* add a minimal UI-level synthetic test case that explicitly fails on `main` and passes on the PR branch to prove the fix.

## Parser-level coverage (supplement, not a substitute)
The UI check above is required. Add a focused parser-format case in addition only when one UI assertion cannot tell the formats apart (for example, the same displayed number results from a comma-decimal and a point-decimal file). Keep it small and synthetic, and drive it through the UI as well (load the file, read the DOM). Do not use a broad fixture that spans several formats: one minimal file per behavior keeps the suite from becoming brittle.

## What the gate looks for
A PR that changes a reported number or an import path must list at least one check under "Checks this PR fixes" (it fails on `main` and passes on the branch). A PR with only checks that also pass on `main` is sent back, as happened with PRs 557 and 558.
