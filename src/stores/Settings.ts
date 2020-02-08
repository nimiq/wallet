import { createStore } from 'pinia';
import { autodetectLanguage, loadLanguageAsync } from '../i18n/i18n-setup';

export enum ColorMode {
    default = 'default',
    dark = 'dark',
}

export type SettingsState = {
    showDecimals: boolean,
    language: string, // locale
    colorMode: ColorMode,
};

export const useSettingsStore = createStore({
    id: 'settings',
    state: (): SettingsState => ({
        showDecimals: false,
        language: autodetectLanguage(),
        colorMode: ColorMode.default,
    }),
    getters: {
        showDecimals: (state): Readonly<boolean> => state.showDecimals,
        language: (state): Readonly<string> => state.language,
        colorMode: (state): Readonly<ColorMode> => state.colorMode,
    },
    actions: {
        setShowDecimals(show?: boolean) {
            this.state.showDecimals = show || false;
        },
        setLanguage(language: string) {
            loadLanguageAsync(language);
            this.state.language = language;
        },
        setColorMode(colorMode: ColorMode) {
            if (Object.values(ColorMode).includes(colorMode)) {
                this.state.colorMode = colorMode;
            }
        }
    }
});
