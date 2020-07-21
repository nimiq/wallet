<template>
    <button v-on="$listeners" class="address-button reset flex-row">
        <div class="identicon-wrapper">
            <Identicon :address="addressInfo.address"/>
            <VestingIcon v-if="addressInfo.type === AddressType.VESTING"/>
        </div>
        <span class="label">{{ addressInfo.label }}</span>
        <div v-if="addressInfo.balance !== null" class="balances">
            <span class="crypto-balance">
                <LockLockedIcon v-if="addressInfo.hasLockedBalance"/>
                <Amount :amount="addressInfo.balance"/>
            </span>
            <FiatConvertedAmount
                class="fiat-balance"
                :amount="addressInfo.balance"/>
        </div>
        <div v-else class="balances">???</div>
        <div class="mobile-arrow"></div>
    </button>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Identicon, LockLockedIcon } from '@nimiq/vue-components';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import VestingIcon from './icons/VestingIcon.vue';
import { AddressInfo, AddressType } from '../stores/Address';

export default defineComponent({
    props: {
        addressInfo: {
            type: Object as () => AddressInfo,
            required: true,
        },
    },
    setup() {
        return {
            AddressType,
        };
    },
    components: {
        Identicon,
        LockLockedIcon,
        Amount,
        FiatConvertedAmount,
        VestingIcon,
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

.identicon {
    width: 5.75rem !important;
    height: 5.75rem;
    flex-shrink: 0;
    margin: -0.375rem 0 -0.375rem;
}

.identicon-wrapper {
    position: relative;

    > svg {
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
}

.balances {
    text-align: right;
    flex-shrink: 0;
}

.crypto-balance {
    display: block;
    line-height: 1.2;
    font-weight: bold;

    .nq-icon {
        display: inline-block;
        font-size: 1.75rem;
    }
}

.fiat-balance {
    font-size: var(--small-size);
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
