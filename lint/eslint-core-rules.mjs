// Oxlint plugin providing the core rules of ESLint that Oxlint does not implement natively or not equivalently. They
// are used by the ported airbnb config, see ./presets.ts, with names prefixed by eslint-js/. Oxlint does not implement
// camelcase, no-restricted-syntax and no-undef-init, and its prefer-const does not lint Vue files.
import { builtinRules } from 'eslint/use-at-your-own-risk';

const ruleNames = ['camelcase', 'no-restricted-syntax', 'no-undef-init', 'prefer-const'];

export default {
    meta: { name: 'eslint-js' },
    rules: Object.fromEntries(ruleNames.map((ruleName) => [ruleName, builtinRules.get(ruleName)])),
};
