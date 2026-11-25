// Oxlint plugin providing the core rules of ESLint that Oxlint does not implement natively or not equivalently, like
// ESLint's (deprecated) formatting rules. They are used by the ported airbnb config, see ./presets.ts, with names
// prefixed by eslint-js/.
import { builtinRules } from 'eslint/use-at-your-own-risk';

const ruleNames = [
    'array-bracket-spacing', 'arrow-parens', 'arrow-spacing', 'block-spacing', 'brace-style', 'camelcase',
    'comma-dangle', 'comma-spacing', 'comma-style', 'computed-property-spacing', 'dot-location', 'eol-last',
    'func-call-spacing', 'function-call-argument-newline', 'function-paren-newline', 'generator-star-spacing',
    'implicit-arrow-linebreak', 'indent', 'key-spacing', 'keyword-spacing', 'linebreak-style',
    'lines-between-class-members', 'max-len', 'new-parens', 'newline-per-chained-call', 'no-confusing-arrow',
    'no-extra-semi', 'no-floating-decimal', 'no-inner-declarations', 'no-mixed-operators',
    'no-mixed-spaces-and-tabs', 'no-multi-spaces', 'no-multiple-empty-lines', 'no-restricted-syntax', 'no-tabs',
    'no-trailing-spaces', 'no-undef-init', 'no-whitespace-before-property', 'nonblock-statement-body-position',
    'object-curly-newline', 'object-curly-spacing', 'object-property-newline', 'one-var-declaration-per-line',
    'operator-linebreak', 'padded-blocks', 'prefer-const', 'quote-props', 'quotes', 'rest-spread-spacing', 'semi',
    'semi-spacing', 'semi-style', 'space-before-blocks', 'space-before-function-paren', 'space-in-parens',
    'space-infix-ops', 'space-unary-ops', 'spaced-comment', 'switch-colon-spacing', 'template-curly-spacing',
    'template-tag-spacing', 'wrap-iife', 'yield-star-spacing',
];

export default {
    meta: { name: 'eslint-js' },
    rules: Object.fromEntries(ruleNames.map((ruleName) => [ruleName, builtinRules.get(ruleName)])),
};
