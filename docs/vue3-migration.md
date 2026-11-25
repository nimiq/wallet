# Vue 3 migration plan

- **Status:** proposal
- **Baseline:** `claude/port-vue-components` at `8a50dc6f` (Vite+ build, `@nimiq/vue-components` ported into the
  wallet). All counts below were taken on that commit with `grep` over `src/` and are approximate.

## Summary

The Wallet runs on Vue 2.7, which reached end of life on 2023-12-31. Moving to Vue 3 cannot be done component by
component: Vue 3, vue-router 4, vue-i18n 9+, the portal and the virtual scroller each support only one Vue major, so
they have to switch in the same release.

The plan therefore has two parts:

1. **Phase 0, on Vue 2.7:** a series of small, independently shippable PRs that make the code base forward-compatible.
   Most of the edits (template and style syntax, `emits`, Vue-2-only libraries, router composables, reactivity
   hardening) land here, each verified against the current production behavior.
2. **Phase 1, one switch branch:** upgrade Vue and the version-locked libraries together and remove what only Vue 2
   needs. Thanks to Phase 0, this branch stays short and focused on the parts that cannot be done earlier.

The code base is in a good position: every component with script logic already uses `defineComponent` + `setup()`
(Composition API), the build already runs on Vite, and several dependencies already support both Vue majors.

## Current state

### Already compatible

| Item           | Notes                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Components     | 275 SFCs: 187 use `defineComponent` + `setup()`, none use `data`/`methods`/`computed` options. The rest are template-only (84 `<template functional>` icons). |
| Build          | Vite+ already; the plugin swap is `@vitejs/plugin-vue2` → `@vitejs/plugin-vue`.                                                                               |
| Pinia 2.3      | Supports Vue 2.7 and 3. Only the installation changes (`PiniaVuePlugin` → `app.use(pinia)`). Pinia 3 (Vue 3 only) is a follow-up.                             |
| vue-chartjs 5  | Peer dependency `vue: ^3.0.0-0 \|\| ^2.7.0`.                                                                                                                  |
| @sentry/vue    | Supports both; `init({ Vue })` becomes `init({ app })`.                                                                                                       |
| vue-matomo 4.2 | Supports both (uses `app.config.globalProperties` on Vue 3); `Vue.use` → `app.use`.                                                                           |
| vue-tsc 2      | Supports both.                                                                                                                                                |
| i18n extractor | `webpack-i18n-tools` already recognizes `<i18n-t keypath="…">` in addition to `<i18n path="…">`.                                                              |

### Dependencies to replace or upgrade

| Dependency                                                                                                | Target                                    | Affected code                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vue` 2.7                                                                                                 | Vue 3.5+                                  | everything                                                                                                                                                                                        |
| `@vitejs/plugin-vue2`                                                                                     | `@vitejs/plugin-vue`                      | `vite.config.ts`                                                                                                                                                                                  |
| `vue-router` 3.5                                                                                          | 4+                                        | `src/router.ts` (`new VueRouter`, `Route`, `RouteConfig`, `NavigationGuardNext`); the provide/inject `useRouter()` in `router.ts`, used in 39 files; `<keep-alive>` + `<router-view>` in 4 places |
| `vue-i18n` 8                                                                                              | latest major (v11 or newer)               | `src/i18n/i18n-setup.ts` (`new VueI18n`, `i18n.missing`); the wrapper in `src/lib/useI18n.ts` and its `provideI18n` call in `App.vue`; 11 `$tc` calls; 78 `<i18n path>` tags in 29 files          |
| `@linusborg/vue-simple-portal`                                                                            | built-in `<Teleport>`                     | 5 files                                                                                                                                                                                           |
| `vue-virtual-scroller` (fork `sisou/vue-virtual-scroller#nimiq/build`, commit `8e03a14`, based on 1.0.10) | v2 (Vue 3 line)                           | 5 files (transaction lists, address list); the fork's changes must be re-applied or made unnecessary                                                                                              |
| `v-click-outside` (Vue 2 only)                                                                            | own directive, or VueUse `onClickOutside` | `CountrySelector.vue`                                                                                                                                                                             |
| `@adapttive/vue-markdown` (Vue 2 only)                                                                    | markdown library + sanitized `v-html`     | `ReleaseNotesModal.vue`                                                                                                                                                                           |

