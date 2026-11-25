import { watch } from 'vue';
import { storeToRefs } from 'pinia';
// The package's exports field requires the .js file extension.
// eslint-disable-next-line import/extensions
import { shouldPolyfill as shouldPolyFillIntlDisplayNames } from '@formatjs/intl-displaynames/should-polyfill.js';

import type {
    DisplayNames as IntlDisplayNames,
    DisplayNamesOptions as IntlDisplayNamesOptions,
} from '@formatjs/intl-displaynames';

import { useSettingsStore } from '../stores/Settings';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Intl {
    // oxlint-disable-next-line typescript/no-unused-vars -- false positive for this ambient declaration
    let DisplayNames: undefined | {
        new (
            locales?: string | string[],
            options?: IntlDisplayNamesOptions,
        ): IntlDisplayNames,

        readonly polyfilled?: true,
    };
}

/* eslint-disable import/extensions */
const intlDisplayNamesReadyPromise = !Intl.DisplayNames?.polyfilled && shouldPolyFillIntlDisplayNames()
    ? import('@formatjs/intl-displaynames/polyfill.js')
    : Promise.resolve();

// Polyfill locale data for the languages supported by the Wallet, see i18n-setup.ts.
const polyfillLocaleData: Record<string, () => Promise<unknown>> = {
    en: () => import('@formatjs/intl-displaynames/locale-data/en.js'),
    es: () => import('@formatjs/intl-displaynames/locale-data/es.js'),
    zh: () => import('@formatjs/intl-displaynames/locale-data/zh.js'),
    de: () => import('@formatjs/intl-displaynames/locale-data/de.js'),
    fr: () => import('@formatjs/intl-displaynames/locale-data/fr.js'),
    pt: () => import('@formatjs/intl-displaynames/locale-data/pt.js'),
    ru: () => import('@formatjs/intl-displaynames/locale-data/ru.js'),
    uk: () => import('@formatjs/intl-displaynames/locale-data/uk.js'),
    nl: () => import('@formatjs/intl-displaynames/locale-data/nl.js'),
};
/* eslint-enable import/extensions */

const { language } = storeToRefs(useSettingsStore());

export default class I18nDisplayNames {
    private intlDisplayNames: IntlDisplayNames | null = null;
    private type: 'region' | 'language' | 'currency';

    constructor(type: 'region' | 'language' | 'currency') {
        this.type = type;

        watch(language, this.updateIntlDisplayNames.bind(this), { immediate: true });
        this.updateIntlDisplayNames();
    }

    private async updateIntlDisplayNames() {
        // TODO polyfill can be removed in the future and i18nCountryName then changed to a non-async computed prop
        await intlDisplayNamesReadyPromise;
        if (Intl.DisplayNames!.polyfilled) {
            // has to be imported after the polyfill is ready
            await polyfillLocaleData[language.value]?.();
        }
        this.intlDisplayNames = new Intl.DisplayNames!(language.value, { type: this.type });
    }

    public of(code: string) {
        if (!this.intlDisplayNames) return code;
        return this.intlDisplayNames.of(code);
    }
}
