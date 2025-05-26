<template>
    <div class="wallet-toolbar">
     <button v-if="$props.showHelpButton" @click="$router.push({ name: RouteName.NimiqFeedback })"
     class="nq-button-pill nimiq-feedback">
        <ThumbUpThumbDown />
    </button>

    <button v-if="$props.showNimiqFeedbackButton" @click="$router.push({ name: RouteName.WalletStatus })"
    class="wallet-status-button nq-button-pill">
        <CircledQuestionMark />
        <span>{{ $t('Help') }}</span>
    </button>

    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { RouteName } from '@/router';
import CircledQuestionMark from './icons/CircledQuestionMark.vue';
import ThumbUpThumbDown from './icons/ThumbUpThumbDown.vue';

export default defineComponent({
    props: {
        showHelpButton: {
            type: Boolean,
            default: false,
        },
        showNimiqFeedbackButton: {
            type: Boolean,
            default: false,
        },
    },
    setup() {
        return {
            RouteName,
        };
    },
    components: {
        CircledQuestionMark,
        ThumbUpThumbDown,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.wallet-toolbar {
    position: absolute;
    bottom: 2rem;
    right: 2rem;

    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: end;
}

@media (max-width: $mobileBreakpoint) {
    .wallet-toolbar {
        bottom: 11rem;
    }
}

.wallet-status-button {
    height: 4.25rem;
    border-radius: 2.25rem;

    display: flex;
    flex-direction: row;
    align-items: center;

    font-size: 2rem;

    svg {
        margin-right: 1rem;
    }
}

.nimiq-feedback {
    height: 6rem;
    width: 6rem;
    border-radius: 3rem;
    color: white;
    font-size: 4rem;
    padding: 1rem;
    box-shadow: 0 0.5rem 3.5rem rgba(0, 0, 0, 0.111158);
}

</style>
