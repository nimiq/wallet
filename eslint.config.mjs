import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility';
import globals from 'globals';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));

// The Airbnb config does not support flat configs yet, therefore it's loaded via the compatibility layer.
const compat = new FlatCompat({ baseDirectory: dirname });

const airbnbStyle = require('eslint-config-airbnb-base/rules/style');
// Do not restrict usage of for...of
const noRestrictedSyntax = airbnbStyle.rules['no-restricted-syntax']
    .slice(1)
    .filter((r) => r.selector !== 'ForOfStatement');

export default defineConfigWithVueTs(
    {
        // deployment-wallet/ is the checkout of the deployment repository, made by scripts/deploy.sh.
        ignores: ['dist/', 'deployment-wallet/', 'public/', 'scripts/', 'types/', 'vue.config.js'],
    },
    pluginVue.configs['flat/vue2-essential'],
    ...compat.extends('airbnb-base'),
    ...pluginVueA11y.configs['flat/recommended'],
    vueTsConfigs.recommended,
    {
        // Equivalent of the former @vue/eslint-config-airbnb, which adapted the Airbnb config to Vue CLI projects.
        settings: {
            'import/resolver': {
                node: {},
                webpack: { config: require.resolve('@vue/cli-service/webpack.config.js') },
            },
            'import/extensions': ['.js', '.jsx', '.mjs', '.ts', '.tsx'],
        },
        rules: {
            'import/extensions': ['error', 'always', {
                js: 'never',
                mjs: 'never',
                jsx: 'never',
                ts: 'never',
                tsx: 'never',
            }],
            'vuejs-accessibility/no-onchange': 'off',
        },
    },
    {
        plugins: {
            '@stylistic': stylistic,
        },
        languageOptions: {
            ecmaVersion: 2020,
            parserOptions: {
                // Set by the Airbnb config's Node.js environment. Not applicable to ES modules, and breaks the
                // resolution of variables in Vue templates, for example of v-for.
                ecmaFeatures: { globalReturn: false },
            },
            globals: {
                ...globals.browser,
                ...globals.es2015,
            },
        },
        rules: {
            'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
            'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
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

            'vuejs-accessibility/click-events-have-key-events': 'off',
            // Added to the recommended rules in eslint-plugin-vuejs-accessibility 2. Disabled for now, as fixing the
            // existing violations requires changes to the markup and interactions of the affected components.
            'vuejs-accessibility/no-static-element-interactions': 'off',
            'vuejs-accessibility/form-control-has-label': 'off',
            'vuejs-accessibility/label-has-for': 'off',
            'vue/multi-word-component-names': 'off',

            '@stylistic/member-delimiter-style': ['error', {
                overrides: { typeLiteral: { multiline: { delimiter: 'comma' }, singleline: { delimiter: 'comma' } } },
            }],
            '@typescript-eslint/no-explicit-any': 'off',
            // As in typescript-eslint's recommended config before version 8.
            '@typescript-eslint/no-unused-vars': ['warn', { caughtErrors: 'none' }],
            '@typescript-eslint/no-non-null-assertion': 'off',
            // Do not require explicit function return value typings
            '@typescript-eslint/explicit-module-boundary-types': 'off',

            'no-useless-constructor': 'off',
            '@typescript-eslint/no-useless-constructor': 'error',

            'no-shadow': 'off',
            '@typescript-eslint/no-shadow': 'error',

            'no-use-before-define': 'off',
            '@typescript-eslint/no-use-before-define': 'off',

            // False positives that are checked by TS
            'no-redeclare': 'off',
        },
    },
    {
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
    {
        files: ['**/shims-tsx.d.ts'],
        rules: {
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
    {
        // In plain CommonJS modules, `import foo = require('foo')` can't be used instead.
        files: ['**/*.js', '**/*.cjs'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        files: ['*.js', '*.mjs'],
        rules: {
            // Configuration files at the project root can use the dev dependencies.
            'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        },
    },
);
