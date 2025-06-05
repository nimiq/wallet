<template>
    <!-- Pass down all attributes not declared as props --->
    <Modal v-bind="$attrs" v-on="$listeners" class="network-info-modal" closeButtonInverse :swipePadding="false">
        <PageBody :style="height !== 0 ? `--height: calc(${height}px)`: ''">
            <div class="image">
                <img src="../../assets/browser-network.png" alt="Browser Network Graph" />
            </div>

            <div ref="textDiv$">
                <h1 class="nq-h1">{{ $t('With Nimiq, you\'re a\npart of the Blockchain.') }}</h1>
                <p>
                    {{ $t('Unlike any other crypto, Nimiq connects your wallet directly to peers from all around' +
                        ' the world. This makes you a first-class citizen of the blockchain.') }}
                </p>
                <p>
                    {{ $t('Send and receive NIM to the Blockchain without anyone in-between.' +
                        ' Be truly censorship-resistant.') }}
                </p>
                <BlueLink href="https://www.youtube.com/watch?v=dA40oyDVtqs" target="_blank" rel="noopener">
                    {{ $t('Learn more') }}
                </BlueLink>
            </div>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { PageBody } from '@nimiq/vue-components';
import { nextTick } from '@/lib/nextTick';
import Modal from './Modal.vue';
import BlueLink from '../BlueLink.vue';

export default defineComponent({
    setup() {
        /**
         * This is needed to update the height of the .image element since we're using the `shape-outside` property
         * and that the img inside need to be vertically centered. This cannot be done with css only unfortunately.
         * Reminder: The `shape-outside` property needs the element to be floating and to have a defined height
         *  (and not `height: 100%`)
         */
        const textDiv$ = ref<HTMLDivElement>(null);
        const height = ref<number>(0);

        async function updateHeight() {
            await nextTick();
            if (textDiv$.value && height.value !== textDiv$.value.clientHeight) {
                height.value = textDiv$.value.clientHeight;
            }
        }

        async function onResize() {
            height.value = 0;
            await updateHeight();
            await updateHeight(); // Needs to be called twice due to the `shape-outside` property
        }

        onMounted(() => {
            onResize();
            window.addEventListener('resize', onResize);
        });

        onUnmounted(() => window.removeEventListener('resize', onResize));

        return {
            textDiv$,
            height,
        };
    },
    components: {
        Modal,
        PageBody,
        BlueLink,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";

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
}

.nq-h1 {
    margin-top: 0;
    margin-bottom: 2rem;
    max-width: 20ch;
}

p, a {
    font-size: var(--body-size);
}

a {
    display: inline-flex;
}

@media (min-width: $mobileBreakpoint) { // Full mobile breakpoint
    .modal {
        display: block;

        ::v-deep .wrapper {
            position: absolute;

            .small-page {
                width: 47.25rem;
            }
        }
    }

    .page-body {
        --padding: 3rem;
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .image img {
        max-height: 36rem;
    }
}

@media screen and (min-width: $mobileBreakpoint) {
    .modal {
        display: grid;
        place-items: center;
    }
}
</style>
