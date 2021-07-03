<template>
    <button v-on="$listeners" class="address-button reset flex-row">
        <div class="identicon-wrapper">
            <BitcoinIcon v-if="addressInfo.type === CryptoCurrency.BTC"/>
            <Identicon v-else :address="addressInfo.address"/>
            <VestingIcon v-if="addressInfo.type === AddressType.VESTING"/>
        </div>
        <span class="label">{{ addressInfo.label }}</span>
        <div v-if="addressInfo.balance !== null" class="balances">
            <span class="crypto-balance">
                <LockLockedIcon v-if="addressInfo.hasLockedBalance"/>
                <Amount
                    :amount="addressInfo.balance"
                    :currency="currentCurrency"
                    value-mask/>
            </span>
            <FiatConvertedAmount
                class="fiat-balance"
                :amount="addressInfo.balance"
                :currency="currentCurrency"
                value-mask/>
        </div>
        <div v-else class="balances">
            <CircleSpinner/>
        </div>
        <div class="mobile-arrow"></div>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { Identicon, LockLockedIcon, CircleSpinner } from '@nimiq/vue-components';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import VestingIcon from './icons/VestingIcon.vue';
import { AddressInfo, AddressType } from '../stores/Address';
import { CryptoCurrency } from '../lib/Constants';
import BitcoinIcon from './icons/BitcoinIcon.vue';

export default defineComponent({
    props: {
        addressInfo: {
            type: Object as () => AddressInfo |
                Pick<AddressInfo, 'address' | 'label' | 'balance'> & { type: CryptoCurrency.BTC },
            required: true,
        },
    },
    setup(props) {
        const currentCurrency = computed(() =>
            props.addressInfo.type === CryptoCurrency.BTC ? CryptoCurrency.BTC : CryptoCurrency.NIM,
        );

        return {
            AddressType,
            CryptoCurrency,
            currentCurrency,
        };
    },
    components: {
        Identicon,
        LockLockedIcon,
        Amount,
        FiatConvertedAmount,
        VestingIcon,
        BitcoinIcon,
        CircleSpinner,
    },
});
</script>

<style lang="scss" scoped>
.address-button {
    font-size: var(--body-size);
    align-items: center;
    padding: 2rem;
    border-radius: 0.75rem;
}

.identicon,
.bitcoin {
    width: 5.75rem !important;
    height: 5.75rem;
    flex-shrink: 0;
    margin: -0.375rem 0 -0.375rem;
}

.bitcoin {
    color: var(--bitcoin-orange);
}

.identicon-wrapper {
    position: relative;

    > svg:not(.bitcoin) {
        position: absolute;
        right: -1rem;
        bottom: -0.5rem;
        padding: 0.375rem;
        background: white;
        border-radius: 50%;
        box-shadow: 0 0 0.5rem 0 rgba(0, 0, 0, 0.15);
        color: rgba(31, 35, 72, 0.7);
    }
}

.label {
    font-weight: 600;
    margin: 0 2rem;
    flex-grow: 1;
    text-align: left;
}

.balances {
    text-align: right;
    flex-shrink: 0;

    /deep/ .circle-spinner {
        display: block;
    }
}

.crypto-balance {
    --size: var(--body-size);
    display: block;
    line-height: 1.2;
    font-weight: bold;
    white-space: nowrap;

    .nq-icon {
        display: inline-block;
        font-size: 1.75rem;
    }
}

.fiat-balance {
    --size: var(--small-size);
    font-size: var(--size);
    font-weight: 600;
    opacity: 0.5;
}

.mobile-arrow {
    display: none;
}

@media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    .label {
        margin-right: 0;
    }

    .balances {
        display: none;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .label {
        margin: 0 1.5rem;
    }

    .address-button {
        padding: 1.5rem;
    }

    .mobile-arrow {
        display: block;
        border: 1rem solid transparent;
        border-width: 0.5rem 0.75rem;
        border-left-color: inherit;
        margin-left: 1.5rem;
        margin-right: -0.75rem;
        opacity: 0.3;
    }
}
</style>
