import { createStore } from 'pinia';
import { Currencies } from './Fiat';
import { autodetectLanguage } from '../i18n/i18n-setup';

export enum ColorMode {
    default = 'default',
    dark = 'dark',
}

export type SettingsState = {
    showDecimals: boolean,
    currency: Currencies,
    language: string, // locale
    colorMode: ColorMode,
};

export const useSettingsStore = createStore({
    id: 'settings',
    state: (): SettingsState => ({
        showDecimals: false,
        currency: Currencies.USD,
        language: autodetectLanguage(),
        colorMode: ColorMode.default,
    }),
    getters: {
        showDecimals: (state): Readonly<boolean> => state.showDecimals,
        currency: (state): Readonly<Currencies> => state.currency,
        language: (state): Readonly<string> => state.language,
        colorMode: (state): Readonly<ColorMode> => state.colorMode,
    },
    actions: {
        setShowDecimals(show?: boolean) {
            this.state.showDecimals = show || false;
        },
        setCurrency(currency: Currencies) {
            if (Object.values(Currencies).includes(currency)) {
                this.state.currency = currency;
            }
        },
        setLanguage(language: string) {
            this.state.language = language;
        },
        setColorMode(colorMode: ColorMode) {
            if (Object.values(ColorMode).includes(colorMode)) {
                this.state.colorMode = colorMode;
            }
        }
    }
});
