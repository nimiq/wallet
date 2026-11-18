import { inject, provide } from 'vue';
import type { Vue } from 'vue/types/vue';

const i18nSymbol = Symbol('i18n');

export function provideI18n({ $i18n }: Vue) {
    provide(i18nSymbol, $i18n);
}

export function useI18n(): { locale: Vue['$i18n']['locale'], $t: Vue['$t'], $tc: Vue['$tc'] } {
    const i18n = inject(i18nSymbol) as Vue['$i18n'];
    if (!i18n) throw new Error('$tc was not provided.');
    return { locale: i18n.locale, $t: i18n.t.bind(i18n), $tc: i18n.tc.bind(i18n) };
}
