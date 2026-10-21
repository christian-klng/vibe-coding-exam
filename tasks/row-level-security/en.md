## What is this about?
Two terms that are often confused:
- **Authentication:** *Who are you?* (login)
- **Authorization:** *What are you allowed to do?* (access rules)

Many vibe-coded apps have a login but no access rules. Then any signed-in user – with a little skill – can read everyone else's data. **Row-level security (RLS)** solves this directly in the database: for every row it checks whether it belongs to the requesting user.

## Why does it matter?
With services like Supabase, the browser talks directly to the database. Without RLS your database is practically public. This exact mistake has already cost many AI-built apps their users' data.

## How to do it
1. Check your data model: which tables contain personal data? Do they have a field like `user_id`?
2. Enable RLS for these tables and create rules, e.g. “users may only read rows whose `user_id` equals their own ID”.
3. Store the rules as a migration in the repo (e.g. `supabase/migrations/…sql`).
4. Without Supabase: make sure every database access in your server code filters by the signed-in user.
5. Test it: sign in with two accounts – can account B see account A's data?

## Tip: How to ask Claude Code
> “Check all tables in my project: where is row-level security or a check for the signed-in user missing? Write the missing rules as a migration and explain each one in a sentence.”
