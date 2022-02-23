<template>
    <!-- Pass down all attributes not declared as props --->
    <Modal v-bind="$attrs" v-on="$listeners" class="network-info-modal" closeButtonInverse :swipePadding="false">
        <PageBody :style="height !== 0 ? `--height: calc(${height}px)`: ''">
            <div class="image">
                <img src="../../assets/browser-network.png" alt="Browser Network Graph" />
            </div>

            <div ref="$textDiv" class="content">
                <h1 class="nq-h1">{{ $t('You are a part of the Nimiq Blockchain.') }}</h1>
                <p>
                    {{ $t('Your browser connects directly to a set of peers from all around the world. ' +
                    'This makes you a first-class citizen of the blockchain.') }}
                </p>
                <p>
                    {{ $t('Send and receive NIM without a middleman and enjoy true decentralization.') }}
                </p>
                <button class="nq-button-pill light-blue" @click="goToNetworkTour()">
                    {{ $t('Start Network Tour') }}
                    <ArrowRightSmallIcon/>
                </button>
            </div>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from '@vue/composition-api';
import { PageBody, ArrowRightSmallIcon } from '@nimiq/vue-components';
import { useAccountStore } from '@/stores/Account';
import { TourName } from '@/lib/tour';
import Modal from './Modal.vue';

export default defineComponent({
    setup(props, context) {
        /**
         * This is needed to update the height of the .image element since we're using the `shape-outside` property
         * and that the img inside need to be vertically centered. This cannot be done with css only unfortunately.
         * Reminder: The `shape-outside` property needs the element to be floating and to have a defined height
         *  (and not `height: 100%`)
         */
        const $textDiv = ref<HTMLDivElement | null>(null);
        const height = ref<number>(0);

        async function updateHeight() {
            await context.root.$nextTick();
            if ($textDiv.value && height.value !== $textDiv.value.clientHeight) {
                height.value = $textDiv.value.clientHeight;
            }
        }

        async function onResize() {
            height.value = 0;
            await updateHeight();
            await updateHeight(); // Needs to be called twice due to the `shape-outside` property
        }

        function goToNetworkTour() {
            useAccountStore().setTour({ name: TourName.NETWORK, step: 0 });
            context.emit('close');
        }

        onMounted(() => {
            onResize();
            window.addEventListener('resize', onResize);
        });

        onUnmounted(() => window.removeEventListener('resize', onResize));

        return {
            $textDiv,
            height,
            goToNetworkTour,
        };
    },
    components: {
        Modal,
        PageBody,
        ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.modal {
    position: absolute;
    background: transparent;
    pointer-events: none;

    ::v-deep .wrapper {
        .small-page {
            min-height: unset;
            color: white;
            background: #302949; // Determined by Julian
            box-shadow: none;
            pointer-events: all;

            /**
             * Backdrop Blur can be enabled once these bugs are fixed in browsers:
             * - blur is also applied during transform transitions
             * - (iOS) Safari blurs the whole background of the element, not just where text is
             * - the majority of browsers support it
             */

            // background: rgba(255, 255, 255, 0.2);
            // backdrop-filter: blur(1rem);
        }

        .swipe-bar {
            background: rgba(255, 255, 255, 0.14);
        }
    }
}

.page-body {
    --padding: 4rem;
    --height: var(--padding); // default value, will be updated with Javascript

    padding: var(--padding);
    touch-action: none;

    .image {
        display: inline-flex;
        flex-direction: column;
        justify-content: center;
        height: var(--height);
        margin-right: calc(var(--padding) * -1);
        float: right;
        shape-outside: polygon(
            100% 8%,
            45.17% 16.09%,
            33% 44.67%,
            -8.22% 45.33%,
            -8.83% 68.3%,
            47.61% 68.11%,
            100% 100%
        );

        img {
            height: 100%;
            width: auto;
            max-height: 38rem;
        }
    }

    .content {
        .nq-h1 {
            margin-top: 0;
            margin-bottom: 2rem;
            margin-right: 5rem;
        }

        p, button {
            font-size: var(--body-size);
        }

        button {
            margin-top: 1.75rem;
            display: inline-flex;
            align-items: center;
            gap: 1.5rem;
        }

        .nq-icon {
            transition: transform 0.25s var(--nimiq-ease);
        }

        &:hover .nq-icon,
        &:focus .nq-icon {
            transform: translateX(0.25rem);
        }
    }
}

@media (min-width: 700px) { // Full mobile breakpoint
    .modal {
        display: block;

        ::v-deep .wrapper {
            position: absolute;
            right: 2.25rem;
            top: 2.25rem;

            .small-page {
                width: 47.25rem;
            }
        }
    }

    .page-body {
        --padding: 3rem;

        button {
            margin-top: 1.5rem;
        }
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .image img {
        max-height: 36rem;
    }
}
</style>
