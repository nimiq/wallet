<template>
    <div class="account-balance-container">
        <div class="account-balance" :class="{'privacy-on': amountsHidden}">
            <h2 class="nq-label flex-row">
                <span>{{ $t('Total Balance') }}</span>
                <button class="reset" @click="toggleAmountsHidden" @mousedown.prevent>
                    <PrivacyOffIcon v-if="!amountsHidden"/>
                    <PrivacyOnIcon v-else/>
                </button>
            </h2>
            <div class="fiat-amount" ref="fiatAmountContainer$">
                <FiatAmount
                    v-if="fiatAmount !== undefined"
                    :amount="fiatAmount"
                    :currency="fiatCurrency"
                    ref="fiatAmount$"
                    :style="{ fontSize: `${fiatAmountFontSize}rem` }"
                    value-mask
                />
                <span v-else class="fiat-amount">&nbsp;</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { FiatAmount } from '@nimiq/vue-components';
import PrivacyOffIcon from './icons/PrivacyOffIcon.vue';
import PrivacyOnIcon from './icons/PrivacyOnIcon.vue';
import { useAddressStore } from '../stores/Address';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { usePolygonAddressStore } from '../stores/PolygonAddress';
import { useSettingsStore } from '../stores/Settings';
import { useFiatStore } from '../stores/Fiat';
import { useConfig } from '../composables/useConfig';
import { useWindowSize } from '../composables/useWindowSize';
import { CryptoCurrency } from '../lib/Constants';
import { useAccountSettingsStore } from '../stores/AccountSettings';
import { useStakingStore } from '../stores/Staking';

export default defineComponent({
    setup() {
        const { accountBalance } = useAddressStore();
        const { totalAccountStake } = useStakingStore();
        const { accountBalance: btcAccountBalance } = useBtcAddressStore();
        const {
            accountUsdcBalance,
            accountUsdcBridgedBalance,
            accountUsdtBridgedBalance,
        } = usePolygonAddressStore();
        const { stablecoin } = useAccountSettingsStore();
        const { currency: fiatCurrency, exchangeRates } = useFiatStore();
        const { config } = useConfig();

        const fiatAmount = computed(() => {
            let amount = 0;

            const nimExchangeRate = exchangeRates.value[CryptoCurrency.NIM]?.[fiatCurrency.value];
            const nimFiatAmount = nimExchangeRate !== undefined
                ? ((accountBalance.value + totalAccountStake.value) / 1e5) * nimExchangeRate
                : undefined;
            if (nimFiatAmount === undefined) return undefined;
            amount += nimFiatAmount;

            if (config.enableBitcoin) {
                const btcExchangeRate = exchangeRates.value[CryptoCurrency.BTC]?.[fiatCurrency.value];
                const btcFiatAmount = btcExchangeRate !== undefined
                    ? (btcAccountBalance.value / 1e8) * btcExchangeRate
                    : undefined;
                if (btcFiatAmount === undefined) return undefined;
                amount += btcFiatAmount;
            }

            if (config.polygon.enabled) {
                const usdcExchangeRate = exchangeRates.value[CryptoCurrency.USDC]?.[fiatCurrency.value];
                const usdtExchangeRate = exchangeRates.value[CryptoCurrency.USDT]?.[fiatCurrency.value];
                const usdFiatAmount = {
                    [CryptoCurrency.USDC]: usdcExchangeRate !== undefined
                        ? ((accountUsdcBalance.value + accountUsdcBridgedBalance.value) / 1e6) * usdcExchangeRate
                        : undefined,
                    [CryptoCurrency.USDT]: usdtExchangeRate !== undefined
                        ? (accountUsdtBridgedBalance.value / 1e6) * usdtExchangeRate
                        : undefined,
                    none: 0,
                }[stablecoin.value || 'none'];
                if (usdFiatAmount === undefined) return undefined;
                amount += usdFiatAmount;
            }

            return amount;
        });

        const fiatAmountContainer$ = ref<HTMLDivElement | null>(null);
        const fiatAmount$ = ref<FiatAmount | null>(null);

        const { isFullDesktop } = useWindowSize();
        const fiatAmountMaxSize = computed(() => isFullDesktop.value ? 7 : 5.5); // rem
        const fiatAmountFontSize = ref(fiatAmountMaxSize.value);

        async function updateFontSize() {
            await nextTick();
            if (!fiatAmount$.value) return;

            if (!fiatAmountContainer$.value || !fiatAmount$.value) return;

            const availableWidth = fiatAmountContainer$.value!.offsetWidth;
            const referenceWidth = (fiatAmount$.value!.$el as HTMLElement).offsetWidth;
            const scaleFactor = Math.round((availableWidth / referenceWidth) * 100) / 100;

            if (scaleFactor > 1.02 || scaleFactor < 0.98) { // needed for safari
                fiatAmountFontSize.value = Math.min(fiatAmountMaxSize.value, fiatAmountFontSize.value * scaleFactor);
            }
        }

        onMounted(() => {
            window.addEventListener('resize', updateFontSize);
        });
        onUnmounted(() => window.removeEventListener('resize', updateFontSize));

        watch(fiatAmount$, () => {
            if (!fiatAmount$.value) updateFontSize();
        });

        const { amountsHidden, toggleAmountsHidden } = useSettingsStore();

        return {
            fiatAmount,
            fiatCurrency,
            fiatAmount$,
            fiatAmountContainer$,
            fiatAmountFontSize,
            amountsHidden,
            toggleAmountsHidden,
        };
    },
    components: {
        FiatAmount,
        PrivacyOffIcon,
        PrivacyOnIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.account-balance,
.account-balance-container {
    text-align: center;
}

.nq-label {
    margin-top: 0;
    margin-bottom: 1.5rem;
    justify-content: center;
    align-items: center;

    span {
        transform: translateX(1.75rem);

        transition: transform 0.3s var(--nimiq-ease);
    }

    button {
        position: relative;
        opacity: 0;
        transform: scale(0.8);
        margin-left: 1rem;

        transition:
            color 0.2s var(--nimiq-ease),
            opacity 0.2s var(--nimiq-ease),
            transform 0.2s var(--nimiq-ease);

        &::after {
            content: '';
            position: absolute;
            top: -0.75rem;
            right: -1rem;
            bottom: -0.75rem;
            left: -1rem;
            border-radius: 2rem;
        }

        &:hover,
        &:focus {
            opacity: 1;
            transform: scale(1);
            color: var(--text-60);
        }
    }
}

.account-balance:hover,
.account-balance:focus-within,
.account-balance.privacy-on {
    .nq-label span {
        transform: translateX(0);
    }

    .nq-label button {
        opacity: 1;
        transform: scale(1);
    }
}

.fiat-amount {
    --size: 5.25rem;
    font-size: 7rem;
    // Fixed line-height, so that the block height doesn't change when
    // the font-size is dynamically adjusted for number length.
    line-height: 7rem;
}

.balance-distribution {
    margin-top: calc(var(--item-margin) / 4);
}

@media (max-width: $halfMobileBreakpoint) { // Half mobile breakpoint
    .nq-label span {
        transform: translateX(0);
    }

    .nq-label button {
        opacity: 1;
        transform: scale(1);
    }

    .fiat-amount {
        --size: 4.125rem;
        font-size: 5.5rem;
        line-height: 5.5rem;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .account-balance-container {
        padding-left: 1rem;
        padding-right: 1rem;
    }
}
</style>
