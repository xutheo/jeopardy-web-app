import type { RequestHandler } from 'express';

export function allowedOrigins(value = '') {
  return new Set(value.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const url = new URL(s);
    if (!['https:', 'http:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('ALLOWED_ORIGINS must contain origins such as https://yourname.github.io (no repository path).');
    return url.origin;
  }));
}

export function corsMiddleware(origins: Set<string>): RequestHandler {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.vary('Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
      if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    } else if (req.method === 'OPTIONS' && origin) { res.sendStatus(403); return; }
    next();
  };
}
