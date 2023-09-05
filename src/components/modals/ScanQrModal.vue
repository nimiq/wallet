<template>
    <Modal class="scan-qr-modal" :swipePadding="false" :showOverlay="!!goCryptoStatus"
        @close-overlay="resetGoCryptoPaymentDetails">
        <PageBody>
            <QrScanner @result="checkResult" @cancel="$router.back()" />
        </PageBody>

        <template #overlay>
            <StatusScreen
                :state="goCryptoStatus.state"
                :title="goCryptoStatus.title"
                :message="goCryptoStatus.message"
                :mainAction="goCryptoStatus.mainAction"
                @main-action="goCryptoStatus.onMainAction && goCryptoStatus.onMainAction()"
            />
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from '@vue/composition-api';
import { PageBody, QrScanner } from '@nimiq/vue-components';
import {
    parseRequestLink,
    createNimiqRequestLink,
    createBitcoinRequestLink,
    createEthereumRequestLink,
    NimiqRequestLinkType,
    ValidationUtils,
    Currency,
    EthereumChain,
} from '@nimiq/utils';
import Modal from './Modal.vue';
import StatusScreen, { State as StatusScreenState } from '../StatusScreen.vue';
import { useAccountStore } from '../../stores/Account';
import { useConfig } from '../../composables/useConfig';
import { useRouter } from '../../router';
import { validateAddress as validateBitcoinAddress } from '../../lib/BitcoinTransactionUtils';
import {
    parseGoCryptoRequestLink,
    fetchGoCryptoPaymentDetails,
    GoCryptoPaymentStatus,
    GoCryptoPaymentDetails,
} from '../../lib/GoCrypto';
import { ENV_MAIN } from '../../lib/Constants';
import { loadBitcoinJS } from '../../lib/BitcoinJSLoader';
import { getPolygonClient } from '../../ethers';

