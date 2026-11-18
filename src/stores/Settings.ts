import { defineStore } from 'pinia';
import { shouldUseRedirects } from '../hub';
import { detectLanguage, loadLanguage } from '../i18n/i18n-setup';
import { Trial } from '../lib/Trials';

export enum ColorMode {
    AUTOMATIC = 'automatic',
    LIGHT = 'light',
    DARK = 'dark',
}

type BtcUnit = {
    ticker: 'mBTC' | 'BTC',
    decimals: 5 | 8,
    unitToCoins: 1e5 | 1e8,
};

export const BtcUnits: {[unit: string]: BtcUnit} = {
    mbtc: {
        ticker: 'mBTC',
        decimals: 5,
        unitToCoins: 1e5,
    },
    btc: {
        ticker: 'BTC',
        decimals: 8,
        unitToCoins: 1e8,
    },
};

export type NimDecimals = 0 | 2 | 5;
export type BtcDecimals = 0 | 3 | 5 | 8;
export type UsdcDecimals = 0 | 2 | 6;
export type SwipingEnabled = -1 | 0 | 1;
export type HubBehavior = 'auto' | 'popup' | 'redirect';

export type SettingsState = {
    decimals: NimDecimals,
    language: string, // locale
    colorMode: ColorMode,
    amountsHidden: boolean,
    btcDecimals: BtcDecimals,
    btcUnit: BtcUnit,
    usdcDecimals: UsdcDecimals,
    swipingEnabled: SwipingEnabled,
    trials: Trial[],
    updateAvailable: boolean,
    hubBehavior: HubBehavior,
};

export const useSettingsStore = defineStore('settings', {
    state: (): SettingsState => ({
        decimals: 0,
        language: detectLanguage(),
        colorMode: ColorMode.AUTOMATIC,
        amountsHidden: false,
        btcDecimals: 5,
        btcUnit: BtcUnits.btc,
        usdcDecimals: 2,
        swipingEnabled: -1,
        trials: [],
        updateAvailable: false,
        hubBehavior: 'auto',
    }),
    getters: {
        canUseSwaps: () => !shouldUseRedirects(), // depends on hubBehavior
    },
    actions: {
        setDecimals(num: NimDecimals = 0) {
            this.$state.decimals = num;
        },
        setLanguage(language: string) {
            loadLanguage(language);
            this.$state.language = language;
        },
        setColorMode(colorMode: ColorMode) {
            if (Object.values(ColorMode).includes(colorMode)) {
                this.$state.colorMode = colorMode;
            }
        },
        toggleAmountsHidden() {
            this.$state.amountsHidden = !this.$state.amountsHidden;
        },
        setBtcDecimals(num: BtcDecimals = 0) {
            this.$state.btcDecimals = num;
        },
        setBtcUnit(unit: 'btc' | 'mbtc') {
            this.$state.btcUnit = BtcUnits[unit];
        },
        setUsdcDecimals(num: UsdcDecimals = 2) {
            this.$state.usdcDecimals = num;
        },
        setSwipingEnabled(set: SwipingEnabled) {
            this.$state.swipingEnabled = set;
        },
        enableTrial(trial: Trial) {
            if (this.$state.trials.includes(trial)) return;
            this.$state.trials.push(trial);
        },
        setHubBehavior(behavior: HubBehavior) {
            this.$state.hubBehavior = behavior;
        },
    },
});
