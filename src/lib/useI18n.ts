import { inject, provide } from 'vue';
import type { ComponentPublicInstance } from 'vue';

interface I18nInstance {
    locale: string;
    t: (key: string) => string;
    tc: (key: string, choice?: number) => string;
}

interface VueInstance extends ComponentPublicInstance {
    $i18n: I18nInstance;
}

const i18nSymbol = Symbol('i18n');

export function provideI18n(instance: VueInstance) {
    provide(i18nSymbol, instance.$i18n);
}

export function useI18n(): { locale: string, $t: (key: string) => string, $tc: (key: string, choice?: number) => string } {
    const i18n = inject(i18nSymbol) as I18nInstance;
    if (!i18n) throw new Error('$tc was not provided.');
    return { locale: i18n.locale, $t: i18n.t.bind(i18n), $tc: i18n.tc.bind(i18n) };
}
