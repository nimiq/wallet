import { createStore } from 'pinia';
import { detectLanguage, loadLanguage } from '../i18n/i18n-setup';

export enum ColorMode {
    AUTOMATIC = 'automatic',
    LIGHT = 'light',
    DARK = 'dark',
}

export type SettingsState = {
    decimals: 0 | 2 | 5,
    language: string, // locale
    localizedFiat: boolean, // Whether to apply the set language to formatted fiat displays
    colorMode: ColorMode,
    amountsHidden: boolean,
};

export const useSettingsStore = createStore({
    id: 'settings',
    state: (): SettingsState => ({
        decimals: 0,
        language: detectLanguage(),
        localizedFiat: false,
        colorMode: ColorMode.AUTOMATIC,
        amountsHidden: false,
    }),
    getters: {
        decimals: (state): Readonly<number> => state.decimals,
        language: (state): Readonly<string> => state.language,
        localizedFiat: (state): Readonly<boolean> => state.localizedFiat,
        fiatLocale: (state): Readonly<string | undefined> => state.localizedFiat ? state.language : undefined,
        colorMode: (state): Readonly<ColorMode> => state.colorMode,
        amountsHidden: (state): Readonly<boolean> => state.amountsHidden,
    },
    actions: {
        setDecimals(num: 0 | 2 | 5 = 0) {
            this.state.decimals = num;
        },
        setLanguage(language: string) {
            loadLanguage(language);
            this.state.language = language;
        },
        setColorMode(colorMode: ColorMode) {
            if (Object.values(ColorMode).includes(colorMode)) {
                this.state.colorMode = colorMode;
            }
        },
        toggleAmountsHidden() {
            this.state.amountsHidden = !this.state.amountsHidden;
        },
        setLocalizedFiat(localizedFiat: boolean) {
            this.state.localizedFiat = localizedFiat;
        },
    },
});
