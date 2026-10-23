## Unreleased (2026-10-22 to 2026-10-23)

### Science
- #21 Ignored ladder marks with zero or missing size when labelling bands
- #22 Counted SEC elution volumes from the point of injection (changed scientific values)
- #25 Added NanoDrop A280 coefficient to the methods text
- #26 Fixed UV area flow calculation and flagged missing 2 mm UV path in methods (changed scientific values)
- #28 Refined SEC peak finding, summary export, gel and panel layout (changed scientific values)
- #29 Stopped pool volume at the last fraction instead of the run end (changed scientific values)

### Fixes
- #41 Audited on-screen messages for clarity and missing notifications
- #45 Fixed a test harness timeout when adding a second Concentrated step

### Tests
- #4 Added Playwright test suites using synthetic data
- #18 Configured test suites to run on pull requests
- #43 Added a test suite for all file exports
- #47 Added a test suite for GenBank parsing edge cases
- #65 Added a test for saving and reloading projects in browser storage
- #67 Added tests for importing older and partial project files
- #69 Allowed test PRs to update the workflow matrix automatically

### Project setup
- #1 Documented app features and constraints in README
- #2 Added GitHub workflow for Claude Code
- #3 Added AGENTS.md rules and updated README dependencies
- #44 Brought README and AGENTS.md up to date
- #66 Created CODEMAP.md to help agents navigate the HTML file
- #68 Added a rule-based GitHub Actions supervisor for agents
