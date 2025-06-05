<template>
    <Modal ref="modal$" class="btc-activation-modal">
        <PageBody class="flex-column">
            <BitcoinIcon/>

            <h1 v-if="hasBitcoinAddresses" class="nq-h1">{{ $t('Your account now\nsupports Bitcoin!') }}</h1>
            <h1 v-else class="nq-h1">{{ $t('Add Bitcoin\nto your account') }}</h1>

            <p class="nq-text">
                {{ $t('Easily swap between NIM, the super performant payment coin '
                    + 'and BTC, the gold standard of crypto.') }}
            </p>
            <p class="nq-text">
                {{ $t('Or buy BTC directly in the wallet.') }}
            </p>

            <div class="flex-grow"></div>

            <button v-if="hasBitcoinAddresses" class="nq-button light-blue" @click="close()" @mousedown.prevent>
                {{ shouldOpenWelcomeModal ? $t('Check the new intro') : $t('Got it') }}
            </button>
            <button v-else class="nq-button light-blue" @click="enableBitcoin" @mousedown.prevent>
                {{ $t('Activate Bitcoin') }}
            </button>

            <a v-if="!hasBitcoinAddresses || shouldOpenWelcomeModal" class="nq-link"
                @click="close(hasBitcoinAddresses && shouldOpenWelcomeModal)">
                {{ $t('Skip') }}
            </a>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { PageBody } from '@nimiq/vue-components';
import { useRouter, RouteName } from '@/router';
import Modal from './Modal.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import { activateBitcoin } from '../../hub';
import { CryptoCurrency, WELCOME_MODAL_LOCALSTORAGE_KEY } from '../../lib/Constants';
import { useAccountStore } from '../../stores/Account';
import { useConfig } from '../../composables/useConfig';
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    props: {
        redirect: String,
    },
    setup(props) {
        const router = useRouter();
        const { activeAccountId, setActiveCurrency, hasBitcoinAddresses } = useAccountStore();

        const { isMobile } = useWindowSize();

        const modal$ = ref<Modal>(null);

        const welcomeModalAlreadyShown = window.localStorage.getItem(WELCOME_MODAL_LOCALSTORAGE_KEY);
        // TODO in future, once some time has passed since the USDC release with the new Welcome modal, only show the
        //  Welcome modal for new accounts/users anymore which hold no balance.
        const shouldOpenWelcomeModal = !welcomeModalAlreadyShown
            && !props.redirect // if a redirect is set, don't redirect to Welcome modal and don't offer going there.
            && useConfig().config.polygon.enabled; // Welcome modal talks about USDC.

        async function enableBitcoin() {
            await activateBitcoin(activeAccountId.value!);
            if (!hasBitcoinAddresses.value) return;
            setActiveCurrency(CryptoCurrency.BTC);
            await close();
        }

        async function close(skipDefaultRedirects = false) {
            if (hasBitcoinAddresses.value && props.redirect) {
                // The redirect is interpreted as a path and there is no risk of getting redirected to another domain by
                // a malicious link.
                await router.push(props.redirect);
            } else {
                await modal$.value!.forceClose();
                if (skipDefaultRedirects) return;

                if (isMobile.value && hasBitcoinAddresses.value) {
                    // On mobile, forward to the Bitcoin transactions overview, after Bitcoin got activated and the
                    // redirects by forceClose finished.
                    await router.push('/transactions');
                }

                if (shouldOpenWelcomeModal) {
                    // Open welcome modal with additional BTC and USDC info if not shown yet.
                    await router.push({ name: RouteName.Welcome });
                }
            }
        }

        return {
            hasBitcoinAddresses,
            shouldOpenWelcomeModal,
            modal$,
            enableBitcoin,
            close,
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
        background-image: url('../../assets/activation-modal-background.png');
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
