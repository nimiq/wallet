<template>
    <Modal class="scan-qr-modal" :swipePadding="false">
        <PageBody>
            <QrScanner @result="checkResult" @cancel="$router.back()" />
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody, QrScanner } from '@nimiq/vue-components';
import {
    parseRequestLink,
    createNimiqRequestLink,
    createBitcoinRequestLink,
    NimiqRequestLinkType,
    ValidationUtils,
    Currency,
} from '@nimiq/utils';
import Modal from './Modal.vue';
import { useAccountStore } from '../../stores/Account';
import { useConfig } from '../../composables/useConfig';
import { useRouter } from '../../router';
import { validateAddress as validateBitcoinAddress } from '../../lib/BitcoinTransactionUtils';
import { ENV_MAIN } from '../../lib/Constants';
import { loadBitcoinJS } from '../../lib/BitcoinJSLoader';
import { getPolygonClient } from '../../ethers';

export default defineComponent({
    name: 'scan-qr-modal',
    setup() {
        const { config } = useConfig();
        const router = useRouter();
        const { hasBitcoinAddresses, hasUsdcAddresses } = useAccountStore();
        const checkResult = (result: string) => {
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

            // NIM Address
            if (ValidationUtils.isValidAddress(result)) {
                router.replace(`/${createNimiqRequestLink(result, {
                    type: NimiqRequestLinkType.URI,
                })}`);
                return;
            }

            // Remove the origin to support scanning full wallet links with encoded payment request link, e.g.
            // http://localhost:8081/nimiq:NQ35SB3EB8XAESYER574SJA4EEFTX0VQQ5T1?amount=12&message=asd
            result = result.replace(`${window.location.origin}/`, '');

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
                    // Plain USDC/Polygon/ETH address.
                    // TODO support Polygon-USDC request links and even consider removing scanning of plain addresses
                    //  due to the risk of USDC being sent on the wrong chain.
                    if (ethers.utils.isAddress(result)) {
                        // Pass normalized address.
                        router.replace(`/polygon:${ethers.utils.getAddress(result)}`);
                    }
                });
            }
        };

        return {
            checkResult,
        };
    },
    components: {
        PageBody,
        QrScanner,
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
