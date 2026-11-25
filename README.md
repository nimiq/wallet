# Nimiq Wallet

The Wallet is built with [Vite+](https://viteplus.dev), which requires Node.js 22.18 or newer, or 24.11 or newer.

## Project setup
```
yarn install
```

### Compiles and hot-reloads for development
```
yarn serve
```

> You will also need to run the [Nimiq Hub](https://github.com/nimiq/hub#contribute) and [Nimiq Keyguard](https://github.com/nimiq/keyguard/#development) in development, too.

### Compiles and minifies for production
```
build=mainnet yarn build
```

The build config is selected via the `build` environment variable (`mainnet`, `testnet` or `local`). Before building,
the code is linted and type checked.

To test the production build, including the service worker, locally:
```
yarn preview
```

### Lints and fixes files
```
yarn lint
yarn lint:fix
```

Linting is done by Oxlint via `vp lint`, configured in `vite.config.ts`. The templates of Vue components are
additionally linted by ESLint, configured in `eslint.config.mjs`.

### Type checks
```
yarn typecheck
```
