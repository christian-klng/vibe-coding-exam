## What is this about?
An **API key** is like a password for a service (e.g. OpenAI, Stripe, Supabase). Whoever has it can use the service in your name – and at your expense. Keys therefore belong in **environment variables**: values stored outside the code, locally in a `.env` file.

## Why does it matter?
This is the most common and most expensive vibe-coding mistake. Bots scan GitHub around the clock for keys – a published key is often abused within minutes. **Careful:** just deleting a key from the file is not enough. It stays visible in the commit history. A key that was ever published must be **revoked and recreated** with the provider.

## Tip: How to ask Claude Code
> “Search my project and the Git history for API keys, passwords and tokens. Move any values into environment variables, create a .env.example and tell me which keys I need to recreate with the provider.”
