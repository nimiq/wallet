<template>
    <Modal class="scan-qr-modal">
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
import Config from 'config';
import Modal from './Modal.vue';
import { useRouter } from '../../router';
import { parseBitcoinUrl, validateAddress } from '../../lib/BitcoinTransactionUtils';
import { ENV_MAIN } from '../../lib/Constants';
import { loadBitcoinJS } from '../../lib/BitcoinJSLoader';
import { useAccountStore } from '../../stores/Account';

export default defineComponent({
    name: 'scan-qr-modal',
    setup() {
        const router = useRouter();
        const checkResult = async (result: string) => {
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

            const { activeAccountInfo } = useAccountStore();
            if (
                activeAccountInfo.value
                && activeAccountInfo.value.btcAddresses
                && activeAccountInfo.value.btcAddresses.external.length > 0
            ) {
                await loadBitcoinJS();

                // BTC Address
                if (validateAddress(result, Config.environment === ENV_MAIN ? 'MAIN' : 'TEST')) {
                    router.replace(`/${createBitcoinRequestLink(result)}`);
                    return;
                }

                // BTC Request Link
                try {
                    parseBitcoinUrl(result);
                    // If the above does not throw, we have a valid BTC request link
                    router.replace(`/${result}}`);
                    return; // eslint-disable-line no-useless-return
                } catch (error) {
                    // Ignore
                }
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
    }
}
</style>
