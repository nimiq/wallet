<template>
    <Modal ref="modal$">
        <PageBody class="grid-layout">
            <div class="content-column">
                <img src="@/assets/multisig-logo.svg" alt="Multisig" class="logo">
                <h1 class="nq-h1">{{ $t('Check out Nimiq Multisig Wallets') }}</h1>
                <p class="nq-text">
                    {{ $t('Share wallets with family, friends, and business partners.') }}
                </p>
                <i18n
                    tag="p"
                    path="Read all about it in this {blog_post} or get right into it."
                    class="nq-text secondary"
                >
                    <template #blog_post>
                        <a href="https://www.nimiq.com/blog/" target="_blank" rel="noopener">{{ $t('blog post') }}</a>
                    </template>
                </i18n>
                <div class="flex-grow"></div>
                <button class="nq-button light-blue" @click="visitMultisig" @mousedown.prevent>
                    {{ $t('VISIT MULTISIG.NIMIQ.COM') }}
                </button>
                <a class="nq-link" @click="close">{{ $t('Skip') }} <span class="chevron">›</span></a>
            </div>
            <div class="image-column">
                <img src="@/assets/multisig-announcement.webp" alt="Multisig App" class="hero-image">
            </div>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageBody } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import { MULTISIG_ANNOUNCEMENT_MODAL_LOCALSTORAGE_KEY } from '../../lib/Constants';

export default defineComponent({
    setup() {
        const modal$ = ref<Modal>(null);

        function visitMultisig() {
            window.open('https://multisig.nimiq.com', '_blank', 'noopener,noreferrer');
            close();
        }

        function close() {
            window.localStorage.setItem(MULTISIG_ANNOUNCEMENT_MODAL_LOCALSTORAGE_KEY, 'true');
            modal$.value!.forceClose();
        }

        return { modal$, visitMultisig, close };
    },
    components: { Modal, PageBody },
});
</script>

<style lang="scss" scoped>
.modal {
    ::v-deep .small-page {
        width: 91rem;
        max-height: 51.2rem;
        background: white;
        overflow: hidden;
    }

    ::v-deep .close-button {
        display: none;
    }
}

.page-body {
    &.grid-layout {
        display: grid;
        grid-template-columns: 0.55fr 0.45fr;
        gap: 0;
        padding: 0;
        height: 100%;
        grid-template-rows: minmax(0, 1fr);
    }
}

.content-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 8rem 2rem 4rem;
    min-height: 0;
}

.image-column {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    overflow: hidden;
    position: relative;
    min-height: 0;
}

.hero-image {
    width: auto;
    height: 100%;
    max-height: 100%;
    object-fit: cover;
    object-position: left top;
    transform: translateY(3.2rem);
}

.logo {
    width: 9.6rem;
    height: 9.6rem;
    margin-bottom: 3rem;
}

.nq-h1 {
    margin: 0 0 2rem;
    color: var(--nimiq-blue);
    text-wrap: balance;
}

.nq-text {
    color: var(--nimiq-blue);
    margin: 0 0 1.5rem;
    max-width: 30ch;
    text-wrap: pretty;
}

.secondary {
    color: var(--text-60);
    margin-bottom: 2rem;

    a {
        color: var(--text-60);
        text-decoration: underline;
    }
}

.nq-link {
    font-weight: 600;
    font-size: var(--small-size);
    color: var(--text-60);
    margin-bottom: -1.5rem;
    cursor: pointer;

    .chevron {
        font-size: 1.25em;
    }
}

.nq-button {
    align-self: stretch;
}

@media (max-width: 768px) {
    .modal {
        ::v-deep .small-page {
            width: 52.5rem;
            max-height: none;
        }
    }

    .page-body {
        &.grid-layout {
            grid-template-columns: 1fr;
            height: auto;
        }
    }

    .image-column {
        display: none !important;
    }

    .content-column {
        padding: 6rem 2rem 4rem;
    }
}
</style>
