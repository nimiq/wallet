<template>
    <!-- Pass down all attributes not declared as props --->
    <Modal v-bind="$attrs" v-on="$listeners" class="btc-activation-modal">
        <PageBody class="flex-column">
            <BitcoinIcon/>

            <h1 v-if="isActivated" class="nq-h1">{{ $t('Your account now\nsupports Bitcoin!') }}</h1>
            <h1 v-else class="nq-h1">{{ $t('Add Bitcoin\nto your account') }}</h1>

            <p class="nq-text">
                {{ $t('Easily swap between NIM, the super performant payment coin '
                    + 'and BTC, the gold standard of crypto.') }}
            </p>
            <p class="nq-text">
                {{ $t('Or buy BTC directly in the wallet.') }}
            </p>

            <div class="flex-grow"></div>

            <button v-if="isActivated" class="nq-button light-blue" @click="$router.back()" @mousedown.prevent>
                {{ $t('Got it') }}
            </button>
            <button v-else class="nq-button light-blue" @click="enableBitcoin" @mousedown.prevent>
                {{ $t('Activate Bitcoin') }}
            </button>

            <a v-if="!isActivated" class="nq-link" @click="$router.back()">{{ $t('Skip for now') }}</a>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, onUnmounted, watch } from '@vue/composition-api';
import { PageBody } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import { activateBitcoin } from '../../hub';
import { CryptoCurrency } from '../../lib/Constants';
import { useAccountStore } from '../../stores/Account';
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    props: {
        isActivated: {
            // Note: this prop has no type on purpose, as it can be a string or a boolean passed from vue-router
            default: false,
        },
    },
    setup(props, context) {
        const { activeAccountId, setActiveCurrency, hasBitcoinAddresses } = useAccountStore();

        const { isMobile } = useWindowSize();

        let activated = false;

        async function enableBitcoin() {
            activated = await activateBitcoin(activeAccountId.value!);
            if (activated) {
                setActiveCurrency(CryptoCurrency.BTC);
                if (!context.root.$route.matched.some(({ name }) => name === 'btc-activation')) {
                    // BtcActivationModal was not opened by btc-activation route but for another route via
                    // requireActivatedBitcoin in router.ts. Once Bitcoin addresses were synced, open the initially
                    // intended route.
                    const unwatch = watch(() => {
                        if (!hasBitcoinAddresses.value) return;
                        unwatch();
                        // wait some little extra time for store to be persisted
                        setTimeout(() => window.location.reload(), 1000);
                    });
                } else {
                    context.root.$router.back(); // Close modal
                }
            }
        }

        onUnmounted(() => {
            if (activated && isMobile.value) {
                context.root.$router.push('/transactions');
            }
        });

        return {
            enableBitcoin,
        };
    },
    components: {
        Modal,
        PageBody,
        BitcoinIcon,
    },
});
</script>

<style lang="scss" scoped>
.modal {
    ::v-deep .small-page {
        // height: auto;
        text-align: center;
        background-image: url('../../assets/bitcoin-activation-background.png');
        background-position: bottom right;
        background-repeat: no-repeat;
        background-size: auto 532px;
        width: 91rem; // 728px
    }

    ::v-deep .close-button {
        display: none;
    }
}

.page-body {
    align-items: center;
    padding-top: 8rem;
    width: 52.5rem;
    max-width: 100%;
}

svg {
    width: 96px;
    height: 96px;
    color: var(--bitcoin-orange);
}

.nq-h1 {
    margin-top: 4rem;
    margin-bottom: 2.25rem;
    white-space: pre-line;
}

.nq-text {
    color: var(--nimiq-blue);
    margin: 0 0 2rem;
    max-width: 34.5rem;
    white-space: pre-line;
}

.nq-link {
    font-weight: 600;
    font-size: var(--small-size);
    color: var(--text-60);
    margin-bottom: -1.5rem;
}

.nq-button {
    margin-left: 2rem;
    margin-right: 2rem;
    align-self: stretch;
}

@media (max-width: 730px) {
    .modal {
        ::v-deep .small-page {
            width: 52.5rem; // reset
            background-image: none;
        }
    }
}
</style>
