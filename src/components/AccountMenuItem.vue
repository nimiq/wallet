<template>
    <component :is="tag" class="account-menu-item flex-row">
        <div v-if="accountInfo.type === AccountType.BIP39" class="icon" :class="backgroundClass">
            <LoginFileIcon/>
        </div>
        <div v-else-if="accountInfo.type === AccountType.LEGACY" class="icon">
            <Identicon :address="firstAddressInfo.address"/>
        </div>
        <div v-else-if="accountInfo.type === AccountType.LEDGER" class="icon">
            <LedgerIcon/>
        </div>
        <div class="meta">
            <div class="label">
                {{ accountInfo.type === AccountType.LEGACY
                    ? firstAddressInfo.label
                    : accountInfo.label
                }}
            </div>
            <FiatAmount :amount="fiatAccountBalance" :currency="fiatCurrency" value-mask/>
        </div>
        <AlertTriangleIcon v-if="!accountInfo.fileExported || !accountInfo.wordsExported"/>
    </component>
</template>

<script lang="ts">
import { useConfig } from '@/composables/useConfig';
import { useUsdcAddressStore } from '@/stores/UsdcAddress';
import { AlertTriangleIcon, FiatAmount, Identicon } from '@nimiq/vue-components';
import { computed, defineComponent } from '@vue/composition-api';
import { getBackgroundClass } from '../lib/AddressColor';
import { CryptoCurrency } from '../lib/Constants';
import { AccountType, useAccountStore } from '../stores/Account';
import { useAddressStore } from '../stores/Address';
import { BtcAddressSet, useBtcAddressStore } from '../stores/BtcAddress';
import { useFiatStore } from '../stores/Fiat';
import { Transaction, useTransactionsStore } from '../stores/Transactions';
import LedgerIcon from './icons/LedgerIcon.vue';
import LoginFileIcon from './icons/LoginFileIcon.vue';
import { useStakingStore } from '../stores/Staking';

export default defineComponent({
    props: {
        id: {
            type: String,
            required: true,
        },
        tag: {
            type: String,
            default: 'div',
        },
    },
    setup(props) {
        const { config } = useConfig();
        const { accountInfos } = useAccountStore();
        const { state: addressState } = useAddressStore();
        const { stakesByAccount } = useStakingStore();
        const { pendingTransactionsBySender } = useTransactionsStore();

        const accountInfo = computed(() => accountInfos.value[props.id]);
        const addressInfos = computed(() => accountInfo.value.addresses.map((addr) => addressState.addressInfos[addr]));
        const firstAddressInfo = computed(() => addressInfos.value[0]);
        const backgroundClass = computed(() => getBackgroundClass(firstAddressInfo.value.address));
        const outgoingPendingAmount = computed(() => {
            const pendingTxs: Transaction[] = [];
            const addresses: string[] = [];
            for (const ai of addressInfos.value) {
                pendingTxs.push(...(pendingTransactionsBySender.value[ai.address] || []));
                addresses.push(ai.address);
            }
            return pendingTxs
                // Do not consider pending transactions to our own addresses, to prevent the account
                // balance from getting reduced when sending between own accounts.
                .filter((tx) => !addresses.includes(tx.recipient))
                .reduce((sum, tx) => sum + tx.value + tx.fee, 0);
        });
        const nimAccountBalance = computed(() => addressInfos.value.reduce((sum, ai) =>
            sum + Math.max(0, (ai.balance || 0) - outgoingPendingAmount.value), 0) + stakesByAccount.value[props.id]);

        const addressSet = computed(() => {
            if (accountInfo.value.type === AccountType.LEGACY) return [];

            const { state: btcAddressState } = useBtcAddressStore();
            return accountInfo.value.btcAddresses
                ? {
                    internal: accountInfo.value.btcAddresses.internal
                        .map((addr) => btcAddressState.addressInfos[addr]),
                    external: accountInfo.value.btcAddresses.external
                        .map((addr) => btcAddressState.addressInfos[addr]),
                }
                : {
                    internal: [],
                    external: [],
                };
        });
        const btcAccountBalance = computed(() => {
            if (accountInfo.value.type === AccountType.LEGACY) return 0;

            const internalBalance = (addressSet.value as BtcAddressSet).internal
                .reduce((sum1, addressInfo) => sum1 + addressInfo.utxos
                    .reduce((sum2, utxo) => sum2 + utxo.witness.value, 0), 0);
            const externalBalance = (addressSet.value as BtcAddressSet).external
                .reduce((sum1, addressInfo) => sum1 + addressInfo.utxos
                    .reduce((sum2, utxo) => sum2 + utxo.witness.value, 0), 0);

            return internalBalance + externalBalance;
        });

        const { state: usdcAddressState } = useUsdcAddressStore();
        const polygonAddress = computed(() => accountInfo.value.polygonAddresses?.[0] as string | undefined);
        const usdcAccountBalance = computed(() => polygonAddress.value
            ? usdcAddressState.addressInfos[polygonAddress.value]?.balance || 0
            : 0,
        );

        // TODO: Dedupe double code with AccountBalance
        const { currency: fiatCurrency, exchangeRates } = useFiatStore();
        const nimExchangeRate = computed(() => exchangeRates.value[CryptoCurrency.NIM]?.[fiatCurrency.value]);
        const btcExchangeRate = computed(() => exchangeRates.value[CryptoCurrency.BTC]?.[fiatCurrency.value]);
        const usdcExchangeRate = computed(() => exchangeRates.value[CryptoCurrency.USDC]?.[fiatCurrency.value]);
        const fiatAccountBalance = computed(() => {
            let amount = 0;
            const nimFiatAmount = nimExchangeRate.value !== undefined
                ? (nimAccountBalance.value / 1e5) * nimExchangeRate.value
                : undefined;
            if (nimFiatAmount === undefined) return undefined;
            amount += nimFiatAmount;
            if (config.enableBitcoin) {
                const btcFiatAmount = btcExchangeRate.value !== undefined
                    ? (btcAccountBalance.value / 1e8) * btcExchangeRate.value
                    : undefined;
                if (btcFiatAmount === undefined) return undefined;
                amount += btcFiatAmount;
            }
            if (config.usdc.enabled) {
                const usdcFiatAmount = usdcExchangeRate.value !== undefined
                    ? (usdcAccountBalance.value / 1e6) * usdcExchangeRate.value
                    : undefined;
                if (usdcFiatAmount === undefined) return undefined;
                amount += usdcFiatAmount;
            }
            return amount;
        });

        return {
            accountInfo,
            firstAddressInfo,
            backgroundClass,
            fiatAccountBalance,
            fiatCurrency,
            AccountType,
        };
    },
    components: {
        LoginFileIcon,
        FiatAmount,
        AlertTriangleIcon,
        Identicon,
        LedgerIcon,
    },
});
</script>

<style lang="scss" scoped>
.account-menu-item {
    align-items: center;
}

.icon {
    border-radius: 0.5rem;
    flex-shrink: 0;
    margin-right: 1.5rem;
    width: 3.375rem;

    .identicon {
        width: 100%;
    }

    svg {
        display: block;
    }
}

.meta {
    flex-grow: 1;
}

.label {
    font-weight: bold;
    margin-bottom: 0.25rem;
}

.fiat-amount {
    --size: var(--small-size);
    font-size: var(--size);
    font-weight: 600;
    opacity: 0.5;
}

.nq-icon {
    font-size: 2.75rem;
    color: var(--nimiq-orange);
    flex-shrink: 0;
}

@media (max-width: 700px) { // Full mobile breakpoint
    .fiat-amount {
        font-size: 1.875rem;
    }
}
</style>
