<template>
    <Modal class="coinify-modal" emitClose @close="close">
        <header class="flex-row">
            <Tooltip preferredPosition="bottom right">
                <InfoCircleSmallIcon slot="trigger"/>
                <i18n path="This service is operated by {link}" tag="span">
                    <a slot="link" href="https://coinify.com" target="_blank" rel="noopener">coinify.com</a>
                </i18n>
            </Tooltip>
            <span class="nq-label">Coinify</span>
            <div class="flex-spacer"></div>
        </header>
        <div class="separator"></div>
        <iframe
            :src="widgetUrl"
            title="Coinify trade widget"
            allow="camera;fullscreen;accelerometer;gyroscope;magnetometer;payment"
            allowfullscreen
            class="widget-iframe flex-grow"
        />
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import { Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import { useConfig } from '../../composables/useConfig';
import router from '@/router';

export default defineComponent({
    name: 'CoinifyModal',
    components: { Modal, Tooltip, InfoCircleSmallIcon },
    setup() {
        const { config } = useConfig();

        const widgetUrl = computed(() => {
            const url = new URL(config.coinify.widgetUrl);
            url.searchParams.set('partnerId', config.coinify.partnerId);
            return url.toString();
        });

        function close() {
            // Force navigation to home instead of using router.back()
            // to avoid issues with Simplex widget interfering with browser history
            router.push('/');
        }

        return {
            widgetUrl,
            close,
        };
    },
});
</script>

<style lang="scss" scoped>
.modal ::v-deep .small-page {
    height: 106rem;
}

header {
    justify-content: space-between;
    align-items: center;
    padding: 2rem 3rem;

    .tooltip ::v-deep {
        .trigger {
            color: var(--text-30);
        }

        .tooltip-box {
            font-size: var(--small-size);
            width: 23.5rem;

            a {
                color: inherit;
            }
        }
    }

    .nq-label {
        font-size: 2rem;
    }

    .flex-spacer {
        width: 2.25rem;
    }
}

.separator {
    height: 2px;
    margin: -2px 2rem 2px;
    box-shadow: 0 1.5px 0 0 var(--text-14);
}

.widget-iframe {
    border: none;
    width: 100%;
    border-bottom-left-radius: 1.25rem;
    border-bottom-right-radius: 1.25rem;
}
</style>
