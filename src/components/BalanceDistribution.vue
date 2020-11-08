<template>
    <div class="balance-distribution">
        <div class="currency flex-column nim" :style="{width: Math.max(0.12, balanceDistribution.nim) * 100 + '%'}">
            <div class="distribution" >
                <div v-for="account of nimBalanceDistribution"
                    :key="account.addressInfo.address"
                    :style="{width: (nimPercentageSum < 0.99
                        ? 1 / nimBalanceDistribution.length
                        : account.percentage
                    ) * 100 + '%'}">
                    <Tooltip
                        preferredPosition="top right"
                        :container="$el ? {$el: $el.parentNode.parentNode} : undefined"
                    >
                        <div
                            class="bar"
                            :class="[
                                getBackgroundClass(account.addressInfo.address),
                                {'empty': !account.addressInfo.balance},
                            ]"
                            slot="trigger"></div>
                        <div class="flex-row">
                            <Identicon :address="account.addressInfo.address"/>
                            <div class="flex-column">
                                <span class="nq-text-s">{{account.addressInfo.label}}</span>
                                <FiatConvertedAmount
                                    v-if="account.addressInfo.balance !== null"
                                    :amount="account.addressInfo.balance" value-mask/>
                                <span v-else class="fiat-amount">&nbsp;</span>
                            </div>
                        </div>
                    </Tooltip>
                </div>
            </div>
            <Amount
                :decimals="0"
                :amount="accountBalance"
                :currency="'nim'"
                :currencyDecimals="5"
                ref="$nimAmount"
                :class="{ 'exchange-is-close': ($nimAmount && $exchange)
                    ? doElsTouch($nimAmount.$el, $exchange)
                    : false }"
                value-mask/>
        </div>
        <div v-if="hasBitcoinAddresses" class="exchange" ref="$exchange">
            <button
                :disabled="!totalFiatAccountBalance"
                class="nq-button-s" @click="$router.push('/swap').catch(() => {})" @mousedown.prevent
            >
                <SwapIcon/>
            </button>
        </div>
        <div v-if="hasBitcoinAddresses"
            class="currency flex-column btc"
            :style="{width: Math.max(0.12, balanceDistribution.btc) * 100 + '%'}"
        >
            <div class="distribution">
                <div style="width: 100%">
                    <Tooltip
                        preferredPosition="top left"
                        :container="$el ? {$el: $el.parentNode.parentNode} : undefined"
                    >
                        <div class="bar btc" :class="{'empty': !btcAccountBalance}" slot="trigger"></div>
                        <div class="flex-row">
                            <BitcoinIcon/>
                            <div class="flex-column">
                                <span class="nq-text-s">{{ $t('Bitcoin') }}</span>
                                <FiatConvertedAmount :amount="btcAccountBalance" currency="btc" value-mask/>
                            </div>
                        </div>
                    </Tooltip>
                </div>
            </div>
            <Amount
                :maxDecimals="Math.min(
                    btcUnit.decimals,
                    Math.max(0, Math.floor(Math.log10(100 / (btcAccountBalance / btcUnit.unitToCoins)))),
                )"
                :amount="btcAccountBalance"
                :currency="btcUnit.ticker.toLowerCase()"
                :currencyDecimals="btcUnit.decimals"
                ref="$btcAmount"
                :class="{ 'exchange-is-close': ($btcAmount && $exchange)
                    ? doElsTouch($btcAmount.$el, $exchange)
                    : false }"
                value-mask/>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from '@vue/composition-api';
import { Identicon, Tooltip, Amount } from '@nimiq/vue-components';
import { getBackgroundClass } from '../lib/AddressColor';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import BitcoinIcon from './icons/BitcoinIcon.vue';
import SwapIcon from './icons/SwapIcon.vue';
import { useAccountStore } from '../stores/Account';
import { useAddressStore, AddressInfo } from '../stores/Address';
import { useFiatStore } from '../stores/Fiat';
import { CryptoCurrency } from '../lib/Constants';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { useSettingsStore } from '../stores/Settings';

