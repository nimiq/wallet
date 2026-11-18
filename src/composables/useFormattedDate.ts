import { computed, Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/Settings';
import { twoDigit } from '../lib/NumberFormatting';

let monthFormatter: Readonly<Ref<Readonly<Intl.DateTimeFormat>>> | null = null;

/**
 * @param timestamp - timestamp in milliseconds
 */
export function useFormattedDate(timestamp: Ref<number | undefined>) {
    if (!monthFormatter) {
        const { language } = storeToRefs(useSettingsStore());
        monthFormatter = computed(() => new Intl.DateTimeFormat(language.value, { month: 'short' }));
    }

    const date = computed(() => timestamp.value && new Date(timestamp.value));
    const dateDay = computed(() => date.value && twoDigit(date.value.getDate()));
    const dateMonth = computed(() => date.value && monthFormatter!.value.format(date.value));
    const dateTime = computed(() => date.value
        && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`);

    return {
        dateDay,
        dateMonth,
        dateTime,
    };
}
