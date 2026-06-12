// Next.js middleware entry point.
// Re-exports the proxy function (security headers, auth guards, rate limiting)
// from src/proxy.ts as the default export — which is what Next.js expects.
export { proxy as default, config } from './proxy';