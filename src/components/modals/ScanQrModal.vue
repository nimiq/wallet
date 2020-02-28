<template>
    <Modal>
        <SmallPage class="scan-qr-modal">
            <PageHeader>Scan Qr Code</PageHeader>
            <PageBody><QrScanner @result="checkResult" @cancel="$router.back()" /></PageBody>
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import { CloseButton, PageBody, PageHeader, SmallPage, QrScanner } from '@nimiq/vue-components';
import { parseRequestLink, createNimiqRequestLink, NimiqRequestLinkType } from '@nimiq/utils';
import Modal from './Modal.vue';
import { useRouter } from '../../router';

export default createComponent({
    name: 'scan-qr-modal',
    setup() {
        const router = useRouter();
        const checkResult = (result: string) => {
            // parseRequestLink has not implemented urischemes appending an url yet.
            // checkResult('http://localhost:8081/nimiq:NQ35SB3EB8XAESYER574SJA4EEFTX0VQQ5T1?amount=12&message=asd');
            // does not give an result for any of the below combinations of arguments to parseRequestLink
            // Thus check to see if the url is present and if so remove it including the trailing '/'
            if (result.startsWith(window.location.origin) && result.length > window.location.origin.length + 1) {
                result = result.substr(window.location.origin.length + 1);
            }

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

            if (/https:\/\/hub\.nimiq(-testnet)?\.com\/cashlink\//.test(result)) {
                // result is a cashlink so redirect to hub
                window.location.replace(result);
            }
        };

        return {
            checkResult,
        };
    },
    components: {
        CloseButton,
        PageBody,
        PageHeader,
        QrScanner,
        SmallPage,
        Modal,
    } as any,
});
</script>

<style lang="scss" scoped>
.scan-qr-modal {
    position: relative;
    width: 52.5rem !important; /* 420px */
    padding: 2rem;

    .page-body {

        display: flex;
        flex-direction: column;
        justify-content: space-evenly;

        .qr-scanner {
            border-radius: 1rem;
            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
            align-items: center;
            flex-grow: 1;
        }
    }
}
</style>
