<template>
    <Modal ref="modal$">
        <PageBody class="flex-column">
            <!-- eslint-disable max-len -->
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M74.6675 87.9106C66.7739 93.1849 57.4936 96 48.0001 96C41.6924 96.0153 35.4438 94.7841 29.6133 92.3773C23.7828 89.9704 18.4853 86.4354 14.025 81.9751C9.56478 77.5149 6.02971 72.2173 3.62288 66.3868C1.21605 60.5563 -0.0151009 54.3077 0.000139786 48C0.000139786 38.5065 2.81529 29.2262 8.0896 21.3326C13.3639 13.4391 20.8605 7.28681 29.6313 3.6538C38.4022 0.0207976 48.0534 -0.929762 57.3645 0.922328C66.6756 2.77442 75.2283 7.34598 81.9413 14.0589C88.6542 20.7718 93.2257 29.3246 95.0778 38.6357C96.9299 47.9468 95.9794 57.598 92.3464 66.3688C88.7133 75.1397 82.5611 82.6363 74.6675 87.9106ZM69.3435 47.1278C70.4508 48.4261 69.5282 50.4257 67.8218 50.4257H59.9963C58.8917 50.4257 57.9963 51.3212 57.9963 52.4257V70.0866C57.9963 71.1911 57.1008 72.0866 55.9963 72.0866H40C38.8954 72.0866 38 71.1911 38 70.0866V52.4257C38 51.3212 37.1046 50.4257 36 50.4257H28.1666C26.4602 50.4257 25.5376 48.4261 26.6449 47.1278L46.4725 23.8817C47.271 22.9455 48.7174 22.9455 49.5159 23.8817L69.3435 47.1278Z" fill="url(#paint0_radial_1297_100709)"/>
                    <defs>
                        <radialGradient id="paint0_radial_1297_100709" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(96.0002 96.0002) rotate(-180) scale(96.0002 96.0002)">
                        <stop stop-color="#265DD7"/>
                        <stop offset="1" stop-color="#0582CA"/>
                    </radialGradient>
                </defs>
            </svg>
            <!-- eslint-enable max-len -->

            <h1 class="nq-h1">{{ $t('Welcome to the updated\nwallet, now with USDC/USDT') }}</h1>

            <p class="nq-text">
                {{ $t('Many updates like easier address names, more accessible swaps and an improved '
                    + 'asset overview await.') }}
            </p>
            <i18n tag="p" path="Read all about it in this {blog_post} or click below for the new wallet intro."
                class="nq-text secondary">
                <template #blog_post>
                    <a
                        href="https://www.nimiq.com/blog/usdc-on-polygon-now-available-in-nimiq-wallet/"
                        target="_blank"
                        rel="noopener">{{ $t('blog post') }}</a>
                </template>
            </i18n>

            <div class="flex-grow"></div>

            <button v-if="hasPolygonAddresses" class="nq-button light-blue" @click="close()" @mousedown.prevent>
                {{ buttonText }}
            </button>
            <button v-else class="nq-button light-blue" @click="enablePolygon" @mousedown.prevent>
                {{ $t('Activate USDC/USDT') }}
            </button>

            <a
                v-if="!hasPolygonAddresses || shouldOpenWelcomeModal"
                class="nq-link"
                @click="close(hasPolygonAddresses && (shouldOpenWelcomeModal))"
            >
                {{ $t('Skip') }}
            </a>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { PageBody } from '@nimiq/vue-components';
import { useRouter, RouteName } from '@/router';
import { useI18n } from '@/lib/useI18n';
import Modal from './Modal.vue';
import { activatePolygon } from '../../hub';
import {
    WELCOME_MODAL_LOCALSTORAGE_KEY,
    WELCOME_STAKING_MODAL_LOCALSTORAGE_KEY,
} from '../../lib/Constants';
import { useAccountStore } from '../../stores/Account';
import { useConfig } from '../../composables/useConfig';
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    props: {
        redirect: String,
    },
    setup(props) {
        const { activeAccountId, hasPolygonAddresses } = useAccountStore();
        const { isMobile } = useWindowSize();
        const { config } = useConfig();
        const modal$ = ref<Modal>(null);
        const router = useRouter();
        const { $t } = useI18n();

        const welcomeModalAlreadyShown = window.localStorage.getItem(WELCOME_MODAL_LOCALSTORAGE_KEY);
        // TODO in future, once some time has passed since the USDC release with the new Welcome modal, only show the
        //  Welcome modal for new accounts/users anymore which hold no balance.
        const welcomeStakingModalAlreadyShown = window.localStorage.getItem(WELCOME_STAKING_MODAL_LOCALSTORAGE_KEY);

        const shouldOpenWelcomeModal = computed(() =>
            !welcomeModalAlreadyShown
            && !props.redirect // if a redirect is set, don't redirect to Welcome modal and don't offer going there.
            && config.enableBitcoin, // Welcome modal talks about BTC.
        );

        const shouldOpenWelcomeStakingModal = computed(() =>
            !welcomeStakingModalAlreadyShown
            && !props.redirect, // if a redirect is set, don't redirect to Welcome staking modal
        );

        const buttonText = computed(() => {
            if (shouldOpenWelcomeStakingModal.value) return $t('Learn about the new Nimiq');
            if (shouldOpenWelcomeModal.value) return $t('Check the new intro');
            return $t('Got it');
        });

        async function enablePolygon() {
            await activatePolygon(activeAccountId.value!);
            if (!hasPolygonAddresses.value) return;
            await close(true);
            if (!props.redirect) {
                router.push({ name: RouteName.StablecoinSelection });
            }
        }

        async function close(skipDefaultRedirects = false) {
            if (hasPolygonAddresses.value && props.redirect) {
                // The redirect is interpreted as a path and there is no risk of getting redirected to another domain by
                // a malicious link.
                await router.push(props.redirect);
            } else {
                await modal$.value!.forceClose();
                if (skipDefaultRedirects) return;

                if (isMobile.value && hasPolygonAddresses.value) {
                    // On mobile, forward to the USDC transactions overview, after USDC got activated and the
                    // redirects by forceClose finished.
                    await router.push('/transactions');
                }

                if (shouldOpenWelcomeStakingModal.value) {
                    // Open welcome staking modal if not shown yet
                    await router.push({ name: RouteName.WelcomeStaking });
                } else if (shouldOpenWelcomeModal.value) {
                    // Open welcome modal with additional BTC and USDC info if not shown yet
                    await router.push({ name: RouteName.Welcome });
                }
            }
        }

        return {
            hasPolygonAddresses,
            shouldOpenWelcomeModal,
            shouldOpenWelcomeStakingModal,
            buttonText,
            modal$,
            enablePolygon,
            close,
        };
    },
    components: {
        Modal,
        PageBody,
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
    color: var(--usdc-blue);
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

.secondary {
    color: var(--text-60);

    a {
        color: var(--text-60);
        text-decoration: underline;
    }
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
