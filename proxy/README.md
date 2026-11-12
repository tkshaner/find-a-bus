# fab-proxy

TheBus serves `/vehicle/` without CORS headers, so a browser page cannot read it
directly. Routes and arrivals do not need this; only vehicle lookup does.

This Cloudflare Worker forwards **only** `https://api.thebus.org/vehicle/`
lookups (`key` and `num` parameters), and only for the page origins you list.
It is not an open proxy, it does not log request URLs, and it does not store
your TheBus key. The key still travels from the browser through the worker to
TheBus, so only use a proxy you control.

The Cloudflare Workers free plan is enough for personal use.

## Deploy

```sh
cd proxy
npx wrangler login     # one-time, opens a browser
npx wrangler deploy
```

Wrangler prints the worker URL, for example
`https://fab-proxy.your-account.workers.dev`.

Alternatively, in the Cloudflare dashboard: **Workers & Pages → Create →
Create Worker**, paste `worker.js`, deploy, then add an `ALLOWED_ORIGINS`
variable under **Settings → Variables**.

## Configure the app

In Find-a-Bus, open **Advanced API settings** and set the proxy template to:

```
https://fab-proxy.your-account.workers.dev/?url={url}
```

## Allowed origins

`ALLOWED_ORIGINS` in `wrangler.toml` is a comma-separated list of page origins
(scheme, host and port, no path or trailing slash). The default allows the
GitHub Pages site and `localhost:8000` / `127.0.0.1:8000`. Add your own domain
if you host the app elsewhere. Requests from other origins get HTTP 403.

## Responses

| Status | Meaning |
| --- | --- |
| 403 `Origin not allowed` | The page origin is not in `ALLOWED_ORIGINS`. |
| 400 | The `url` parameter was not a TheBus `/vehicle/` lookup with `key` and `num`. |
| 502 | TheBus was unreachable or redirected unexpectedly. |
| other | TheBus's own status and body, passed through with CORS headers. |