export default defineComponent({
    name: 'balance-distribution',
    setup() {
        const { activeAccountInfo } = useAccountStore();
        const { addressInfos, accountBalance } = useAddressStore();
        const { accountBalance: btcAccountBalance } = useBtcAddressStore();
        const { currency: fiatCurrency, exchangeRates } = useFiatStore();
        const { btcUnit } = useSettingsStore();

        const hasBitcoinAddresses = computed(() => (activeAccountInfo.value || false)
            && (activeAccountInfo.value.btcAddresses || false)
            && activeAccountInfo.value.btcAddresses.external.length > 0);

        const nimExchangeRate = computed(() => exchangeRates.value[CryptoCurrency.NIM]?.[fiatCurrency.value]);
        const btcExchangeRate = computed(() => exchangeRates.value[CryptoCurrency.BTC]?.[fiatCurrency.value]);

        const nimFiatAccountBalance = computed(() => nimExchangeRate.value !== undefined
            ? (accountBalance.value / 1e5) * nimExchangeRate.value
            : undefined,
        );
        const btcFiatAccountBalance = computed(() => btcExchangeRate.value !== undefined
            ? (btcAccountBalance.value / 1e8) * btcExchangeRate.value
            : undefined,
        );

        const totalFiatAccountBalance = computed(() => {
            if (nimFiatAccountBalance.value === undefined || btcFiatAccountBalance.value === undefined) {
                return undefined;
            }
            return nimFiatAccountBalance.value + btcFiatAccountBalance.value;
        });

        const balanceDistribution = computed((): { btc: number, nim: number } => ({
            nim: totalFiatAccountBalance.value
                ? (nimFiatAccountBalance.value ?? 0) / totalFiatAccountBalance.value
                : 0.5,
            btc: totalFiatAccountBalance.value
                ? (btcFiatAccountBalance.value ?? 0) / totalFiatAccountBalance.value
                : 0.5,
        }));

        const nimBalanceDistribution = computed((): Array<{addressInfo: AddressInfo, percentage: number}> =>
            addressInfos.value.map((addressInfo) => ({
                addressInfo,
                percentage: accountBalance.value ? (addressInfo.balance || 0) / accountBalance.value : 0,
            })),
        );

        const nimPercentageSum = computed(() =>
            nimBalanceDistribution.value.reduce((sum, account) => sum + (account.addressInfo.balance || 0), 0));

        /* Used to detect when the .exchange is above any of the 2 Amount element */
        const $exchange = ref<null | HTMLDivElement>(null);
        const $nimAmount = ref<null | Amount>(null);
        const $btcAmount = ref<null | Amount>(null);

        function doElsTouch(el1: Element, el2: Element) {
            const rect1 = el1.getBoundingClientRect();
            const rect2 = el2.getBoundingClientRect();

            return !((rect1.bottom < rect2.top)
                    || (rect1.top > rect2.bottom)
                    || (rect1.right < rect2.left)
                    || (rect1.left > rect2.right));
        }

        return {
            getBackgroundClass,
            totalFiatAccountBalance,
            balanceDistribution,
            accountBalance,
            hasBitcoinAddresses,
            btcAccountBalance,
            nimBalanceDistribution,
            nimPercentageSum,
            btcUnit,
            $exchange,
            $nimAmount,
            $btcAmount,
            doElsTouch,
        };
    },
    components: {
        FiatConvertedAmount,
        Identicon,
        Tooltip,
        Amount,
        BitcoinIcon,
        SwapIcon,
    },
});
</script>

<style lang="scss" scoped>
.balance-distribution {
    display: flex;
    flex-direction: row;
    align-items: flex-start;

    .exchange {
        flex-direction: row;
        align-content: center;
        justify-content: space-around;
        padding: 0 1rem;
        margin-top: 0.5rem;

        button {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0;
            width: 4rem;
            height: 4rem;
            border-radius: 2rem;

            svg {
                opacity: 0.5;
            }

            &::before {
                display: none;
            }
        }
    }

    .currency {
        justify-content: space-around;
        align-content: center;
        align-self: flex-start;
        margin-top: 0.5rem;
        position: relative;

        .distribution {
            display: flex;
            flex-direction: row;
            width: 100%;

            > div:not(:last-child) {
                padding-right: 0.5rem;
            }

            .tooltip {
                width: 100%;

                /deep/ .trigger {
                    display: block;
                }

                /deep/ .trigger::after {
                    background: white;
                }

                /deep/ .tooltip-box {
                    background: white;
                    color: var(--nimiq-blue);
                }

                .flex-row {
                    align-items: center;
                }

                .identicon,
                svg {
                    width: 4rem;
                    height: 4rem;
                    margin-right: 1rem;
                    flex-shrink: 0;
                    color: var(--bitcoin-orange);
                }

                .nq-text-s {
                    white-space: nowrap;
                    margin: 0 0 0.25rem;
                }

                .fiat-amount {
                    --size: var(--small-label-size);
                    font-size: var(--small-label-size);
                    opacity: .6;
                    font-weight: 600;
                    text-align: left;
                }
            }

            .bar {
                width: 100%;
                align-self: center;
                border-radius: .5rem;
                height: 0.5rem;
                min-width: 0.5rem;

                &.btc {
                    background: var(--bitcoin-orange);
                }

                &.empty {
                    background: var(--text-30) !important;
                }
            }
        }

        .amount {
            color: var(--text-40);
            font-weight: bold;
            --size: var(--small-size);
            font-size: var(--small-size);
            margin-left: 0.125rem;
            margin-right: 0.125rem;
            text-align: left;

            position: absolute;
            z-index: 5;
            top: 3rem;

            &.exchange-is-close {
                top: 4rem;
            }
        }

        &.btc > .amount {
            text-align: right;
            align-self: flex-end;
        }
    }
}
</style>
