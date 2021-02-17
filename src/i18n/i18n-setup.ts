import Vue from 'vue';
import VueI18n from 'vue-i18n';
import { I18nMixin as VueComponentsI18n } from '@nimiq/vue-components';
import { Cookie } from '@nimiq/utils';

Vue.use(VueI18n);

export const Languages = [{
    code: 'en',
    name: 'English',
}, {
    code: 'es',
    name: 'Español',
}, {
    code: 'zh',
    name: '简体中文',
}, {
    code: 'de',
    name: 'Deutsch',
}, {
    code: 'fr',
    name: 'Français',
}, {
    code: 'ru',
    name: 'Русский',
}, {
    code: 'uk',
    name: 'Українська',
}, {
    code: 'nl',
    name: 'Nederlands',
}, {
    code: 'hr',
    name: 'Croatian',
// }, {
//     code: 'tr',
//     name: 'Türkçe',
}];

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = Languages.map((lang) => lang.code);
const loadedLanguage: string[] = []; // our default language that is preloaded, if any

export const i18n = new VueI18n({
    locale: DEFAULT_LANGUAGE, // set locale (2 letters format: 'en')
    fallbackLocale: DEFAULT_LANGUAGE, // fallback locale if no translation found
    silentTranslationWarn: true, // disable the "no translation found" warning
});

if (process.env.NODE_ENV === 'production') {
    i18n.missing = () => ''; // trick to not show numbers instead of string before language is loaded
}

function setI18nLanguage(lang: string): string {
    const { hostname } = window.location;
    const cookieDomain = hostname.includes('nimiq-testnet.com') ? 'nimiq-testnet.com'
        : hostname.includes('nimiq.com') ? 'nimiq.com'
            : undefined;

    Cookie.setCookie('lang', lang, { domain: cookieDomain, samesite: 'lax' });
    i18n.locale = lang;
    document.querySelector('html')!.setAttribute('lang', lang);
    return lang;
}

export async function loadLanguage(lang: string): Promise<string> {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        lang = DEFAULT_LANGUAGE;
    }

    VueComponentsI18n.setLanguage(lang);

    // If the language was already loaded
    if (loadedLanguage.includes(lang)) {
        return setI18nLanguage(lang);
    }

    // If the language hasn't been loaded yet
    const messages = await import(/* webpackChunkName: "lang-[request]" */ `@/i18n/${lang}.po`);
    i18n.setLocaleMessage(lang, messages.default);
    loadedLanguage.push(lang);
    return setI18nLanguage(lang);
}

export function detectLanguage(): string {
    const langCookie = Cookie.getCookie('lang');
    const fallbackLang = window.navigator.language.split('-')[0];

    let lang = langCookie || fallbackLang;
    // If the language is not supported set it to the default one
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        lang = DEFAULT_LANGUAGE;
    }
    return lang;
}

// If the user changed the language in another window/tab then load and enable new language
function onTabFocus() {
    const lang = detectLanguage();
    if (i18n.locale !== lang) {
        loadLanguage(lang).then(setI18nLanguage);
    }
}

window.addEventListener('focus', onTabFocus);
