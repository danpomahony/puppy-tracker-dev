import PocketBase from 'pocketbase'

// Same-origin client. In development, Vite proxies /api to PocketBase
// (see vite.config.ts), so there are no cross-origin (CORS) problems.
export const pb = new PocketBase('/')
