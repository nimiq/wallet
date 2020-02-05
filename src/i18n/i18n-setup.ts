import Vue from 'vue';
import VueI18n from 'vue-i18n';
import messages from "@/i18n/dictionary.pot";

Vue.use(VueI18n);

const DEFAULT_LANGUAGE = 'en';

export const i18n = new VueI18n({
  locale: DEFAULT_LANGUAGE, // set locale (2 letters format: 'en')
  fallbackLocale: DEFAULT_LANGUAGE, // fallback locale if no translation found
  messages: { [DEFAULT_LANGUAGE]: messages }, // set locale messages
  silentTranslationWarn: true, // disable the "no translation found" warning
});

const loadedLanguages = [DEFAULT_LANGUAGE]; // our default language that is preloaded

function setI18nLanguage (lang: string) {
  i18n.locale = lang;
  return lang;
}

export function loadLanguageAsync(lang: string) {
  // If the same language
  if (i18n.locale === lang) {
    return Promise.resolve(setI18nLanguage(lang));
  }

  // If the language was already loaded
  if (loadedLanguages.includes(lang)) {
    return Promise.resolve(setI18nLanguage(lang));
  }

  // If the language hasn't been loaded yet
  return import(/* webpackChunkName: "lang-[request]" */ `@/i18n/${lang}.po`).then(
    (messages) => {
      i18n.setLocaleMessage(lang, messages.default);
      loadedLanguages.push(lang);
      return setI18nLanguage(lang);
    }
  );
}

export function autodetectLanguage() {
  const langRaw = window.navigator.language;
  const langParts = langRaw.replace('-', '_').split('_');
  const language = langParts[0];

  loadLanguageAsync(language);
}