### Code changes

| Change                                                                                                                                                                                                                             | Count                                                            | Phase |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----- |
| `slot="x"` / `slot-scope` → `#x` / `v-slot`. Mostly on `<div>`/`<span>`/`<a>`, which need a `<template #x>` wrapper; many are inside `<i18n>`                                                                                      | 176 in 43 files                                                  | 0     |
| `::v-deep` / `>>>` → `:deep()` (Vue 2.7's SFC compiler supports `:deep()`)                                                                                                                                                         | 403                                                              | 0     |
| `<template functional>` → plain template (icons)                                                                                                                                                                                   | 84 files                                                         | 0     |
| Declare `emits` on every component that emits. Vue 3 adds undeclared listeners to `$attrs`, so an emitted `click`/`input`/`change` also binds as a native listener on the root element and fires twice. Vue 2.7 accepts the option | ~63 files                                                        | 0     |
| Transition classes `-enter` / `-leave` → `-enter-from` / `-leave-from`. In Phase 0, write both selectors                                                                                                                           | ~45 rules in 18 files                                            | 0     |
| Custom `v-model`: `value` prop + `input` event → `modelValue` + `update:modelValue`. In Phase 0 via the `model: { prop, event }` option                                                                                            | 10 components                                                    | 0     |
| `filters` → plain function (`formatIntoGroups`)                                                                                                                                                                                    | 1 component, 2 uses                                              | 0     |
| `() => import('…vue')` in `components:` → `defineAsyncComponent` (exported by Vue 2.7)                                                                                                                                             | 3 (`FlaggedAddressWarning`)                                      | 0     |
| Tooltip: `$parent` passed as container (`Sidebar.vue`, `StakingButton.vue`), `$once('hook:mounted')` (removed in Vue 3), reliance on a component's `$el` (a text node for multi-root components in Vue 3)                          | 3 files                                                          | 0     |
| `Vue.prototype.$config` → `useConfig()` in `App.vue` (its only use)                                                                                                                                                                | 1                                                                | 0     |
| `Vue.set` / `Vue.delete` → plain assignment / `delete`. Still needed on 2.7 to add keys reactively                                                                                                                                 | 31 in 6 stores                                                   | 1     |
| `.native` modifier → remove (requires `emits` from Phase 0)                                                                                                                                                                        | ~25 in 16 files                                                  | 1     |
| `$listeners` → remove (merged into `$attrs` in Vue 3); `v-on="$listeners"` lines go away                                                                                                                                           | 21 in 20 files                                                   | 1     |
| `$tc(key, n)` → `$t(key, n)` (vue-i18n 8's `$t` does not pluralize; `$tc` is removed in v11)                                                                                                                                       | 11                                                               | 1     |
| `<i18n path>` → `<i18n-t keypath>` (slot syntax already converted in Phase 0)                                                                                                                                                      | 78 in 29 files                                                   | 1     |
| `<transition><keep-alive><router-view/></keep-alive></transition>` → `<router-view v-slot="{ Component }">` form                                                                                                                   | 4                                                                | 1     |
| App bootstrap: `new Vue`, `Vue.use` ×6, `Vue.config`, `Vue.prototype` → `createApp` / `app.use`                                                                                                                                    | `main.ts`, `pinia.ts`, `router.ts`, `i18n-setup.ts`, `matomo.ts` | 1     |
| Render functions: `createElement(c, { props })` → `h(c, props)` (`createWarningModal`, `main.ts`)                                                                                                                                  | 2                                                                | 1     |
| Directive hooks `bind`/`unbind` → `beforeMount`/`unmounted`; `DirectiveOptions` → `Directive`                                                                                                                                      | `directives/PointerEvents.ts`                                    | 1     |
| `<template v-for>` key moves from the children to the `<template>`                                                                                                                                                                 | 4                                                                | 1     |
| Types: default `import Vue from 'vue'` (18 files), `Vue` as a type (~98 uses) → `ComponentPublicInstance` etc.; `shims-vue.d.ts`; `declare module 'vue/types/vue'` → `ComponentCustomProperties`                                   | —                                                                | 1     |
| `v-if`/`v-for` on the same element (precedence flips in Vue 3), `v-bind="$attrs"` merge order (11 files use `$attrs`), `$attrs` now includes `class`/`style` (relevant with `inheritAttrs: false`)                                 | audit                                                            | 1     |

### Behavioral risks

These do not show up as compile errors and are the main risk of the migration:

1. **Proxies over class instances.** Vue 2 only made plain objects and arrays reactive. Vue 3's `reactive()` also wraps
   class instances, for example `@nimiq/core` objects, ethers `BigNumber`, bitcoinjs objects stored in Pinia state.
   This breaks `===` comparisons with the raw object, `Map`/`Set` lookups and classes with `#private` fields. Such
   values should be stored with `markRaw()` or in `shallowRef()`; `markRaw` already exists in 2.7.
2. **Array watchers.** In Vue 3, `watch(arrayRef, …)` only fires when the array is replaced, not on in-place mutation,
   unless `deep: true` is set. All ~154 `watch(` calls need a review.
3. **`false` attribute values.** On non-boolean attributes (`aria-*`, `data-*`, `draggable`, …), `false` is now
   rendered as `"false"` instead of removing the attribute.
4. **Teleport and tooltips.** Tooltip positioning relies on container components and their `$el`; Teleport changes the
   DOM position of modals.
5. **Virtual scroller fork.** The fork's changes are not documented in this repo and must be identified first.
6. **i18n message syntax.** vue-i18n 9+ compiles messages with a stricter syntax (`@`, `|`, `{`, `}` have meaning).
   All 797 msgids and their translations must compile.

## Phase 0: preparation on Vue 2.7

Each item is a separate PR that ships on its own and must not change look or behavior. Order is flexible; the
mechanical ones can be done by script.

1. **Template syntax:** `slot=` → `#x`, functional icons → plain templates, `filters` → function,
   `defineAsyncComponent` for the 3 lazy components.
2. **Style syntax:** `::v-deep` / `>>>` → `:deep()`; transition rules get both the Vue 2 and the Vue 3 class names.
3. **`emits`:** declare emitted events on all components. On 2.7 this only affects typing, so it is safe.
4. **`v-model`:** switch the 10 custom `v-model` components to `modelValue` / `update:modelValue` via the `model`
   option.
5. **Router composables:** vue-router 3.5 → 3.6 and replace the custom `provideRouter`/`useRouter` with
   `useRouter`/`useRoute` from `vue-router/composables`. In Phase 1 only the import path changes.
6. **Vue-2-only libraries:** replace `@adapttive/vue-markdown` (markdown library + sanitized `v-html`) and
   `v-click-outside` (own directive that defines both Vue 2 and Vue 3 hook names, or VueUse).
7. **Tooltip:** accept an element (or a template ref) as container instead of a component instance, remove `$parent`
   from callers and the `hook:mounted` events.
8. **Reactivity hardening:** `markRaw()` / `shallowRef()` for class instances in stores; review array watchers and add
   `deep: true` where in-place mutation must trigger.
9. **i18n message test:** a Vitest test that compiles every message of every `.po` file with vue-i18n's message
   compiler (`@intlify/message-compiler` as a dev dependency), and fixes for the messages it rejects.
10. **`$config`:** replace the global with `useConfig()` in `App.vue`.
11. **Virtual scroller fork:** diff `sisou/vue-virtual-scroller#nimiq/build` against upstream 1.0.10 and document
    which changes the wallet depends on, so they can be carried over to v2 (or upstreamed).

## Phase 1: the switch branch

Done in one branch, in this order, until `vp check`, `yarn typecheck` and `vp test` pass:

1. Dependencies: `vue` 3.5+, `@vitejs/plugin-vue`, `vue-router` 4+, `vue-i18n` (latest), `vue-virtual-scroller` v2
   (plus the fork's changes), remove `@linusborg/vue-simple-portal` and `@vitejs/plugin-vue2`.
2. Bootstrap: `createApp(App)` with `app.use(router / i18n / pinia / matomo)`; Sentry `init({ app })`.
3. Router: `createRouter` + `createWebHistory`, type renames, `vue-router/composables` → `vue-router`,
   `<router-view v-slot>` for the 4 `keep-alive` places, check guards that rely on `next()`.
4. i18n: `createI18n` (Composition mode with `globalInjection` so templates keep `$t`); reimplement
   `src/lib/useI18n.ts` on top of vue-i18n's `useI18n` (keeping the `$t` name keeps the extractor's keyword list
   valid) and drop `provideI18n`; `$tc` → `$t`; `<i18n path>` → `<i18n-t keypath>`.
5. Mechanical removals: `Vue.set`/`Vue.delete`, `.native`, `$listeners`.
6. `<Portal>` → `<Teleport>`; virtual scroller v2 API.
7. Render functions, directive hooks, `<template v-for>` keys, types (`shims-vue.d.ts`, module augmentation, `Vue`
   type uses).
8. Audit items from the code changes table (`v-if`/`v-for`, `$attrs` order and `class`/`style`).

Optional: run the switched app once with `@vue/compat` in warning mode as a detector for runtime behavior changes that
grep cannot find (`ATTR_FALSE_VALUE`, `WATCH_ARRAY`, `INSTANCE_LISTENERS`, `TRANSITION_CLASSES`,
`COMPONENT_V_MODEL`). It is used as a diagnostic only, not shipped.

## Phase 2: verification

- **Before/after comparison:** production builds of the baseline and the switch branch served with `vp preview` on two
  ports. Playwright seeds IndexedDB after a first load, then dumps DOM, computed styles, element rects and screenshots
  per route. Chromium is launched with `--host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE localhost"`, because
  `context.route` does not catch the Nimiq client's WebSockets and live network data makes runs incomparable (check
  that the app shows 0 peers). Normalize scoped-style hashes, and Vue 3's `<!--v-if-->` placeholder comments and
  fragment anchors in the DOM diff.
- **Manual checks** for what the diff cannot cover: tooltips (hover, positioning, containers), all modals (Teleport,
  transitions, keep-alive state), virtual-scrolled transaction lists (scrolling, loading more), forms with custom
  `v-model`, language switching, swaps and Hub redirects.
- **Error monitoring:** watch Sentry closely after the release.

## Follow-ups (after the switch)

- Pinia 3.
- vue-tsc 3.
- Optionally convert components to `<script setup>`; not required for the migration.

## Alternatives considered

**Official migration build (`@vue/compat`) as the main path.** The migration build runs Vue 2 code on Vue 3 and lets
you fix deprecations one by one. It helps most for Options API code and global API usage, which this code base no
longer has. It does not shim vue-router 3, vue-i18n 8 or Vue-2-only third-party components, so those would still
have to switch at once, and it adds its own configuration and a second migration step. It is therefore only used as an
optional diagnostic in Phase 1.

**Big bang without Phase 0.** Possible, but it puts several hundred mechanical edits and the risky behavioral changes
into one hard-to-review diff, and a regression could not be attributed to a cause easily.

## Open questions

- Which markdown library to use for release notes, and how to sanitize its output.
- What the `nimiq/build` branch of the virtual scroller fork changes, and whether those changes exist upstream in v2.
- Whether to keep `$t`/`$tc`-style names in `src/lib/useI18n.ts` or move to vue-i18n's `t`; the latter requires
  adding `t` to the extractor's keywords in `webpack-i18n-tools`.
