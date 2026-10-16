/// <reference types="vite/client" />

// Empty for local, single-server development. Pages builds supply an HTTPS backend origin.
export const serverUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
export const basePath = import.meta.env.BASE_URL;
export const siteUrl = (query = '') => `${location.origin}${basePath}${query}`;

// Only send the tunnel-specific header to ngrok endpoints.
export const tunnelHeaders: Record<string, string> = /\.ngrok(?:-free)?\.(?:app|dev|io)$/i.test(new URL(serverUrl || location.origin).hostname) ? { "ngrok-skip-browser-warning": "1" } : {};
