<template>
    <div v-if="text()" class="announcement-box nq-green-bg">
        <p>{{ text() }}</p>
        <BlueLink v-if="typeof action === 'string'" :href="action" target="_blank">{{ cta() }}</BlueLink>
        <button v-else class="reset action flex-row" @click="action">{{ cta() }}<ArrowRightSmallIcon/></button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { ArrowRightSmallIcon } from '@nimiq/vue-components';
import { LocaleMessage } from 'vue-i18n';
import BlueLink from './BlueLink.vue';

export default defineComponent({
    setup(props, context) {
        let text: () => LocaleMessage = () => '';
        let cta: () => LocaleMessage = () => '';
        let action: string | Function = '';

        // // Dark Mode
        // text = context.root.$t('View your Wallet in Dark Mode!');
        // cta = context.root.$t('Check it out');
        // action = () => context.root.$router.push('/settings');

        // Beta Testing
        text = () => context.root.$t('Got feedback? Found a bug?');
        cta = () => context.root.$t('Tell us here');
        action = 'https://forum.nimiq.community/t/new-wallet-feedback-thread/845';

        return {
            text,
            cta,
            action,
        };
    },
    components: {
        BlueLink,
        ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.announcement-box {
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
