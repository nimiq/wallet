<template>
    <Modal v-bind="$attrs" v-on="$listeners" emitClose ref="$modal" @close="close">
        <PageHeader>
            Feedback
        </PageHeader>

        <PageBody>
           <div id="feedback-container" ref="feedbackContainer"></div>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import type { WidgetInstance, FormType } from '@/types/feedback-widget';

export default defineComponent({
    name: 'NimiqFeedbackModal',
    setup() {
        const $modal = ref<Modal | null>(null);
        const feedbackContainer = ref<HTMLElement | null>(null);
        const widget = ref<WidgetInstance | null>(null);

        async function close() {
            if (widget.value) {
                widget.value.destroy();
            }
            await $modal.value?.forceClose();
        }

        function showForm(type: FormType) {
            if (widget.value) {
                widget.value.showForm(type);
            }
        }

        function showFormGrid() {
            if (widget.value) {
                widget.value.showFormGrid();
            }
        }

        onMounted(() => {
            // Load CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://nq-feedback.maximogarciamtnez.workers.dev/widget.css';
            document.head.appendChild(cssLink);

            // Load JS
            const script = document.createElement('script');
            script.src = 'https://nq-feedback.maximogarciamtnez.workers.dev/widget.js';
            script.defer = true;
            script.onload = () => {
                if (feedbackContainer.value && window.mountFeedbackWidget) {
                    widget.value = window.mountFeedbackWidget('#feedback-container', {
                        app: 'nimiq-wallet',
                        lang: 'en',
                    });

                    // Show the form grid once loaded
                    widget.value.showFormGrid();

                    // Optional: Listen for events
                    if (widget.value.communication) {
                        widget.value.communication.on('form-submitted', (data) => {
                            // eslint-disable-next-line no-console
                            console.log('Feedback submitted:', data);
                            // TODO
                        });
                    }
                }
            };
            document.head.appendChild(script);
        });

        onUnmounted(() => {
            if (widget.value) {
                widget.value.destroy();
            }
        });

        return { $modal, feedbackContainer, close, showForm, showFormGrid };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';
@import '../../scss/variables.scss';

#feedback-container {
    width: 100%;
    min-height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
</style>
