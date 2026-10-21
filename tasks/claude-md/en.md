## What is this about?
An AI does not remember earlier conversations. **CLAUDE.md** is a file in your repo's root folder that Claude Code reads automatically at the start of every session. It contains what the AI needs to know about your project – its **context**. Other tools use `AGENTS.md` for this.

## Why does it matter?
Without context, the AI has to guess every time: which language, which libraries, which rules? With a good CLAUDE.md you get results that fit your project from the start – without repeating yourself.

## How to do it
1. Create `CLAUDE.md` in the root folder.
2. Write in it:
   - What is the project? (one or two sentences, link to `docs/`)
   - Tech stack and important commands (run, test)
   - Rules, e.g. “Write texts in English”, “No API keys in the code”, “Ask before deleting files”
3. Keep it short. Ten clear lines beat three pages.

## Tip: How to ask Claude Code
> “Create a CLAUDE.md for this project. Use the files in docs/ and suggest rules that make sense for beginners.” – or simply run the `/init` command.
