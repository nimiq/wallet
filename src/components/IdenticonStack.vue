<template>
    <button class="reset identicon-stack flex-column" v-on="$listeners" :class="{ interactive }">
        <Identicon class="secondary"
            v-if="backgroundAddresses[0]" :address="backgroundAddresses[0]"/>

        <BitcoinIcon class="secondary"
            v-if="hasBitcoinAddresses && activeCurrency !== CryptoCurrency.BTC" />

        <Identicon class="secondary"
            v-else-if="backgroundAddresses[1]"
            :address="backgroundAddresses[1]"/>

        <Identicon class="primary"
            v-if="activeCurrency === CryptoCurrency.NIM"
            :address="activeAddressInfo.address"/>

        <BitcoinIcon class="primary"
            v-else-if="activeCurrency === CryptoCurrency.BTC" />
        <label>
            {{ activeCurrency === CryptoCurrency.BTC ? 'Bitcoin' : activeAddressInfo.label }}
        </label>
    </button>
</template>

<script lang="ts">
import { Identicon } from '@nimiq/vue-components';
import { computed, defineComponent } from '@vue/composition-api';
import { CryptoCurrency } from '../lib/Constants';
import { useAccountStore } from '../stores/Account';
import { useAddressStore } from '../stores/Address';
import BitcoinIcon from './icons/BitcoinIcon.vue';

export default defineComponent({
    props: {
        interactive: {
            type: Boolean,
            default: true,
        },
    },
    setup() {
        const { activeAccountInfo, activeCurrency } = useAccountStore();
        const { addressInfos, activeAddressInfo } = useAddressStore();

        const backgroundAddresses = computed(() =>
            addressInfos.value
                .slice(0, 3)
                .filter((addressInfo) => activeCurrency.value !== CryptoCurrency.NIM
                    || addressInfo.address !== activeAddressInfo.value!.address)
                .slice(0, 2)
                .map((addressInfo) => addressInfo.address),
        );

        const hasBitcoinAddresses = computed(() => (activeAccountInfo.value || false)
            && (activeAccountInfo.value.btcAddresses || false)
            && activeAccountInfo.value.btcAddresses.external.length > 0);

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
