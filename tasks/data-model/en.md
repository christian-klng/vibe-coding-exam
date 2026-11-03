## What is this about?
Almost every app stores data: users, posts, appointments … A **data model** describes which **tables** exist, which **fields** (columns) they have and which **relationships** connect them.

Example: a *user* (name, email) has many *study plans* (title, exam date), and each study plan has many *daily goals*.

## Why does it matter?
A data model is hard to change later – once real data is stored, every change becomes costly. If you define it up front, the AI builds a fitting database instead of inventing new tables for every feature.

## Tip: How to ask Claude Code
> “Derive a data model from docs/user-stories.md. Explain each table in simple words and draw a Mermaid ER diagram in docs/data-model.md.”
