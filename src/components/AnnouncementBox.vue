<template>
    <div v-if="!wasDismissed && text()" class="announcement-box nq-green-bg">
        <CrossCloseButton @click="close"/>
        <p>{{ text() }}</p>
        <BlueLink v-if="typeof action === 'string'" :href="action" target="_blank" rel="noopener">{{ cta() }}</BlueLink>
        <button v-else class="reset action flex-row" @click="action">{{ cta() }}<ArrowRightSmallIcon/></button>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { ArrowRightSmallIcon } from '@nimiq/vue-components';
import { LocaleMessage } from 'vue-i18n';
import { RouteName, useRouter } from '@/router';
import { useI18n } from '@/lib/useI18n';
import BlueLink from './BlueLink.vue';
import CrossCloseButton from './CrossCloseButton.vue';

const STORAGE_KEY = 'announcement-box-dismissed';

export default defineComponent({
    setup() {
        const router = useRouter();
        const { $t } = useI18n();

        // text and cta must be functions for translations to work!
        let text: () => LocaleMessage = () => '';
        let cta: () => LocaleMessage = () => '';
        let action: string | (() => LocaleMessage) | (() => void) = '';
        let storageKey = ''; // Used to identify if the box has been dismissed yet

        // text = () => $t('Buy NIM & BTC with OASIS!');
        text = () => ''; // Disables AnnouncementBox
        cta = () => $t('Try it now');
        action = () => router.push({ name: RouteName.Buy });
        storageKey = 'buy-with-oasis-1';

        const wasDismissed = ref(window.localStorage.getItem(STORAGE_KEY) === storageKey);

        function close() {
            wasDismissed.value = true;
            window.localStorage.setItem(STORAGE_KEY, storageKey);
        }

        return {
            text,
            cta,
            action,
            wasDismissed,
            close,
        };
    },
    components: {
        BlueLink,
        ArrowRightSmallIcon,
        CrossCloseButton,
    },
});
</script>

<style lang="scss" scoped>
.announcement-box {
    position: relative;
    padding: 1.5rem;
    border-radius: 0.75rem;
}

p {
    font-weight: 600;
    font-size: var(--body-size);
    line-height: 1.4;
    margin-top: 0;
    margin-bottom: 1.75rem;
}

.cross-close-button {
    float: right;
    margin: -0.5rem -0.5rem 0 0;
}

.blue-link {
    font-size: var(--link-size);
}

.action {
    display: inline-flex;
    align-items: center;
    font-weight: bold;
    font-size: var(--link-size);

    .nq-icon {
        font-size: 1.5rem;
        margin-left: 0.75rem;
        margin-top: 0.125rem;

        transition: transform 0.2s var(--nimiq-ease);
    }

    &:hover .nq-icon,
    &:focus .nq-icon {
        transform: translateX(0.25rem);
    }
}
</style>