export default defineComponent({
    name: 'scan-qr-modal',
    setup(props, context) {
        const { config } = useConfig();
        const router = useRouter();
        const { hasBitcoinAddresses, hasUsdcAddresses } = useAccountStore();

        const checkResult = async (result: string) => {
            // Cashlink
            if (/https:\/\/hub\.nimiq(-testnet)?\.com\/cashlink\//.test(result)) {
                // result is a cashlink so redirect to hub
                window.location.href = result;
                return;
            }

            // Nimiq-controlled short-links
            if (/https:\/\/nim\.id\/.+/.test(result)) {
                window.location.href = result;
                return;
            }

            // Remove the origin to support scanning full wallet links with encoded payment request link, e.g.
            // http://localhost:8081/nimiq:NQ35SB3EB8XAESYER574SJA4EEFTX0VQQ5T1?amount=12&message=asd
            result = result.replace(`${window.location.origin}/`, '');

            // NIM Address
            if (ValidationUtils.isValidAddress(result)) {
                router.replace(`/${createNimiqRequestLink(result, {
                    type: NimiqRequestLinkType.URI,
                })}`);
                return;
            }

            // NIM Request Link
            const nimRequestLink = parseRequestLink(result, { currencies: [Currency.NIM] });
            if (nimRequestLink) {
                // Reformat into the new Nimiq request link format, in case it's a old Safe url, and redirect to the
                // request link as path which will be handled by the router.
                router.replace(`/${createNimiqRequestLink(nimRequestLink.recipient, {
                    ...nimRequestLink,
                    type: NimiqRequestLinkType.URI,
                })}`);
                return;
            }

            if (config.enableBitcoin && hasBitcoinAddresses.value) {
                loadBitcoinJS().then(() => {
                    const isValidBitcoinAddressForCurrentNetwork = (address: string) =>
                        validateBitcoinAddress(address, config.environment === ENV_MAIN ? 'MAIN' : 'TEST');

                    // BTC Address
                    if (isValidBitcoinAddressForCurrentNetwork(result)) {
                        router.replace(`/${createBitcoinRequestLink(result)}`);
                        return;
                    }

                    // BTC Request Link
                    const btcRequestLink = parseRequestLink(result, {
                        currencies: [Currency.BTC],
                        isValidAddress: {
                            [Currency.BTC]: isValidBitcoinAddressForCurrentNetwork,
                        },
                    });
                    if (btcRequestLink) {
                        // Redirect to the valid Bitcoin request link as path which will be handled by the router.
                        router.replace(`/${result}`);
                    }
                });
            }

            if (config.usdc.enabled && hasUsdcAddresses.value) {
                getPolygonClient().then(({ ethers }) => {
                    // For USDC we don't support scanning plain addresses to avoid the risk of sending Polygon USDC to
                    // an Ethereum wallet, because the addresses are the same.

                    // USDC Request Link
                    // We only accept links on Polygon to avoid sending Polygon USDC to an Ethereum wallet. We accept:
                    // - links for USDC, i.e. links specifying the Polygon USDC contract address, both with the polygon:
                    //   and the ethereum: protocol (which strictly speaking is the only correct protocol according to
                    //   eip681), but only as long as they specify a Polygon USDC contract address and not an Ethereum
                    //   USDC contract address.
                    // - also links for MATIC, i.e. links with the polygon: protocol, or the ethereum: protocol if they
                    //   specify a Polygon chain id. This is to be a bit more lenient, to not only accept strict USDC
                    //   links but also simple links like polygon:<address>, as long as they are unmistakably Polygon
                    //   links via the polygon: protocol or a Polygon chain id. Thus, links like ethereum:<address> are
                    //   ignored. The amount in the link is interpreted directly as USDC balance.
                    const allowedChains = [
                        EthereumChain.POLYGON_MAINNET,
                        ...(config.environment !== ENV_MAIN ? [EthereumChain.POLYGON_MUMBAI_TESTNET] : []),
                    ];
                    const usdcRequestLink = parseRequestLink(result, {
                        currencies: [Currency.USDC, Currency.MATIC],
                        isValidAddress: {
                            // The address validation is shared between ETH, MATIC and USDC.
                            [Currency.ETH]: (address: string) => ethers.utils.isAddress(address),
                        },
                    });
                    if (usdcRequestLink && usdcRequestLink.chainId && allowedChains.includes(usdcRequestLink.chainId)) {
                        // Reformat into a request link with polygon: protocol, in case it has the ethereum: protocol
                        // because we only define a route for polygon: in router.ts, and redirect to the request link as
                        // path which will be handled by the router.
                        router.replace(`/${createEthereumRequestLink(
                            usdcRequestLink.recipient,
                            Currency.USDC,
                            usdcRequestLink,
                        )}`);
                    }
                });
            }

            if (config.goCrypto.enabled) {
                const goCryptoRequestLink = parseGoCryptoRequestLink(result);
                goCryptoPaymentDetails.value = goCryptoRequestLink
                    ? await fetchGoCryptoPaymentDetails(goCryptoRequestLink)
                    : null;
                if (goCryptoPaymentDetails.value && !goCryptoStatus.value) {
                    // Reformat into a Nimiq request link and redirect to it as path which will be handled by the router
                    router.replace(`/${createNimiqRequestLink(goCryptoPaymentDetails.value.recipient, {
                        amount: goCryptoPaymentDetails.value.amount,
                        label: goCryptoPaymentDetails.value.storeName,
                        type: NimiqRequestLinkType.URI,
                    })}`);
                }
            }
        };

        const goCryptoPaymentDetails = ref<GoCryptoPaymentDetails>(null);
        function resetGoCryptoPaymentDetails() {
            goCryptoPaymentDetails.value = null;
        }

        const goCryptoStatus = computed(() => {
            if (!goCryptoPaymentDetails.value) return null;
            const successDefaults = {
                // Note: StatusScreen does not support actions for success screens.
                state: StatusScreenState.SUCCESS,
            };
            const errorDefaults = {
                state: StatusScreenState.WARNING,
                // Concatenate sentences to re-use individual translations.
                // eslint-disable-next-line prefer-template
                message: context.root.$t('Please ask the merchant to create a new payment request.') + ' '
                    + context.root.$t('If you already made a payment, please contact GoCrypto for a refund.'),
                mainAction: 'OK', // no need to translate this
                onMainAction: resetGoCryptoPaymentDetails,
            };
            switch (goCryptoPaymentDetails.value.status) {
                case GoCryptoPaymentStatus.Paid: return {
                    ...successDefaults,
                    title: context.root.$t('Payment request has already been paid'),
                };
                case GoCryptoPaymentStatus.Processing: return {
                    ...successDefaults,
                    title: context.root.$t('Your payment is being processed'),
                };
                case GoCryptoPaymentStatus.Failed: return {
                    ...errorDefaults,
                    title: context.root.$t('Your payment failed'),
                };
                case GoCryptoPaymentStatus.NotValid: return {
                    ...errorDefaults,
                    title: context.root.$t('Your payment is invalid'),
                };
                case GoCryptoPaymentStatus.Refund: return {
                    ...errorDefaults,
                    title: context.root.$t('Your payment was refunded'),
                    message: context.root.$t('Please ask the merchant to create a new payment request.'),
                };
                case GoCryptoPaymentStatus.Cancelled: return {
                    ...errorDefaults,
                    title: context.root.$t('Your payment was cancelled'),
                };
                default: // do nothing and continue with checks below
            }
            if (goCryptoPaymentDetails.value.status === GoCryptoPaymentStatus.AutoClosed
                || goCryptoPaymentDetails.value.expiry < Date.now()) {
                return {
                    ...errorDefaults,
                    title: context.root.$t('The payment request expired'),
                };
            }
            return null; // Unpaid request without any errors.
        });

        let statusScreenHideTimeout = -1;
        watch(goCryptoStatus, () => {
            if (goCryptoStatus.value?.state === StatusScreenState.SUCCESS) {
                // The success screen has no ok button, therefore auto-close it.
                statusScreenHideTimeout = window.setTimeout(resetGoCryptoPaymentDetails, 3000);
            } else {
                clearTimeout(statusScreenHideTimeout);
            }
        });

        return {
            checkResult,
            goCryptoStatus,
            resetGoCryptoPaymentDetails,
        };
    },
    components: {
        PageBody,
        QrScanner,
        StatusScreen,
        Modal,
    },
});
</script>

<style lang="scss" scoped>
.modal ::v-deep .close-button {
    display: none;
}

.page-body {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    padding: 1rem;
}

.qr-scanner {
    border-radius: 0.5rem;
    flex-grow: 1;
}

@media (max-width: 700px) { // Full mobile breakpoint
    .modal ::v-deep {
        .wrapper,
        .small-page {
            height: 100%;
            max-height: 100%;
            border-radius: 0;
            min-width: 100vw;
        }

        .swipe-bar {
            background: var(--text-20);
            backdrop-filter: invert(1);
        }
    }

    .page-body {
        padding: 0;
    }

    .qr-scanner {
        border-radius: 0;

        ::v-deep .cancel-button {
            bottom: 6rem;
        }

        ::v-deep .access-denied-instructions {
            bottom: 13rem;
        }
    }
}
</style>
