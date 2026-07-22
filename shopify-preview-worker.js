const STORES = {
  schaefer: 'https://schaefer-and-companions.art/',
  harding: 'https://hardingwatch.com/',
  // Add another Shopify site only when you own it or have permission:
  // whitestar: 'https://www.whitestar-watch.ch/',
};

export default {
  async fetch(request) {
    const requestUrl = new URL(request.url);
    const key = requestUrl.searchParams.get('site');
    const target = STORES[key];

    if (!target) {
      return new Response('Unknown preview site', { status: 404 });
    }

    const upstream = await fetch(target, {
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      cf: { cacheTtl: 300, cacheEverything: false },
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return new Response('Store preview did not return HTML', { status: 502 });
    }

    let html = await upstream.text();
    const origin = new URL(target).origin;

    // Resolve relative assets against the real Shopify storefront.
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${origin}/">`);

    // Keep navigation and forms on the real store rather than inside the proxy.
    html = html.replace(/<a\b([^>]*?)>/gi, (tag, attrs) => {
      if (/\btarget\s*=/.test(attrs)) return tag;
      return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
    });
    html = html.replace(/<form\b([^>]*?)>/gi, (tag, attrs) => {
      if (/\btarget\s*=/.test(attrs)) return tag;
      return `<form${attrs} target="_blank">`;
    });

    const headers = new Headers(upstream.headers);
    headers.delete('x-frame-options');
    headers.delete('content-security-policy');
    headers.delete('content-security-policy-report-only');
    headers.delete('set-cookie');
    headers.set('content-type', 'text/html; charset=UTF-8');
    headers.set('cache-control', 'public, max-age=300');
    headers.set('content-security-policy', "frame-ancestors 'self' https://studiorage.ch https://www.studiorage.ch");
    headers.set('access-control-allow-origin', 'https://studiorage.ch');

    return new Response(html, {
      status: upstream.status,
      headers,
    });
  },
};
