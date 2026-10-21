## What is this about?
Your app has two parts:
- **Client:** code that runs in the user's browser. Anyone can look at it (right-click → “view source” or developer tools).
- **Server:** code that runs on your hosting. Users only see the result.

Secret keys may **only be used on the server**. Frameworks mark variables that may reach the browser with a prefix such as `NEXT_PUBLIC_` (Next.js) or `VITE_` (Vite). Everything with that prefix is public!

## Why does it matter?
A typical mistake: the AI builds a chat with an AI API and sends the request straight from the browser – including the API key. Anyone opening the page can copy the key and use it on your bill. `.gitignore` doesn't help here, because the key is inside the delivered code.

## How to do it
1. Go through all environment variables: which are secret (keys, passwords), which may be public (e.g. your app's address)?
2. Make sure secret variables do **not** have a `NEXT_PUBLIC_` or `VITE_` prefix.
3. Route calls to services with secret keys through a server function (API route, server action).
4. Check the live site: open developer tools → network or sources → search for parts of your key.

## Tip: How to ask Claude Code
> “Check whether secret keys in my project can end up in browser code. List all environment variables, tell me which are public and which are secret, and move calls that use secret keys to the server.”
