<template>
    <button v-on="$listeners" class="address-button reset flex-row">
        <div class="identicon-wrapper">
            <BitcoinIcon v-if="addressInfo.type === CryptoCurrency.BTC"/>
            <UsdcIcon v-else-if="addressInfo.type === CryptoCurrency.USDC"/>
            <UsdtIcon v-else-if="addressInfo.type === CryptoCurrency.USDT"/>
            <Identicon v-else :address="addressInfo.address"/>

            <TwoLeafStakingIcon v-if="!embedded && stakesByAddress[addressInfo.address]" />
            <VestingIcon v-else-if="addressInfo.type === AddressType.VESTING"/>
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
import { defineComponent, computed } from 'vue';
import { Identicon, LockLockedIcon, CircleSpinner } from '@nimiq/vue-components';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import VestingIcon from './icons/VestingIcon.vue';
import { AddressInfo, AddressType } from '../stores/Address';
import { useStakingStore } from '../stores/Staking';
import { CryptoCurrency } from '../lib/Constants';
import BitcoinIcon from './icons/BitcoinIcon.vue';
import UsdcIcon from './icons/UsdcIcon.vue';
import UsdtIcon from './icons/UsdtIcon.vue';
import TwoLeafStakingIcon from './icons/Staking/TwoLeafStakingIcon.vue';

export default defineComponent({
    props: {
        embedded: {
            type: Boolean,
            default: false,
        },
        addressInfo: {
            type: Object as () => AddressInfo |
                Pick<AddressInfo, 'address' | 'label' | 'balance'> & {
                    type: CryptoCurrency.BTC | CryptoCurrency.USDC | CryptoCurrency.USDT,
                },
            required: true,
        },
    },
    setup(props) {
        const currentCurrency = computed(() => {
            switch (props.addressInfo.type) {
                case CryptoCurrency.BTC: return CryptoCurrency.BTC;
                case CryptoCurrency.USDC: return CryptoCurrency.USDC;
                case CryptoCurrency.USDT: return CryptoCurrency.USDT;
                default: return CryptoCurrency.NIM;
            }
        });

        const { stakesByAddress } = useStakingStore();

        return {
            AddressType,
            CryptoCurrency,
            currentCurrency,
            stakesByAddress,
        };
    },
    components: {
        Identicon,
        LockLockedIcon,
        Amount,
        FiatConvertedAmount,
        VestingIcon,
        BitcoinIcon,
        UsdcIcon,
        UsdtIcon,
        TwoLeafStakingIcon,
        CircleSpinner,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/functions.scss';

.address-button {
    font-size: var(--body-size);
    align-items: center;
    padding: 2rem;
    border-radius: 0.75rem;

    &:disabled {
        opacity: 0.4;
        background: none !important;
    }
}

.identicon,
.bitcoin,
.usdc,
.usdt {
    width: 5.75rem !important;
    height: 5.75rem;
    flex-shrink: 0;
    margin: -0.375rem 0 -0.375rem;
}

.bitcoin {
    color: var(--bitcoin-orange);
}

.usdc {
    color: var(--usdc-blue);
}

.usdt {
    color: var(--usdt-green);
}

.identicon-wrapper {
    position: relative;

    > svg:not(.bitcoin):not(.usdc):not(.usdt) {
        position: absolute;
        right: 0;
        bottom: -0.75rem;
        padding: 0.25rem;
        border-radius: 50%;
        box-shadow: 0 0 0.5rem 0 rgba(0, 0, 0, 0.15);
    }

    > svg.vesting-icon {
        background: white;
        color: nimiq-blue(0.7);
    }

    > svg.two-leaf-staking-icon {
        font-size: 2.25rem;
        padding: 0.125rem !important;
        background: var(--nimiq-green-bg);
        color: var(--nimiq-white);
        outline: 2px solid #E7E8EA;
        transition: outline 350ms var(--nimiq-ease);

        ::v-deep path {
            stroke-width: 1.25px;
        }
    }
}

.address-button:not(.active):hover,
.address-button:not(.active):focus {
    .identicon-wrapper > svg.two-leaf-staking-icon {
        outline-color: #DBDCE0;
    }
}

.address-button.active {
    .identicon-wrapper > svg.two-leaf-staking-icon {
        outline-color: white;
    }
}

.label {
    font-weight: 600;
    padding: 0 2rem;
    text-align: left;
    flex-grow: 1;
    flex-shrink: 1;
    overflow: hidden;
    mask: linear-gradient(90deg, white, white calc(100% - 3rem), rgba(255, 255, 255, 0));
}

.balances {
    text-align: right;
    flex-shrink: 0;

    ::v-deep .circle-spinner {
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

@media (max-width: $tabletBreakpoint) and (min-width: ($mobileBreakpoint + 1px)) { // Tablet breakpoint
    .label {
        margin-right: 0;
    }

    .balances {
        display: none;
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
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
