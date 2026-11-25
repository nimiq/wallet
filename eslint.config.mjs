// ESLint is only used for what Oxlint can not lint yet: the templates of Vue single file components, including their
// accessibility, and rules which check the lines of entire Vue files. Everything else, including the scripts of the
// components, is linted by Oxlint via vp lint, see the lint config in vite.config.ts.
import tsParser from '@typescript-eslint/parser';
import pluginVue from 'eslint-plugin-vue';
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility';

const vueFiles = ['**/*.vue'];

// Rules of eslint-plugin-vue's vue2-essential config that Oxlint implements natively, and which are therefore linted by
// Oxlint, see lint/presets.ts.
const vueRulesLintedByOxlint = [
    'vue/no-arrow-functions-in-watch',
    'vue/no-async-in-computed-properties',
    'vue/no-computed-properties-in-data',
    'vue/no-dupe-keys',
    'vue/no-export-in-script-setup',
    'vue/no-reserved-component-names',
    'vue/no-reserved-keys',
    'vue/no-reserved-props',
    'vue/no-shared-component-data',
    'vue/no-side-effects-in-computed-properties',
    'vue/require-prop-type-constructor',
    'vue/require-render-return',
    'vue/return-in-computed-property',
    'vue/return-in-emits-validator',
    'vue/valid-define-emits',
    'vue/valid-define-props',
    'vue/valid-next-tick',
];

export default [
    {
        // deployment-wallet/ is the checkout of the deployment repository, made by scripts/deploy.sh.
        ignores: ['dist/', 'deployment-wallet/', 'public/'],
    },
    ...[
        ...pluginVue.configs['flat/vue2-essential'],
        ...pluginVueA11y.configs['flat/recommended'],
    ].map((config) => ({ ...config, files: vueFiles })),
    {
        files: vueFiles,
        linterOptions: {
            // Disable directives in the scripts are typically meant for Oxlint.
            reportUnusedDisableDirectives: 'off',
        },
        languageOptions: {
            ecmaVersion: 2020,
            parserOptions: {
                parser: tsParser,
            },
        },
        rules: {
            ...Object.fromEntries(vueRulesLintedByOxlint.map((rule) => [rule, 'off'])),
            // Rules which check the lines of the entire file, including the templates and styles. Oxlint, which only
            // lints the scripts of Vue files, applies them to all other files.
            'eol-last': ['error', 'always'],
            'linebreak-style': ['error', 'unix'],
            'max-len': ['error', 120],
            'no-irregular-whitespace': 'error',
            'no-mixed-spaces-and-tabs': 'error',
            'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
            'no-tabs': 'error',
            'no-trailing-spaces': ['error', { skipBlankLines: false, ignoreComments: false }],
            'unicode-bom': ['error', 'never'],
            'vue/multi-word-component-names': 'off',
            'vuejs-accessibility/no-onchange': 'off',
            'vuejs-accessibility/click-events-have-key-events': 'off',
            // Added to the recommended rules in eslint-plugin-vuejs-accessibility 2. Disabled for now, as fixing the
            // existing violations requires changes to the markup and interactions of the affected components.
            'vuejs-accessibility/no-static-element-interactions': 'off',
            'vuejs-accessibility/form-control-has-label': 'off',
            'vuejs-accessibility/label-has-for': 'off',
        },
    },
    {
        files: ['src/components/icons/**/*', 'src/components/Avatar.vue'],
        rules: {
            'max-len': 'off',
        },
    },
];
