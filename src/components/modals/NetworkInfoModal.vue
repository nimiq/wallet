<template>
    <!-- Pass down all attributes not declared as props --->
    <Modal v-bind="$attrs" v-on="$listeners" class="network-info-modal" closeButtonInverse>
        <PageBody>
            <img src="../../assets/browser-network.png" alt="Browser Network Graph">

            <h1 class="nq-h1">{{ $t('You are a part of the Nimiq Blockchain.') }}</h1>
            <p>
                {{ $t('Your browser connects directly to a set of peers from all around the world. ' +
                'This makes you a first-class citizen of the blockchain.') }}
            </p>
            <p>
                {{ $t('Send and receive NIM without a middleman and enjoy true decentralization.') }}
            </p>
            <BlueLink href="https://www.youtube.com/watch?v=dA40oyDVtqs" target="_blank">
                {{ $t('Learn more') }}
            </BlueLink>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import BlueLink from '../BlueLink.vue';

export default defineComponent({
    components: {
        Modal,
        PageBody,
        BlueLink,
    },
});
</script>

<style lang="scss" scoped>
.modal {
    position: absolute;
    background: transparent;
    pointer-events: none;

    /deep/ .wrapper {
        pointer-events: all;

        .small-page {
            height: unset;
            color: white;
            background: #302949; // Determined by Julian
            box-shadow: none;

            /**
             * Backdrop Blur can be enabled once these bugs are fixed in browsers:
             * - blur is also applied during transform transitions
             * - (iOS) Safari blurs the whole background of the element, not just where text is
             * - the majority of browsers support it
             */

            // background: rgba(255, 255, 255, 0.2);
            // backdrop-filter: blur(1rem);
        }
    }
}

.page-body {
    padding: 4rem;
}

img {
    float: right;
    height: 38rem;
    padding-left: 5rem;
    shape-outside: polygon(50% 0, 100% 0, 100% 100%, 0% 100%, 15% 55%);
    margin-right: -3rem;
    margin-bottom: -3rem;
    pointer-events: none;
    // user-select: none;
}

.nq-h1 {
    margin-top: 0;
    margin-bottom: 2rem;
}

p, a {
    font-size: var(--body-size);
}

a {
    display: inline-flex;
}

@media (min-width: 700px) { // Full mobile breakpoint
    .modal {
        display: block;

        /deep/ .wrapper {
            position: absolute;
            right: 2.25rem;
            top: 2.25rem;

            .small-page {
                width: 47.25rem;
            }
        }
    }

    .page-body {
        padding: 3rem;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    img {
        padding-left: 3rem;
        margin-right: -4rem;
        margin-bottom: -4rem;
        height: 36rem;
    }
}
</style>
