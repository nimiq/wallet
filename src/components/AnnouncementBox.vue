<template>
    <div class="announcement-box nq-green-bg">
        <!-- eslint-disable-next-line max-len -->
        <svg class="background-icon" width="30" height="33" viewBox="0 0 30 33" fill="none" stroke="#fff" stroke-width="2" opacity=".5" xmlns="http://www.w3.org/2000/svg"><g stroke-linecap="round"><path d="M7 27h10M12 22l-0 10"/></g><circle cx="6.5" cy="6.5" r="5.5"/><rect x="22" y="5" width="10" height="11" rx="2"/></svg>

        <div class="text-form"></div>
        <p>{{ text }}</p>
        <button class="reset action flex-row" @click="action">{{ cta }}<ArrowRightSmallIcon/></button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { ArrowRightSmallIcon } from '@nimiq/vue-components';

export default defineComponent({
    setup(props, context) {
        // // Dark Mode
        // const text = context.root.$t('View your Wallet in the Dark Mode!');
        // const cta = context.root.$t('Check it out');
        // const action = () => context.root.$router.push('/settings');

        // Feedback
        const text = context.root.$t('Have ideas, suggestions, or problems?');
        const cta = context.root.$t('Give feedback');
        const action = () => window.open('https://forum.nimiq.community');

        return {
            text,
            cta,
            action,
        };
    },
    components: {
        ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.announcement-box {
    position: relative;
    padding: 1.5rem;
    border-radius: 0.5rem;
}

.background-icon {
    position: absolute;
    right: 0;
    top: 0.75rem;
}

.text-form {
    width: 100%;
    height: 100%;
    float: right;
    shape-outside: polygon(75% 0, 100% 0, 100% 75%);
}

p {
    font-weight: 600;
    font-size: 2rem;
    line-height: 1.4;
    margin-top: 0;
    margin-bottom: 1.75rem;
}

.action {
    display: inline-flex;
    align-items: center;
    font-weight: bold;
    font-size: 1.75rem;

    .nq-icon {
        font-size: 1.25rem;
        margin-left: 0.75rem;

        transition: transform 0.3s var(--nimiq-ease);
    }

    &:hover .nq-icon,
    &:focus .nq-icon {
        transform: translateX(0.25rem);
    }
}
</style>
