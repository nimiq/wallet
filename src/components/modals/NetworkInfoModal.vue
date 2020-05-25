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
            <a href="https://www.youtube.com/watch?v=dA40oyDVtqs" class="nq-link flex-row" target="_blank">
                {{ $t('Learn more') }}<ArrowRightSmallIcon/>
            </a>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody, ArrowRightSmallIcon } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default defineComponent({
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

    /deep/ .wrapper {
        pointer-events: all;

        .small-page {
            height: unset;
            color: white;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(1rem);
        }
    }
}

.page-body {
    padding: 4rem;
}

img {
    float: right;
    height: 42rem;
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
    font-size: 2rem;
}

a {
    font-weight: bold;
    align-items: center;
    display: inline-flex;

    .nq-icon {
        font-size: 1.5rem;
        margin-left: 0.75rem;
        margin-top: 0.125rem;

        transition: transform var(--attr-duration) var(--nimiq-ease);
    }

    &:hover,
    &:focus {
        .nq-icon {
            transform: translateX(0.25rem);
        }
    }
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
                border-radius: 1rem;
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
    }
}
</style>
