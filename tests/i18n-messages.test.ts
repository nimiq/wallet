// Compiles every message of every language with the message compiler of vue-i18n 9 and newer, which the Vue 3 version
// of the Wallet will use. Its syntax is stricter than vue-i18n 8's, for example for @, |, { and }. The .po files are
// loaded through the same po-loader plugin as in the app, so messages fall back to their msgid like there.
import { baseCompile } from '@intlify/message-compiler';
import { expect, test } from 'vite-plus/test';

const languages = import.meta.glob<{ default: Record<string, string> }>('../src/i18n/*.po', { eager: true });

test('all languages are checked', () => {
    expect(Object.keys(languages).length).toBeGreaterThan(1);
});

test.each(Object.entries(languages))(
    '%s compiles with the vue-i18n 9+ message compiler',
    (_, { default: messages }) => {
        const failures: string[] = [];
        for (const [key, message] of Object.entries(messages)) {
            baseCompile(message, {
                onError: (error) => failures.push(`${JSON.stringify(key)}: ${error.message}`),
            });
        }
        expect(failures).toEqual([]);
    },
);
