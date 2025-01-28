import { inject, provide } from '@vue/composition-api';
import type { Vue } from 'vue/types/vue';

const translateSymbol = Symbol('$t');
const translateWithVariableSymbol = Symbol('$tc');

export function provideI18n({ $t, $tc }: Vue) {
    provide(translateSymbol, $t);
    provide(translateWithVariableSymbol, $tc);
}

export function useI18n(): Pick<Vue, '$t' | '$tc'> {
    const $t = inject(translateSymbol) as Vue['$t'];
    const $tc = inject(translateWithVariableSymbol) as Vue['$tc'];
    if (!$tc) throw new Error('$tc was not provided.');
    return { $t, $tc };
}
