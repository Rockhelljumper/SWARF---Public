# SWARF Public

This repository is SWARF’s independently buildable public publication plane. It contains a curated projection of approved material and never reads `SWARF---Private`, a sibling directory, or a private credential.

`generated/` is publisher-owned. Public code validates every package’s batch digest and every generated source-file digest, so hand edits and partial updates are detected. Content corrections flow through reviewed private source or a reviewed contribution-import process.

## Quick start

```text
pnpm install
pnpm validate
pnpm test
pnpm build
go -C backend test ./...
pnpm --dir frontend install
pnpm --dir frontend build
```

The initial site intentionally renders an empty state until a human-approved publication package is merged. A package is accepted only when it is not a preview, its manifest digest is valid, files match their source digests, and no unexpected files exist under `generated/`.

## Local Docker preview

The Private control-plane repository carries the shared local Compose file. It runs this repository’s Next.js frontend and its separate Go catalog API without a private source mount, and publishes the resulting application only on `http://127.0.0.1:3102`. From the sibling `SWARF---Private` directory, use `docker compose -f docker-compose.local.yml up --build --detach`; use `docker compose -f docker-compose.local.yml down` to stop it.

## Publication contract

The private publisher may create a public branch and pull request using a narrowly scoped GitHub App. It cannot merge, bypass branch protections, or read the private repository from public CI. The package’s stable catalog lives at `generated/catalog.json` and the built catalog at `dist/catalog.json` for portfolio consumers.

See [the publishing guide](docs/publishing.md), [portfolio feed contract](docs/portfolio-feed.md), and [security policy](SECURITY.md).
