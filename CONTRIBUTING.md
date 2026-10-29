# Contributing to Sparky

Start with [AGENTS.md](AGENTS.md) and the relevant guide in [docs/README.md](docs/README.md). AI/behavioral changes must satisfy [PRODUCT_PRINCIPLES.md](docs/PRODUCT_PRINCIPLES.md); biometric surfaces also follow [BIOMETRICS.md](docs/surface-contracts/BIOMETRICS.md).

```bash
npm install
npm run build
npm run oss:audit
```

`npm run typecheck` requires Deno. Frontend work also requires `npm run typecheck:ui` and the AGENTS checklist.

Before a PR:

- Build and public-readiness audit pass, or findings are explained.
- Schema changes have migrations; new functions appear in the [function registry](supabase/functions/README.md).
- User-facing claims show source, window and uncertainty where relevant, with correction paths.
- No real user data, local exports, `.env` or private project refs are committed.
