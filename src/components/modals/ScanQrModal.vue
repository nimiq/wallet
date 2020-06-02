<template>
    <Modal class="scan-qr-modal">
        <PageBody>
            <QrScanner @result="checkResult" @cancel="$router.back()" />
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody, QrScanner } from '@nimiq/vue-components';
import { parseRequestLink, createNimiqRequestLink, NimiqRequestLinkType } from '@nimiq/utils';
import Modal from './Modal.vue';
import { useRouter } from '../../router';

export default defineComponent({
    name: 'scan-qr-modal',
    setup() {
        const router = useRouter();
        const checkResult = (result: string) => {
            // parseRequestLink has not implemented urischemes appending an url yet.
            // checkResult('http://localhost:8081/nimiq:NQ35SB3EB8XAESYER574SJA4EEFTX0VQQ5T1?amount=12&message=asd');
            // does not give an result for any of the below combinations of arguments to parseRequestLink
            result = result.replace(`${window.location.origin}/`, '');

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
                window.location.href = result;
            }
        };

        return {
            checkResult,
        };
    },
    components: {
        PageHeader,
        PageBody,
        QrScanner,
        Modal,
    } as any,
});
</script>

<style lang="scss" scoped>
.modal /deep/ .close-button {
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
    .modal /deep/ {
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

        /deep/ .cancel-button {
            bottom: 6rem;
        }
    }
}
</style>
