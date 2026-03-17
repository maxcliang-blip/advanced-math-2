import { z } from 'zod';
import { createEndpoint } from 'zite-integrations-backend-sdk';
import { createDecipheriv, createHash } from 'crypto';

const SECRET = "tc_AES256_s3cr3t_k3y_tabcl0ak_v3!";

function getKey(): Buffer {
  return createHash('sha256').update(SECRET).digest();
}

function decryptUrl(encrypted: string): string {
  const combined = Buffer.from(encrypted, 'base64');
  if (combined.length < 17) throw new Error('Invalid ciphertext');
  const iv = combined.subarray(0, 16);
  const ciphertext = combined.subarray(16);
  const decipher = createDecipheriv('aes-256-cbc', getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

function resolveUrl(base: string, relative: string): string {
  try {
    const trimmed = relative.trim();
    if (!trimmed ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:')) {
      return trimmed;
    }
    return new URL(trimmed, base).href;
  } catch {
    return relative;
  }
}

// Known JS-heavy SPAs that won't render via static proxy
const JS_HEAVY_DOMAINS = [
  'youtube.com', 'www.youtube.com',
  'twitter.com', 'x.com', 'www.twitter.com',
  'instagram.com', 'www.instagram.com',
  'facebook.com', 'www.facebook.com',
  'tiktok.com', 'www.tiktok.com',
  'netflix.com', 'www.netflix.com',
  'twitch.tv', 'www.twitch.tv',
  'discord.com', 'www.discord.com',
  'reddit.com', 'www.reddit.com',
  'gmail.com', 'mail.google.com',
];

function rewriteHtml(html: string, baseUrl: string): string {
  const origin = new URL(baseUrl).origin;

  // 1. Remove Content-Security-Policy meta tags (they block resources)
  html = html.replace(
    /<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi,
    '<!-- csp-meta removed -->'
  );

  // 2. Neutralize meta-refresh redirects
  html = html.replace(
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/gi,
    '<!-- meta-refresh removed -->'
  );

  // 3. Strip integrity attributes (SRI breaks when content is proxied)
  html = html.replace(/\s+integrity=["'][^"']*["']/gi, '');

  // 4. Strip nonce attributes (CSP nonces block inline scripts)
  html = html.replace(/\s+nonce=["'][^"']*["']/gi, '');

  // 5. Strip crossorigin attributes (cause CORS failures on sub-resources)
  html = html.replace(/\s+crossorigin(?:=["'][^"']*["'])?/gi, '');

  // 6. Remove X-Frame-Options and CSP headers injected via <meta>
  html = html.replace(
    /<meta[^>]+http-equiv=["']?x-frame-options["']?[^>]*>/gi,
    '<!-- x-frame-options removed -->'
  );

  // 7. Inject base tag
  const baseTag = `<base href="${origin}/">`;
  if (html.match(/<head[^>]*>/i)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  } else {
    html = baseTag + html;
  }

  // 8. Rewrite src, href, action, data-src, poster, data-href attributes
  html = html.replace(
    /((?:src|href|action|data-src|data-href|poster|data-url)\s*=\s*)(["'])([^"']*)\2/gi,
    (_m, attr, quote, url) => `${attr}${quote}${resolveUrl(baseUrl, url)}${quote}`
  );

  // 9. Rewrite srcset
  html = html.replace(
    /srcset\s*=\s*(["'])([^"']*)\1/gi,
    (_m, quote, srcset) => {
      const rewritten = srcset.split(',').map((entry: string) => {
        const parts = entry.trim().split(/\s+/);
        if (parts[0]) parts[0] = resolveUrl(baseUrl, parts[0]);
        return parts.join(' ');
      }).join(', ');
      return `srcset=${quote}${rewritten}${quote}`;
    }
  );

  // 10. Rewrite inline CSS url() values
  html = html.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (_m, quote, url) => `url(${quote}${resolveUrl(baseUrl, url)}${quote})`
  );

  // 11. Rewrite @import in <style> blocks
  html = html.replace(
    /@import\s+(["'])([^"']+)\1/gi,
    (_m, quote, url) => `@import ${quote}${resolveUrl(baseUrl, url)}${quote}`
  );

  // 12. Inject compatibility shim — prevents common iframe crashes
  const shim = `<script>
(function(){
  try { Object.defineProperty(document,'domain',{get:function(){return location.hostname;},set:function(){}}); } catch(e){}
  // Silence sandboxed localStorage/sessionStorage errors
  try { window.localStorage; } catch(e){ Object.defineProperty(window,'localStorage',{value:{getItem:function(){return null;},setItem:function(){},removeItem:function(){},clear:function(){},key:function(){return null;},length:0}}); }
  try { window.sessionStorage; } catch(e){ Object.defineProperty(window,'sessionStorage',{value:{getItem:function(){return null;},setItem:function(){},removeItem:function(){},clear:function(){},key:function(){return null;},length:0}}); }
})();
</script>`;
  if (html.match(/<\/head>/i)) {
    html = html.replace(/<\/head>/i, `${shim}</head>`);
  } else {
    html += shim;
  }

  return html;
}

export default createEndpoint({
  description: 'Proxies an AES-256-CBC encrypted URL with full HTML rewriting',
  inputSchema: z.object({
    enc: z.string(),
  }),
  outputSchema: z.object({
    content: z.string(),
    contentType: z.string(),
    finalUrl: z.string(),
    errorReason: z.string().optional(),
    isJsHeavy: z.boolean().optional(),
  }),
  execute: async ({ input }) => {
    let targetUrl: string;
    try {
      targetUrl = decryptUrl(input.enc);
    } catch {
      throw new Error('Invalid request');
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const parsedUrl = new URL(targetUrl);
    const origin = parsedUrl.origin;
    const hostname = parsedUrl.hostname;

    // Warn frontend if this is a known JS-heavy SPA
    const isJsHeavy = JS_HEAVY_DOMAINS.includes(hostname);

    let response: Response;
    let errorReason: string | undefined;

    try {
      response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': origin + '/',
          'Origin': origin,
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Sec-CH-UA': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          'Sec-CH-UA-Mobile': '?0',
          'Sec-CH-UA-Platform': '"Windows"',
          'Upgrade-Insecure-Requests': '1',
          'Connection': 'keep-alive',
          'DNT': '1',
        },
        redirect: 'follow',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) errorReason = 'DNS_FAILURE';
      else if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) errorReason = 'TIMEOUT';
      else if (msg.includes('certificate') || msg.includes('SSL') || msg.includes('TLS')) errorReason = 'SSL_ERROR';
      else errorReason = 'NETWORK_ERROR';
      return { content: '', contentType: 'text/html', finalUrl: targetUrl, errorReason, isJsHeavy };
    }

    const finalUrl = response.url || targetUrl;
    const contentType = response.headers.get('content-type') || 'text/html';

    if (response.status === 403) errorReason = 'BLOCKED_403';
    else if (response.status === 401) errorReason = 'AUTH_REQUIRED';
    else if (response.status === 429) errorReason = 'RATE_LIMITED';
    else if (response.status >= 500) errorReason = 'SERVER_ERROR';
    else if (response.status === 404) errorReason = 'NOT_FOUND';

    if (errorReason) {
      return { content: '', contentType, finalUrl, errorReason, isJsHeavy };
    }

    let content = await response.text();

    if (contentType.includes('text/html')) {
      content = rewriteHtml(content, finalUrl);
    } else if (contentType.includes('text/css')) {
      content = content.replace(
        /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
        (_m, quote, url) => `url(${quote}${resolveUrl(finalUrl, url.trim())}${quote})`
      );
      content = content.replace(
        /@import\s+(["'])([^"']+)\1/gi,
        (_m, quote, url) => `@import ${quote}${resolveUrl(finalUrl, url.trim())}${quote}`
      );
    }

    return { content, contentType, finalUrl, isJsHeavy };
  },
});
