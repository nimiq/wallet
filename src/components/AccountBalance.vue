<template>
    <div class="account-balance">
        <h2 class="nq-label flex-row">
            {{ $t('Total Balance') }}
            <button class="reset" @click="toggleAmountsHidden">
                <PrivacyOffIcon v-if="!amountsHidden"/>
                <PrivacyOnIcon v-else/>
            </button>
        </h2>
        <div class="fiat-amount" ref="$fiatAmountContainer">
            <FiatConvertedAmount
                :amount="accountBalance"
                ref="$fiatAmount"
                :style="{ fontSize: `${fiatAmountFontSize}rem` }"
                value-mask
            />
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { defineComponent, ref, computed, onBeforeUnmount, onMounted } from '@vue/composition-api';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
// re add <BalanceDistribution /> once Bitcoin is avalable
// import BalanceDistribution from './BalanceDistribution.vue';
import PrivacyOffIcon from './icons/PrivacyOffIcon.vue';
import PrivacyOnIcon from './icons/PrivacyOnIcon.vue';
import { useAddressStore } from '../stores/Address';
import { useSettingsStore } from '../stores/Settings';
import { useWindowSize } from '../composables/useWindowSize';

export default defineComponent({
    setup(props, context) {
        const { accountBalance } = useAddressStore();

        const $fiatAmountContainer = ref<HTMLDivElement>(null);
        const $fiatAmount = ref<Vue>(null);

        const { width: windowWidth } = useWindowSize();
        const fiatAmountMaxSize = computed(() => windowWidth.value > 1160 ? 7 : 5.5); // rem
        const fiatAmountFontSize = ref(fiatAmountMaxSize.value);

        async function updateFontSize() {
            await context.root.$nextTick();

            if (!$fiatAmountContainer.value || !$fiatAmount.value) return;

            const availableWidth = $fiatAmountContainer.value!.offsetWidth;
            const referenceWidth = ($fiatAmount.value!.$el as HTMLElement).offsetWidth;
            const scaleFactor = Math.round((availableWidth / referenceWidth) * 100) / 100;

            if (scaleFactor > 1.02 || scaleFactor < 0.98) { // needed for safari
                fiatAmountFontSize.value = Math.min(fiatAmountMaxSize.value, fiatAmountFontSize.value * scaleFactor);
            }
        }

        window.addEventListener('resize', updateFontSize);
        onBeforeUnmount(() => window.removeEventListener('resize', updateFontSize));
        onMounted(() => updateFontSize());

        const { amountsHidden, toggleAmountsHidden } = useSettingsStore();

        return {
            accountBalance,
            $fiatAmount,
            $fiatAmountContainer,
            fiatAmountFontSize,
            amountsHidden,
            toggleAmountsHidden,
        };
    },
    components: {
        // BalanceDistribution,
        FiatConvertedAmount,
        PrivacyOffIcon,
        PrivacyOnIcon,
    },
});
</script>

<style lang="scss" scoped>
.account-balance {
    text-align: center;
}

.nq-label {
    margin-top: 0;
    margin-bottom: 1.5rem;
    justify-content: center;
    align-items: center;
    padding-left: 4.5rem; // To balance the eye icon on the right

    button {
        padding: 0 1rem;
        position: relative;
        opacity: 0;

        transition: color 0.2s var(--nimiq-ease), opacity 0.2s var(--nimiq-ease);

        &::after {
            content: '';
            position: absolute;
            top: -0.75rem;
            right: 0;
            bottom: -0.75rem;
            left: 0;
            border-radius: 2rem;
        }

        &:hover,
        &:focus {
            opacity: 1;
            color: var(--text-60);
        }
    }
}

.account-balance:hover .nq-label button {
    opacity: 1;
}

.fiat-amount {
    --size: 7rem;
    font-size: var(--size);
    // Fixed line-height, so that the block height doesn't change when
    // the font-size is dynamically adjusted for number length.
    line-height: var(--size);
}

@media (max-width: 1160px) { // Half mobile breakpoint
    .nq-label button {
        opacity: 1;
    }

    .fiat-amount {
        --size: 5.5rem;
        font-size: var(--size);
        line-height: var(--size);
    }
}
</style>
