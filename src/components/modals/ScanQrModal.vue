<template>
    <Modal class="scan-qr-modal" :swipePadding="false"
        :showOverlay="goCryptoStatus && goCryptoStatus.paymentStatus !== 'pending'"
        @close-overlay="resetGoCryptoPaymentStatus">
        <PageBody>
            <QrScanner @result="checkResult" @cancel="$router.back()" />
        </PageBody>

        <template #overlay v-if="!!goCryptoStatus">
            <StatusScreen
                :state="goCryptoStatus.paymentStatus === 'accepted'
                    ? StatusScreenState.SUCCESS
                    : StatusScreenState.WARNING"
                :title="goCryptoStatus.title"
                :message="goCryptoStatus.message"
                mainAction="Ok"
                @main-action="resetGoCryptoPaymentStatus"
            />
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
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
import StatusScreen, { State as StatusScreenState, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { useAccountStore } from '../../stores/Account';
import { useConfig } from '../../composables/useConfig';
import { useRouter } from '../../router';
import {
    normalizeAddress as normalizeBitcoinAddress,
    validateAddress as validateBitcoinAddress,
} from '../../lib/BitcoinTransactionUtils';
import {
    GOCRYPTO_ID_PARAM,
    parseGoCryptoRequestLink,
    fetchGoCryptoPaymentDetails,
    goCryptoStatusToUserFriendlyMessage,
} from '../../lib/GoCrypto';
import { ENV_MAIN } from '../../lib/Constants';
import { loadBitcoinJS } from '../../lib/BitcoinJSLoader';
import { loadEthersLibrary } from '../../ethers';

export default defineComponent({
    name: 'scan-qr-modal',
    setup() {
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
            // Note that for Nimiq, parseRequestLink automatically validates and normalizes addresses.
            const nimRequestLink = parseRequestLink(result, { currencies: [Currency.NIM] });
            if (nimRequestLink) {
                // Reformat into the new Nimiq request link uri format, in case it's an old Safe url.
                const nimRequestLinkUri = new URL(createNimiqRequestLink(nimRequestLink.recipient, {
                    ...nimRequestLink,
                    type: NimiqRequestLinkType.URI,
                }));
                // If the request includes a GoCrypto id, pass it on to SendModal. We don't handle it here yet, to be
                // able to redirect to SendModal quicker, without having to wait for the GoCrypto api, as the usual case
                // should be that there are no errors. Potential GoCrypto errors or a mismatch of the payment info in
                // the request link and the info fetched from GoCrypto are then handled in SendModal.
                // Ensure that scan result includes protocol (which is optional for Nimiq Safe links) to be a valid URL.
                const goCryptoId = new URL(result.replace(/^(?:\w+:)?/, 'dummy:')).searchParams.get(GOCRYPTO_ID_PARAM);
                if (goCryptoId) {
                    nimRequestLinkUri.searchParams.set(GOCRYPTO_ID_PARAM, goCryptoId);
                }
                // Redirect to request link as path which will be handled by the router. If a GoCrypto id is set, don't
                // replace the route, such that user can navigate back to the scanner from SendModal on GoCrypto errors.
                (goCryptoId ? router.push : router.replace)(`/${nimRequestLinkUri}`);
                return;
            }

            if (config.enableBitcoin && hasBitcoinAddresses.value) {
                loadBitcoinJS().then(() => {
                    // BTC Address
                    if (validateBitcoinAddress(result)) {
                        router.replace(`/${createBitcoinRequestLink(result)}`);
                        return;
                    }

                    // BTC Request Link
                    const btcRequestLink = parseRequestLink(result, {
                        currencies: [Currency.BTC],
                        normalizeAddress: {
                            [Currency.BTC]: normalizeBitcoinAddress,
                        },
                        isValidAddress: {
                            [Currency.BTC]: validateBitcoinAddress,
                        },
                    });
                    if (btcRequestLink) {
                        // Redirect to the valid Bitcoin request link as path which will be handled by the router.
                        router.replace(`/${result}`);
                    }
                });
            }

            if (config.usdc.enabled && hasUsdcAddresses.value) {
                loadEthersLibrary().then((ethers) => {
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
                        // The address normalization and validation are shared between ETH, MATIC and USDC.
                        normalizeAddress: {
                            [Currency.ETH]: (address: string) => {
                                try {
                                    // Normalize address to checksummed version. Throws for invalid address.
                                    return ethers.utils.getAddress(address);
                                } catch (e) {
                                    return address;
                                }
                            },
                        },
                        isValidAddress: {
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
                const goCryptoPaymentDetails = goCryptoRequestLink
                    ? await fetchGoCryptoPaymentDetails(goCryptoRequestLink)
                    : null;
                goCryptoStatus.value = goCryptoPaymentDetails
                    ? goCryptoStatusToUserFriendlyMessage(goCryptoPaymentDetails)
                    : null;
                if (goCryptoPaymentDetails && !('errorCode' in goCryptoPaymentDetails)
                    && goCryptoStatus.value?.paymentStatus === 'pending') {
                    // Forward to SendModal by reformatting the request into a Nimiq request link uri.
                    const nimRequestLinkUri = new URL(createNimiqRequestLink(goCryptoPaymentDetails.recipient, {
                        amount: goCryptoPaymentDetails.amount,
                        label: goCryptoPaymentDetails.storeName,
                        type: NimiqRequestLinkType.URI,
                    }));
                    nimRequestLinkUri.searchParams.set(GOCRYPTO_ID_PARAM, goCryptoPaymentDetails.id); // for SendModal
                    // Redirect to request link as path which will be handled by the router. Don't replace the route,
                    // such that the user can navigate back to the scanner from SendModal on GoCrypto errors.
                    router.push(`/${nimRequestLinkUri}`);
                } else if (goCryptoStatus.value?.paymentStatus === 'accepted') {
                    // The success screen has no dismiss button, therefore auto-close it.
                    setTimeout(() => {
                        if (goCryptoStatus.value?.paymentStatus !== 'accepted') return;
                        resetGoCryptoPaymentStatus();
                    }, SUCCESS_REDIRECT_DELAY);
                }
            }
        };

        const goCryptoStatus = ref<ReturnType<typeof goCryptoStatusToUserFriendlyMessage>>(null);
        function resetGoCryptoPaymentStatus() {
            goCryptoStatus.value = null;
        }

        return {
            StatusScreenState,
            checkResult,
            goCryptoStatus,
            resetGoCryptoPaymentStatus,
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
