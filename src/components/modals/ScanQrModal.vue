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
    NimiqRequestLinkType,
    ValidationUtils,
    createBitcoinRequestLink,
} from '@nimiq/utils';
import Modal from './Modal.vue';
import { useAccountStore } from '../../stores/Account';
import { useConfig } from '../../composables/useConfig';
import { useRouter } from '../../router';
import { parseBitcoinUrl, validateAddress } from '../../lib/BitcoinTransactionUtils';
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
            // NIM Address
            if (ValidationUtils.isValidAddress(result)) {
                router.replace(`/${createNimiqRequestLink(result, {
                    type: NimiqRequestLinkType.URI,
                })}`);
                return;
            }

            // parseRequestLink has not implemented urischemes appending an url yet.
            // checkResult('http://localhost:8081/nimiq:NQ35SB3EB8XAESYER574SJA4EEFTX0VQQ5T1?amount=12&message=asd');
            // does not give an result for any of the below combinations of arguments to parseRequestLink
            result = result.replace(`${window.location.origin}/`, '');

            // NIM Request Link
            try {
                const requestLink = parseRequestLink(result, undefined, true)
                    || parseRequestLink(result, 'safe.nimiq.com', true)
                    || parseRequestLink(result, 'safe.nimiq-testnet.com', true);

                if (requestLink) {
                    // console.error(requestLink);
                    // replace old request Link formats with the new one and redirect.
                    router.replace(`/${createNimiqRequestLink(requestLink.recipient, {
                        ...requestLink,
                        type: NimiqRequestLinkType.URI,
                    })}`);
                    return;
                }
            } catch (error) {
                // Ignore
            }

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

            if (config.enableBitcoin && hasBitcoinAddresses.value) {
                loadBitcoinJS().then(() => {
                    // BTC Address
                    if (validateAddress(result, config.environment === ENV_MAIN ? 'MAIN' : 'TEST')) {
                        router.replace(`/${createBitcoinRequestLink(result)}`);
                        return;
                    }

                    // BTC Request Link
                    try {
                        parseBitcoinUrl(result);
                        // If the above does not throw, we have a valid BTC request link
                        router.replace(`/${result}`);
                    } catch (error) {
                        // Ignore
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
