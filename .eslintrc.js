// eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-extraneous-dependencies
const airbnb = require('eslint-config-airbnb-base/rules/style');
// Do not restrict usage of for...of
const noRestrictedSyntax = airbnb.rules['no-restricted-syntax'].slice(1).filter((r) => r.selector !== 'ForOfStatement');
const memberDelimiterStyleOverrides = {
    overrides: { typeLiteral: { multiline: { delimiter: 'comma' }, singleline: { delimiter: 'comma' } } },
};
module.exports = {
    env: {
        browser: true,
        es6: true,
    },
    extends: [
        'plugin:vue/essential',
        '@vue/airbnb',
        '@vue/typescript/recommended',
    ],
    parserOptions: {
        ecmaVersion: 2020,
    },
    root: true,
    rules: {
        'no-console': 'error',
        'no-debugger': 'error',
        'function-paren-newline': 'off',
        indent: ['error', 4, { SwitchCase: 1 }],
        'max-len': ['error', 120],
        'no-underscore-dangle': 'off',
        'no-param-reassign': 'off',
        'no-plusplus': 'off',
        'no-continue': 'off',
        'no-confusing-arrow': 'off',
        'no-floating-decimal': 'off',
        'no-return-assign': 'off',
        'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        'import/prefer-default-export': 'off',
        'import/no-cycle': 'off',
        'implicit-arrow-linebreak': 'off',
        'object-curly-newline': ['error', { ObjectPattern: { multiline: true } }],
        'prefer-const': ['error', { destructuring: 'all' }],
        'no-nested-ternary': 'off',
        'no-restricted-syntax': ['error', ...noRestrictedSyntax],

        '@typescript-eslint/member-delimiter-style': ['error', memberDelimiterStyleOverrides],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off', // Do not require explicit function return value typings

        'no-useless-constructor': 'off',
        '@typescript-eslint/no-useless-constructor': 'error',

        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',

        'no-use-before-define': 'off',
        '@typescript-eslint/no-use-before-define': 'off',

        // False positives that are checked by TS
        // 'no-redeclare': 'off',
        // 'no-param-reassign': 'off',
        // 'import/no-unresolved': 'off',
    },
    overrides: [{
            files: ['src/components/icons/**/*', 'src/components/Avatar.vue'],
            rules: {
                'max-len': 'off',
            },
        },
        {
            files: ['src/lib/NetworkMap.ts'],
            rules: {
                'max-classes-per-file': 'off',
            },
        },
    ],
};
