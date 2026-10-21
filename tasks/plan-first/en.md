## What is this about?
The most common vibe-coding mistake: “Build me X” – and the AI starts right away, often in the wrong direction. Better: the AI first creates a **plan**, you read and correct it, and only then does it build. Claude Code has a dedicated **plan mode** for this (Shift+Tab).

## Why does it matter?
Changing a plan takes seconds; reworking finished code takes hours. Reading the plan also shows you *how* the AI intends to work – so you learn how software is structured along the way.

## How to do it
1. Pick a user story from `docs/user-stories.md`.
2. Switch to plan mode and ask the AI to plan the feature.
3. Read the plan. Is something unclear or too big? Ask and have it adjusted.
4. Save the final plan in `docs/plans/`, e.g. `docs/plans/login.md`.
5. Let the AI implement the plan and commit the result.

## Tip: How to ask Claude Code
> “Plan the user story ‘…’. Write the plan to docs/plans/<name>.md with goal, affected files and steps. Don't start coding yet.”
