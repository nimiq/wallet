import { watch } from 'vue';
import { shouldPolyfill as shouldPolyFillIntlDisplayNames } from '@formatjs/intl-displaynames/should-polyfill';

import type {
    DisplayNames as IntlDisplayNames,
    DisplayNamesOptions as IntlDisplayNamesOptions,
} from '@formatjs/intl-displaynames';

import { useSettingsStore } from '../stores/Settings';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Intl {
    let DisplayNames: undefined | {
        new (
            locales?: string | string[],
            options?: IntlDisplayNamesOptions,
        ): IntlDisplayNames,

        readonly polyfilled?: true,
    };
}

const intlDisplayNamesReadyPromise = !Intl.DisplayNames?.polyfilled && shouldPolyFillIntlDisplayNames()
    ? import('@formatjs/intl-displaynames/polyfill')
    : Promise.resolve();

const { language } = useSettingsStore();

export default class I18nDisplayNames {
    private intlDisplayNames: IntlDisplayNames | null = null;
    private type: 'region' | 'language' | 'currency';

    constructor(type: 'region' | 'language' | 'currency') {
        this.type = type;

        watch(language, this.updateIntlDisplayNames.bind(this));
        this.updateIntlDisplayNames();
    }

    private async updateIntlDisplayNames() {
        // TODO polyfill can be removed in the future and i18nCountryName then changed to a non-async computed prop
        await intlDisplayNamesReadyPromise;
        if (Intl.DisplayNames!.polyfilled) {
            // has to be imported after the polyfill is ready
            await import(
                /* webpackChunkName: "country-names-[request]" */
                /* webpackInclude: /\/\w{2}\.js$/ */
                `@formatjs/intl-displaynames/locale-data/${language.value}`);
        }
        this.intlDisplayNames = new Intl.DisplayNames!(language.value, { type: this.type });
    }

    public of(code: string) {
        if (!this.intlDisplayNames) return code;
        return this.intlDisplayNames.of(code);
    }
}
