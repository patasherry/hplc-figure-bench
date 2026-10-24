# Goals

This file sets the direction for every agent on this project: the local manager, Jules, Claude Code and the lead. Patrick owns it. Edit the list in plain words whenever priorities change.

## The end goal

An app Patrick can trust with his real purification data: every number it reports is right, his instrument files load without fuss, and a figure is ready for a paper or committee with little hand fixing.

## Priorities, in order

1. **Problems Patrick reports** (issues labelled `from-patrick`). These go to the front of the Jules queue.
2. **Numbers the app reports**: yields, concentrations, peak areas, SEC masses, gel purity, Methods text. A wrong number is worse than a missing feature.
3. **Loading real instrument files**: ÄKTA/UNICORN exports, HPLC exports, NanoDrop files, gel images. A file that won't load stops all work.
4. **Figures that need no hand fixing**: labels that don't overlap, sensible defaults, clean export.
5. **Speed and ease of use** in the everyday workflow.
6. **Cleanup** (dead code, wording, tidy tests): only after the above, and never in a way that slows the others.

## What not to spend time on

- New features nobody asked for.
- Rewrites, reformatting, frameworks or build tools.
- Audit findings about things Patrick doesn't use, unless they make a number wrong.

## How direction is checked

Once a day the lead (Claude) reads what the manager and Jules did against this file, fixes anything that went the wrong way, and posts a **Lead check-in** on issue #17. The manager reads the newest check-in before it routes questions or triages issues, so the check-in steers what it does next.
