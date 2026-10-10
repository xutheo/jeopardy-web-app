/// <reference types="vite/client" />

// Empty for local, single-server development. Pages builds supply an HTTPS backend origin.
export const serverUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
export const basePath = import.meta.env.BASE_URL;
export const siteUrl = (query = '') => `${location.origin}${basePath}${query}`;
