<template>
    <div class="mobile-action-bar flex-row">
        <button class="receive nq-button-s flex-row" @click="$router.push('/receive')" @mousedown.prevent>
            <ArrowRightSmallIcon />Receive
        </button>
        <button class="send nq-button-pill light-blue flex-row"
            @click="$router.push('/send')" @mousedown.prevent
            :disabled="!activeAddressInfo || !activeAddressInfo.balance"
        >
            <ArrowRightSmallIcon />Send
        </button>
        <button class="reset scan-qr" @click="$router.push('/scan')">
            <ScanQrCodeIcon/>
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { ArrowRightSmallIcon, ScanQrCodeIcon } from '@nimiq/vue-components';
import { useAddressStore } from '../stores/Address';

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();

        return {
            activeAddressInfo,
        };
    },
    components: {
        ArrowRightSmallIcon,
        ScanQrCodeIcon,
    },
});
</script>

<style lang="scss" scoped>
.mobile-action-bar {
    justify-content: space-between;
    align-items: center;
    padding: 2rem;
    background: white;

    display: none;
}

.send, .receive {
    margin: 0;
    justify-content: center;
    align-items: center;

    padding: 1.5rem 0;
    flex-grow: 1;
    height: unset;
    line-height: 1;
    border-radius: 500px;
    font-size: 2rem;

    .nq-icon {
        font-size: 1.75rem;
        margin-right: 1rem;
    }

    &:disabled {
        opacity: 0.5;
        pointer-events: none;
    }
}

.send {
    margin-left: 1rem;

    .nq-icon {
        transform: rotateZ(-90deg);
    }
}

.receive .nq-icon {
    transform: rotateZ(90deg);
}

.scan-qr {
    padding: 0.5rem;
    font-size: 4rem;
    opacity: 0.4;
    margin-left: 2rem;
}

@media (max-width: 700px) { // Full mobile breakpoint
    .mobile-action-bar {
        display: flex;
    }
}
</style>
