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
    askForRecipientLabeling: boolean,
};

export const useSettingsStore = createStore({
    id: 'settings',
    state: (): SettingsState => ({
        decimals: 0,
        language: detectLanguage(),
        colorMode: ColorMode.AUTOMATIC,
        amountsHidden: false,
        askForRecipientLabeling: true,
    }),
    getters: {
        decimals: (state): Readonly<number> => state.decimals,
        language: (state): Readonly<string> => state.language,
        colorMode: (state): Readonly<ColorMode> => state.colorMode,
        amountsHidden: (state): Readonly<boolean> => state.amountsHidden,
        askForRecipientLabeling: (state): Readonly<boolean> => state.askForRecipientLabeling,
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
        setAskForRecipientLabeling(ask: boolean) {
            this.state.askForRecipientLabeling = ask;
        },
        toggleAmountsHidden() {
            this.state.amountsHidden = !this.state.amountsHidden;
        },
    },
});
