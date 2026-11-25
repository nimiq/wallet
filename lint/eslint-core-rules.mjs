// Oxlint plugin providing the core rules of ESLint that Oxlint does not implement natively or not equivalently. They
// are used by the ported airbnb config, see ./presets.ts, with names prefixed by eslint-js/.
import { builtinRules } from 'eslint/use-at-your-own-risk';

const ruleNames = ['camelcase', 'no-inner-declarations', 'no-restricted-syntax', 'no-undef-init', 'prefer-const'];

export default {
    meta: { name: 'eslint-js' },
    rules: Object.fromEntries(ruleNames.map((ruleName) => [ruleName, builtinRules.get(ruleName)])),
};
