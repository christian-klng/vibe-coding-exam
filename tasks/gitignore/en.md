## What is this about?
Not everything in your project folder belongs in the repo. The **.gitignore** file lists which files and folders Git should ignore – they are then never committed.

## Why does it matter?
- **Dependencies** like `node_modules` are huge and can be reinstalled at any time.
- **.env files** contain passwords and API keys – in a public repo anyone can read them.
- **Personal settings** belong only on your machine.

## Checklist: Claude Code files
Claude Code creates its own files. Here is how to decide what may go into the repo:

| File | In the repo? | Why |
|---|---|---|
| `CLAUDE.md` | ✅ yes | project knowledge for everyone working on it |
| `.claude/settings.json` | ✅ yes | shared team settings – check first that no keys are in it |
| `.claude/commands/`, `.claude/agents/` | ✅ yes | shared commands and agents |
| `.claude/settings.local.json` | ❌ no | personal permissions, local paths, possibly tokens |
| `CLAUDE.local.md` | ❌ no | your personal notes for the AI |
| `.mcp.json` with keys written in | ❌ no | keys belong in environment variables |

## How to do it
1. Open or create `.gitignore` in the root folder.
2. Add at least: `node_modules`, build folders (e.g. `.next`, `dist`), `.env*`, `.claude/settings.local.json`, `CLAUDE.local.md`, `.DS_Store`.
3. Has any of this already been committed? Remove it from the repo (the file stays on your machine).

## Tip: How to ask Claude Code
> “Check my .gitignore. Is anything missing for my tech stack or for Claude Code? Are files already in the repo that don't belong there? Remove them from Git but not from my machine.”
