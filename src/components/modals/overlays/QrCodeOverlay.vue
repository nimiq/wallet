<template>
    <div class="qr-code-overlay">
        <PageBody class="flex-column">
            <QrCode
                :data="address"
                :size="520"
                :fill="'#1F2348' /* nimiq-blue */"
                class="qr-code"
            />
            <p class="qr-info-text nq-light-blue">{{ $t('Scan the code to send\nmoney to this address') }}</p>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody, QrCode } from '@nimiq/vue-components';

export default defineComponent({
    props: {
        address: {
            type: String,
            required: true,
        },
    },
    components: {
        PageBody,
        QrCode,
    },
});
</script>

<style lang="scss" scoped>
.qr-code-overlay,
.qr-code-overlay .page-body {
    height: 100%;
}

.qr-code-overlay .page-body {
    justify-content: space-evenly;
    align-items: center;
    min-height: 56rem;

    .flex-spacer {
        height: 2rem;
    }

    .qr-code {
        // The QrCode is rendered at 2x size and then scaled to half its size,
        // to be sharp on retina displays:
        // 2 x 260px = 520px
        // But now we need to make it behave as half its size as well, that's
        // why we use negative margins on all sides (130px = 260px / 2).
        transform: scale(0.5);
        margin: -130px;
    }

    .qr-info-text {
        font-size: var(--h2-size);
        font-weight: 600;
        white-space: pre;
        text-align: center;
    }
}
</style>
