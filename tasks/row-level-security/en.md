## What is this about?
Two terms that are often confused:
- **Authentication:** *Who are you?* (login)
- **Authorization:** *What are you allowed to do?* (access rules)

Many vibe-coded apps have a login but no access rules. Then any signed-in user – with a little skill – can read everyone else's data. **Row-level security (RLS)** solves this directly in the database: for every row it checks whether it belongs to the requesting user.

## Why does it matter?
With services like Supabase, the browser talks directly to the database. Without RLS your database is practically public. This exact mistake has already cost many AI-built apps their users' data.

## Tip: How to ask Claude Code
> “Check all tables in my project: where is row-level security or a check for the signed-in user missing? Write the missing rules as a migration and explain each one in a sentence.”
