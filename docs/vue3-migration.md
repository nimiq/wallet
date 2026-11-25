# Vue 3 migration plan

- **Status:** Phase 0 in progress on branch `claude/vue3-phase0` (see [Phase 0 progress](#phase-0-progress)).
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

| Dependency                                                                                                | Target                                        | Affected code                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vue` 2.7                                                                                                 | Vue 3.5 (3.5.46 on 2026-11-25)                | everything                                                                                                                                                                                                                           |
| `@vitejs/plugin-vue2`                                                                                     | `@vitejs/plugin-vue`                          | `vite.config.ts`                                                                                                                                                                                                                     |
| `vue-router` 3.6                                                                                          | 4 or 5 (5.5.1 on 2026-11-25)                  | `src/router.ts` (`new VueRouter`, `Route`, `RouteConfig`, `NavigationGuardNext`); `useRouter` from `vue-router/composables` in 38 files; `router.currentRoute` (20 uses) becomes a ref; `<keep-alive>` + `<router-view>` in 4 places |
| `vue-i18n` 8                                                                                              | 11 (11.4.23 on 2026-11-25)                    | `src/i18n/i18n-setup.ts` (`new VueI18n`, `i18n.missing`); the wrapper in `src/lib/useI18n.ts` and its `provideI18n` call in `App.vue`; 11 `$tc` calls; 78 `<i18n path>` tags in 29 files                                             |
| `@linusborg/vue-simple-portal`                                                                            | built-in `<Teleport>`                         | 5 files                                                                                                                                                                                                                              |
| `vue-virtual-scroller` (fork `sisou/vue-virtual-scroller#nimiq/build`, commit `8e03a14`, based on 1.0.10) | upstream `^2.0.1` or 3.0.5, no fork           | `RecycleScroller` in 5 files; `scrollToPosition(0, true)` → `scrollToPosition(0, { smooth: true })` (see [findings](#phase-0-findings))                                                                                              |
| `v-click-outside` (Vue 2 only)                                                                            | done in Phase 0: `directives/ClickOutside.ts` | `CountrySelector.vue`; hook names change in Phase 1                                                                                                                                                                                  |
| `@adapttive/vue-markdown` (Vue 2 only)                                                                    | done in Phase 0: markdown-it + `v-html`       | `ReleaseNotesModal.vue`, `lib/Markdown.ts`                                                                                                                                                                                           |

### Code changes

| Change                                                                                                                                                                                                                             | Count                                                            | Phase |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----- |
| `slot="x"` / `slot-scope` → `#x` / `v-slot`. Mostly on `<div>`/`<span>`/`<a>`, which need a `<template #x>` wrapper; many are inside `<i18n>`                                                                                      | 176 in 43 files                                                  | 0     |
| `::v-deep` / `>>>` → `:deep()` (Vue 2.7's SFC compiler supports `:deep()`)                                                                                                                                                         | 403                                                              | 0     |
| `<template functional>` → plain template (icons). Done for 79; CircleSpinner, ShieldIcon, TriangleDownIcon, AnimatedLeafIcon and WorldIcon need an audit first (see [findings](#phase-0-findings))                                 | 84 files                                                         | 0     |
| Declare `emits` on every component that emits. Vue 3 adds undeclared listeners to `$attrs`, so an emitted `click`/`input`/`change` also binds as a native listener on the root element and fires twice. Vue 2.7 accepts the option | ~63 files                                                        | 0     |
| Transition classes `-enter` / `-leave` → `-enter-from` / `-leave-from`. In Phase 0, write both selectors                                                                                                                           | ~45 rules in 18 files                                            | 0     |
| Custom `v-model`: `value` prop + `input` event → `modelValue` + `update:modelValue`. In Phase 0 via the `model: { prop, event }` option                                                                                            | 10 components                                                    | 0     |
| `filters` → plain function (`formatIntoGroups`)                                                                                                                                                                                    | 1 component, 2 uses                                              | 0     |
| `() => import('…vue')` in `components:` → `defineAsyncComponent` (exported by Vue 2.7)                                                                                                                                             | 3 (`FlaggedAddressWarning`)                                      | 0     |
| Tooltip: `$parent` passed as container (`Sidebar.vue`, `StakingButton.vue`), `$once('hook:mounted')` (removed in Vue 3), reliance on a component's `$el` (a text node for multi-root components in Vue 3)                          | 3 files                                                          | 0     |
| `Vue.prototype.$config` → `app.config.globalProperties.$config`, and its type augmentation → `ComponentCustomProperties` (`$config` is used in 17 templates)                                                                       | `main.ts`                                                        | 1     |
| `Vue.set` / `Vue.delete` → plain assignment / `delete`. Still needed on 2.7 to add keys reactively                                                                                                                                 | 31 in 6 stores                                                   | 1     |
| `.native` modifier → remove (requires `emits` from Phase 0)                                                                                                                                                                        | ~25 in 16 files                                                  | 1     |
| `$listeners` → remove (merged into `$attrs` in Vue 3); `v-on="$listeners"` lines go away                                                                                                                                           | 45 in 44 files (incl. 24 icons from Phase 0)                     | 1     |
| Remove the `model: { prop: 'modelValue', event: 'update:modelValue' }` options added in Phase 0                                                                                                                                    | 10                                                               | 1     |
| `$tc(key, n)` → `$t(key, n)` (vue-i18n 8's `$t` does not pluralize; `$tc` is removed in v11)                                                                                                                                       | 11                                                               | 1     |
| `<i18n path>` → `<i18n-t keypath>` (slot syntax already converted in Phase 0)                                                                                                                                                      | 78 in 29 files                                                   | 1     |
| `<transition><keep-alive><router-view/></keep-alive></transition>` → `<router-view v-slot="{ Component }">` form                                                                                                                   | 4                                                                | 1     |
| App bootstrap: `new Vue`, `Vue.use` ×6, `Vue.config`, `Vue.prototype` → `createApp` / `app.use`                                                                                                                                    | `main.ts`, `pinia.ts`, `router.ts`, `i18n-setup.ts`, `matomo.ts` | 1     |
| Render functions: `createElement(c, { props })` → `h(c, props)` (`createWarningModal`, `main.ts`)                                                                                                                                  | 2                                                                | 1     |
| Directive hooks `bind`/`unbind` → `beforeMount`/`unmounted`; `DirectiveOptions` → `Directive`                                                                                                                                      | `directives/PointerEvents.ts`, `directives/ClickOutside.ts`      | 1     |
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
5. **Virtual scroller.** Resolved: the fork's changes exist upstream (see [findings](#phase-0-findings)). The CSS
   overrides on `.vue-recycle-scroller` and `scroller.$el` still need a runtime check against the v2/v3 DOM.
6. **i18n message syntax.** vue-i18n 9+ compiles messages with a stricter syntax (`@`, `|`, `{`, `}` have meaning).
   `tests/i18n-messages.test.ts` now compiles all messages of all languages; all pass.
7. **i18n keys are sentences.** vue-i18n 9+ first resolves a key as a dot path, then falls back to the flat key, so
   keys like `'Click on {icon} in the URL bar.'` work but take a detour on every lookup. To verify in Phase 1; a
   `messageResolver` that looks up the flat key directly avoids it.

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
10. ~~**`$config`:** replace the global with `useConfig()` in `App.vue`.~~ Dropped: `$config` is used in 17 templates,
    and Vue 3 supports the same pattern via `app.config.globalProperties`, so this moves to Phase 1.
11. **Virtual scroller fork:** diff `sisou/vue-virtual-scroller#nimiq/build` against upstream 1.0.10 and document
    which changes the wallet depends on, so they can be carried over to v2 (or upstreamed).

### Phase 0 progress

Branch `claude/vue3-phase0`, one commit per step (they can be split into separate PRs). Every commit passes
`vp check`, `yarn typecheck` and `vp test`.

| Step                                     | Status               | Verification                                                                                                                            |
| ---------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2. `:deep()`                             | done                 | Compiled CSS identical, except 4 selectors in InteractiveShortAddress where the scope attribute moves within the same compound selector |
| 2. Transition class names                | done                 | CSS diff: only the added `-enter-from` / `-leave-from` selectors                                                                        |
| 1. Functional templates                  | 79 of 84 done        | Runtime comparison (see below)                                                                                                          |
| 1. `slot=` → `v-slot`                    | done (116 groups)    | Runtime comparison                                                                                                                      |
| 1. `filters`, `defineAsyncComponent`     | done                 | Typecheck                                                                                                                               |
| 3. `emits`                               | done (63 components) | Runtime no-op in 2.7 (the runtime has no `emits` handling); typecheck                                                                   |
| 4. `v-model`                             | done (10 components) | Runtime comparison incl. interactions (typing an address, search, ButtonGroup, StablecoinSelector)                                      |
| 5. Router composables                    | done                 | Runtime comparison                                                                                                                      |
| 6. Vue-2-only libraries                  | done                 | ClickOutside tested in Chromium; markdown output compared with the old component on a sample using all plugins                          |
| 9. i18n message test                     | done                 | Found and fixed 2 broken Russian placeholders                                                                                           |
| 11. Virtual scroller fork                | analysed             | See findings                                                                                                                            |
| 7. Tooltip                               | open                 |                                                                                                                                         |
| 8. Reactivity hardening                  | open                 |                                                                                                                                         |
| 1. The 5 remaining functional components | open                 | Needs the audit described in the findings                                                                                               |

Runtime comparison: production builds of the baseline and the branch, compared with the Phase 2 harness on 42 routes
(desktop and mobile). The only differences were random radio-group ids.

### Phase 0 findings

- **Functional components with own scoped styles.** As a functional component, CircleSpinner (28 users), ShieldIcon,
  TriangleDownIcon, AnimatedLeafIcon and WorldIcon only get their own scope id. As regular components (and in Vue 3
  anyway), their root also gets the parent's scope id, so parent rules such as `svg { … }` or `.shield-icon { … }`
  start to match; there are about 70 such candidate rules. Each one needs a check whether it changes the look, and
  where it does, the selector needs to exclude the component (or the change is accepted).
- **BackupModal.** Vue 2 drops the class of functional components that do not forward it, so `class="option-icon"` on
  MessagesIcon and WordsIcon never applied. The class and its rule were removed to keep the look.
- **BtcTransactionModal.** The OASIS payout status (the `v-if` of the chain in PageHeader) has no `slot="more"` and
  renders into PageHeader's default slot, while the other states render into `more`. The other transaction modals put
  it into `more`, so this is probably a bug. The slot conversion keeps the current behavior.
- **Russian translations.** `Cashlink from {address}` and `Cashlink to {address}` were translated with the placeholder
  `{адрес}`, which renders as empty. Fixed in `ru.po`; the fix also needs to go to Transifex, or the next pull reverts
  it (the new test would then fail).
- **Virtual scroller fork.** `nimiq/build` is upstream v1.0.10 plus two changes, both of which the wallet uses:
  `6489446` takes the `#before` slot height into account for the scroll offset (used by the pending Cashlinks list in
  TransactionList), and `73dbd49` adds a `smooth` flag to `scrollToPosition`. Upstream has the first since v1.1.0 and
  the second since v2.0.0 as `scrollToPosition(position, { smooth: true })`; a bare `true` is ignored there. So the
  fork is not needed: use upstream `^2.0.1` (requires Vue ^3.5) or 3.0.5, and change the one `scrollToPosition(0, true)`
  call. The old `next` tag (2.0.0-beta.8) has neither change. v2 ships its own types.
- **Harness.** The comparison scripts live outside the repo so far. Worth committing as a script for Phase 2.

## Phase 1: the switch branch

Done in one branch, in this order, until `vp check`, `yarn typecheck` and `vp test` pass:

1. Dependencies: `vue` 3.5, `@vitejs/plugin-vue`, `vue-router` 4 or 5, `vue-i18n` 11, upstream `vue-virtual-scroller`
   `^2.0.1` (no fork), remove `@linusborg/vue-simple-portal` and `@vitejs/plugin-vue2`.
2. Bootstrap: `createApp(App)` with `app.use(router / i18n / pinia / matomo)`; Sentry `init({ app })`;
   `app.config.globalProperties.$config`.
3. Router: `createRouter` + `createWebHistory`, type renames, `vue-router/composables` → `vue-router`,
   `<router-view v-slot>` for the 4 `keep-alive` places, check guards that rely on `next()`.
4. i18n: `createI18n` (Composition mode with `globalInjection` so templates keep `$t`); reimplement
   `src/lib/useI18n.ts` on top of vue-i18n's `useI18n` (keeping the `$t` name keeps the extractor's keyword list
   valid) and drop `provideI18n`; `$tc` → `$t`; `<i18n path>` → `<i18n-t keypath>`.
5. Mechanical removals: `Vue.set`/`Vue.delete`, `.native`, `$listeners`, the `model` options, the Vue 2 transition
   class names.
6. `<Portal>` → `<Teleport>`; virtual scroller v2 API (`scrollToPosition(0, { smooth: true })`).
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

- Pinia 3 or 4 (4.1.0 on 2026-11-25).
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

- Whether to sanitize the release notes HTML. markdown-it runs with `html: true`, as the old component did; the notes
  come from our own release notes site.
- vue-router 4 or 5.
- Whether the BtcTransactionModal payout status should move into the `more` slot (see findings).
- Whether to keep `$t`/`$tc`-style names in `src/lib/useI18n.ts` or move to vue-i18n's `t`; the latter requires
  adding `t` to the extractor's keywords in `webpack-i18n-tools`.
