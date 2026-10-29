# Numerical-fix evidence preflight

When a Pull Request changes a reported numerical value (such as yields, concentrations, peak areas, SEC masses, gel purity, etc.), it must demonstrate that the change demonstrably fixes a real user-visible case.

To prevent agent capacity drain and ensure reliability, fill out the following checklist and include it in your Pull Request description.

If an existing UI test already verifies these conditions on the PR branch, you can skip adding duplicate coverage and simply reference the test.

## Preflight Checklist

- [ ] **Affected displayed value:** (What UI value is changing? e.g., "Monomer SEC mass", "Gel lane purity %")
- [ ] **Synthetic input:** (What dataset or synthetic file triggers this case?)
- [ ] **Tolerance / Contract:** (What is the expected value and allowed tolerance? Or is exact text expected due to contractual rounding?)
- [ ] **Main-versus-branch result:** (Demonstrate that a test fails on `main` but passes on this branch)
  - Result on `main`: _____
  - Result on PR branch: _____

## Note for existing coverage
If an existing test already covers this scenario without failing on `main` (e.g., verifying a different aspect), you *must* add a minimal UI-level synthetic test case that explicitly fails on `main` and passes on the PR branch to prove the fix.
