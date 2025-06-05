<template>
    <button class="reset identicon-stack flex-column" v-on="$listeners" :class="{
        interactive,
        'triangle-indented': (!hasBitcoinAddresses && backgroundAddresses.length === 1)
            || (hasBitcoinAddresses && backgroundAddresses.length === 0)
            || (activeCurrency === CryptoCurrency.BTC && backgroundAddresses.length === 1),
    }">
        <Identicon class="secondary"
            v-if="backgroundAddresses[0]" :address="backgroundAddresses[0]"/>

        <BitcoinIcon class="secondary"
            v-if="hasBitcoinAddresses && $config.enableBitcoin && activeCurrency !== CryptoCurrency.BTC" />

        <Identicon class="secondary"
            v-else-if="backgroundAddresses[1]"
            :address="backgroundAddresses[1]"/>

        <Identicon class="primary"
            v-if="activeCurrency === CryptoCurrency.NIM"
            :address="activeAddressInfo.address"/>

        <BitcoinIcon class="primary"
            v-else-if="activeCurrency === CryptoCurrency.BTC" />

        <TriangleDownIcon v-if="backgroundAddresses.length || hasBitcoinAddresses"/>

        <label>
            {{ activeCurrency === CryptoCurrency.BTC ? 'Bitcoin' : activeAddressInfo.label }}
        </label>
    </button>
</template>

<script lang="ts">
import { Identicon } from '@nimiq/vue-components';
import { computed, defineComponent } from 'vue';
import { CryptoCurrency } from '../lib/Constants';
import { useAccountStore } from '../stores/Account';
import { useAddressStore } from '../stores/Address';
import BitcoinIcon from './icons/BitcoinIcon.vue';
import TriangleDownIcon from './icons/TriangleDownIcon.vue';

export default defineComponent({
    props: {
        interactive: {
            type: Boolean,
            default: true,
        },
    },
    setup() {
        const { activeCurrency, hasBitcoinAddresses } = useAccountStore();
        const { addressInfos, activeAddressInfo } = useAddressStore();

        const backgroundAddresses = computed(() =>
            addressInfos.value
                .slice(0, 3)
                .filter((addressInfo) => activeCurrency.value !== CryptoCurrency.NIM
                    || addressInfo.address !== activeAddressInfo.value!.address)
                .slice(0, 2)
                .map((addressInfo) => addressInfo.address),
        );

        return {
            backgroundAddresses,
            hasBitcoinAddresses,
            activeCurrency,
            CryptoCurrency,
            activeAddressInfo,
        };
    },
    components: {
        Identicon,
        BitcoinIcon,
        TriangleDownIcon,
    },
});
</script>

<style lang="scss" scoped>
.identicon-stack {
    align-items: stretch;
    border-radius: 0.75rem;
    padding: 1rem;
    position: relative;
    width: 18rem;

    label {
        margin-top: 1.875rem;
        text-align: center;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        width: 100%;
        cursor: inherit;
        mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
    }

    svg.bitcoin {
        color: var(--bitcoin-orange);
        background: radial-gradient(circle at center, white 40%, transparent, transparent);
        border-radius: 50%;
    }

    .primary {
        position: relative;
        width: 9rem;
        height: 9rem;
        margin: -0.5rem auto 0;
    }

    .secondary {
        width: 7.5rem;
        position: absolute;
        top: 1.375rem;
        opacity: 0.4;

        transition:
            transform var(--movement-duration) var(--nimiq-ease),
            opacity var(--movement-duration) var(--nimiq-ease);

        &:first-child {
            left: 3rem;
        }

        &:nth-child(2) {
            right: 3rem;

            &.bitcoin {
                right: 3.25rem;
            }
        }

        &.bitcoin {
            height: 7rem;
            width: 7rem;
            margin-top: 0.25rem;
        }
    }

    ::v-deep svg.triangle-down-icon {
        position: absolute;
        right: 2.5rem;
        top: 8rem;
        opacity: 0.25;
        transition: opacity var(--attr-duration) var(--nimiq-ease);
    }

    &.triangle-indented ::v-deep svg.triangle-down-icon {
        right: 3.75rem;
    }

    &.interactive {
        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);

            .secondary:first-child {
                transform: translateX(-0.375rem) scale(1.05);
                opacity: 0.5;
            }

            .secondary:nth-child(2) {
                transform: translateX(0.375rem) scale(1.05);
                opacity: 0.5;
            }

            ::v-deep svg.triangle-down-icon {
                opacity: 0.4;
            }
        }

        label {
            cursor: pointer;
        }
    }

    &:not(.interactive) {
        cursor: default;
    }
}
</style>
