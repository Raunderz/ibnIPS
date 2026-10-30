// Type surface for the generated login-page module. `scripts/check.sh` writes
// `build/src/page.js` and `build/src/page.ts` at build time; this declaration
// exists so `civet --typecheck` can resolve the specifier (Civet rewrites
// `./page.ts` to `./page.js`) without the generated file being part of the
// source tree. The module is never loaded from `src/` at runtime: development
// falls back to reading `public/index.html` off the filesystem.
export declare const PAGE_TEMPLATE: string
