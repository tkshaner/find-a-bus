// fab-proxy: a minimal Cloudflare Worker that lets the Find-a-Bus page read
// TheBus vehicle lookups, which api.thebus.org serves without CORS headers.
//
// It forwards exactly one upstream resource (https://api.thebus.org/vehicle/)
// and only for page origins listed in ALLOWED_ORIGINS, so it cannot be used
// as a general-purpose open proxy. Request URLs are never logged because they
// carry the rider's TheBus key.
//
// App template: https://<your-worker>.workers.dev/?url={url}

const UPSTREAM_ORIGIN = 'https://api.thebus.org';
const UPSTREAM_PATH = '/vehicle/';
const ALLOWED_PARAMS = new Set(['key', 'num']);
const DEFAULT_ALLOWED_ORIGINS = 'https://tkshaner.github.io,http://localhost:8000,http://127.0.0.1:8000';
const TIMEOUT_MS = 15000;

function allowedOrigins(env) {
  return new Set(String(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(',').map(value => value.trim()).filter(Boolean));
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function reply(status, message, origin) {
  const headers = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' };
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new Response(message, { status, headers });
}

// Returns the validated upstream URL, or null if the target is not allowed.
function upstreamFrom(requestUrl) {
  const target = new URL(requestUrl).searchParams.get('url');
  if (!target) return null;
  let upstream;
  try {
    upstream = new URL(target);
  } catch {
    return null;
  }
  if (upstream.origin !== UPSTREAM_ORIGIN || upstream.pathname !== UPSTREAM_PATH) return null;
  if (upstream.username || upstream.password || upstream.hash) return null;
  for (const name of upstream.searchParams.keys()) {
    if (!ALLOWED_PARAMS.has(name)) return null;
  }
  if (!upstream.searchParams.get('key') || !upstream.searchParams.get('num')) return null;
  return upstream;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const permitted = origin && allowedOrigins(env).has(origin) ? origin : null;
    if (!permitted) return reply(403, 'Origin not allowed', null);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(permitted) });
    }
    if (request.method !== 'GET') return reply(405, 'Method not allowed', permitted);

    const upstream = upstreamFrom(request.url);
    if (!upstream) return reply(400, 'Only TheBus /vehicle/ lookups are proxied', permitted);

    let response;
    try {
      response = await fetch(upstream.toString(), {
        headers: { Accept: 'application/xml, text/xml' },
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
    } catch {
      return reply(502, 'TheBus upstream unreachable', permitted);
    }
    if (response.status >= 300 && response.status < 400) {
      return reply(502, 'TheBus upstream redirected unexpectedly', permitted);
    }

    const headers = new Headers(corsHeaders(permitted));
    headers.set('Content-Type', response.headers.get('Content-Type') || 'text/xml; charset=utf-8');
    headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers });
  }
};
