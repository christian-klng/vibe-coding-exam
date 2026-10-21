## What is this about?
**HTTPS** encrypts the connection between browser and server. Without encryption, third parties – for example on public Wi-Fi – can read what is transmitted, including passwords. For encryption, the server needs an **SSL/TLS certificate** proving it really belongs to your domain. The padlock icon in the browser shows: all good.

## Why does it matter?
Browsers mark sites without HTTPS as “not secure”, many features (e.g. login cookies, camera, location) only work over HTTPS, and search engines prefer encrypted sites.

## How to do it
1. Open your live URL. Does it start with `https://` and does the browser show a padlock?
2. Open the address with `http://` – are you redirected to `https://` automatically?
3. Most hosting providers handle both automatically. With your own domain you need to add it at the provider and adjust the DNS settings; the certificate is then usually created for free (e.g. via Let's Encrypt).
4. Make sure the README shows the `https://` address.

## Tip: How to ask Claude Code
> “Use curl to check whether my app at https://… has a valid certificate and whether http:// redirects to https://. Explain the result in simple words.”
