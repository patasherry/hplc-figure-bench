# Review lessons

One line per thing a review missed or got wrong, newest at the bottom. The local AI is sent the newest 20 bullet lines with every job, together with `docs/LOCAL_AI_BRIEF.md`, so a lesson written here changes its next review. Write each one as something to look for, in one line starting with `- `. Remove a line once it stops being useful.

The manager keeps a second list on the PC by itself (`.hfb-lessons.txt` in the user folder): one line for each pull request the automatic gate sends back, with the reason. That list needs no upkeep.

- A project can hold plain HPLC traces with no ÄKTA run. Check that a change to loading or to the step list still gives those traces a place to appear (#1415).
- The same test can be counted under two suite names. Count failing checks by their id, not by suite (#1419).
- GitHub does not close an issue when the workflow token merges its pull request. A change that relies on "Closes #N" needs the issue closed in code (#1412).
- A test helper that drags something and drags it back does not return it to the exact pixel. Use the app's own Reset control before the next check (#1421).
- A new header control can squeeze the project name at narrow widths. Check the phone layout whenever the header gains anything (#1403).
