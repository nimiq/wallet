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
    colorMode: ColorMode,
    amountsHidden: boolean,
    btcDecimals: 0 | 3 | 8,
    btcUnit: 'btc' | 'mbtc',
};

export const useSettingsStore = createStore({
    id: 'settings',
    state: (): SettingsState => ({
        decimals: 0,
        language: detectLanguage(),
        colorMode: ColorMode.AUTOMATIC,
        amountsHidden: false,
        btcDecimals: 0,
        btcUnit: 'mbtc',
    }),
    getters: {
        decimals: (state): Readonly<number> => state.decimals,
        language: (state): Readonly<string> => state.language,
        colorMode: (state): Readonly<ColorMode> => state.colorMode,
        amountsHidden: (state): Readonly<boolean> => state.amountsHidden,
        btcDecimals: (state): Readonly<number> => state.btcDecimals,
        btcUnit: (state): Readonly<'btc' | 'mbtc'> => state.btcUnit,
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
        setBtcDecimals(num: 0 | 3 | 8 = 0) {
            this.state.btcDecimals = num;
        },
        setBtcUnit(unit: 'btc' | 'mbtc') {
            this.state.btcUnit = unit;
        },
    },
});
