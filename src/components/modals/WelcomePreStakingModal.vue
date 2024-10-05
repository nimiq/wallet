<template>
    <Modal class="welcome-prestaking-modal" ref="modal$" v-bind="$attrs" v-on="$listeners"
        emitClose :swipeToClose="false">
        <div class="modal-content">
            <div class="left-column">
                <h1 class="nq-h1">{{ $t('Nimiq Proof-of-Stake is coming!') }}</h1>
                <h2 class="nq-h2">
                    {{ $t('Get ready for a massive performance boost and earning NIM by staking your NIM.') }}
                </h2>
                <ul class="features">
                    <li>
                        <img src="/img/prestaking/welcome/icon-1.svg" alt="Fast transactions">
                        <span class="nq-text">{{ $t('Transactions are almost instant') }}</span>
                    </li>
                    <li>
                        <img src="/img/prestaking/welcome/icon-2.svg" alt="Eco-friendly">
                        <span class="nq-text">{{ $t('Nimiq becomes super eco-friendly') }}</span>
                    </li>
                    <li>
                        <img src="/img/prestaking/welcome/icon-3.svg" alt="Earn NIM">
                        <span class="nq-text">{{ $t('Earn new NIM by staking') }}</span>
                    </li>
                </ul>
                <p class="nq-notice">
                    {{ $t('The migration happens automatically, no action required.') }}
                </p>
                <button class="nq-button-s" @click="closeModal" @mousedown.prevent>
                    {{ $t('Continue to wallet') }}
                </button>
            </div>
            <div class="right-column">
                <img src="/img/prestaking/welcome/tickets.png" alt="Tickets" class="tickets-image">
                <div class="rewards">
                    <h2 class="nq-h2">{{ $t('200 Mil NIM in giveaways!') }}</h2>
                    <p>{{ $t('Join the giveaway campaign and pre-stake to win big NIM rewards.') }}</p>
                    <a
                        href="https://prestaking.nimiq.network" target="_blank" rel="noopener"
                        class="nq-button light-blue"
                    >
                        {{ $t('Campaign Page') }}
                        <!-- <ArrowRightSmallIcon /> -->
                        <svg class="nq-icon" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 11">
                            <path d="M10.069 1.033 1.937 9.164M3.379 1l6.686.032.032 6.685"
                                stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
// import { ArrowRightSmallIcon } from '@nimiq/vue-components';
import { WELCOME_PRE_STAKING_MODAL_LOCALSTORAGE_KEY } from '../../lib/Constants';
import Modal from './Modal.vue';

export default defineComponent({
    setup() {
        const modal$ = ref<Modal>(null);

        async function closeModal() {
            window.localStorage.setItem(WELCOME_PRE_STAKING_MODAL_LOCALSTORAGE_KEY, 'true');
            await modal$.value!.forceClose();
        }

        return {
            closeModal,
            modal$,
        };
    },
    components: {
        Modal,
        // ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/functions.scss';

.modal ::v-deep .small-page {
    width: 100%;
    max-width: 111.5rem;
    height: auto;
    min-height: unset;
    overflow: auto;
}

.modal ::v-deep .close-button {
    display: none;
}

.modal-content {
    display: flex;
    flex-direction: column; // Stack columns on mobile
    height: 100%;

    @media (min-width: $tabletBreakpoint) {
        flex-direction: row; // Side by side on tablet and larger
    }
}

.left-column {
    flex: 1;
    padding: 4rem;
    padding-bottom: 3rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;

    .nq-h1 {
        font-size: 3rem;
        margin-bottom: 1.875rem;
        margin-top: 0;
    }

    .nq-h2 {
        font-size: 2rem;
        margin-bottom: 3rem;
        margin-top: 0;
        font-weight: 400;
    }

    .features {
        list-style-type: none;
        padding: 0;
        margin-bottom: 3rem;
        margin-top: 0;

        li {
            display: flex;
            align-items: center;
            font-size: 2rem;

            padding: 2.5rem;
            border-radius: 1rem;
            box-shadow: 0px 9px 36px 0px nimiq-blue(0.05) inset;
            border: 1px solid nimiq-blue(0.1);

            &:not(:last-child) {
                margin-bottom: 1.5rem;
            }

            img {
                width: 5rem;
                height: 5rem;
                margin-right: 1.5rem;
            }

            span { margin: 0 }
        }
    }

    .nq-notice {
        font-size: 1.75rem;
        font-weight: 600;
        width: 80%;
        margin-bottom: 2rem;
        margin-top: 0;
    }

    .nq-button-s {
        align-self: center;
    }
}

.right-column {
    width: 100%; // Full width on mobile
    background: url('../../../public/img/prestaking/background.png') no-repeat center center;
    background-size: cover;
    background-color: nimiq-blue(1);
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 5.375rem 5.75rem 4rem; // top, horizontal, bottom
    margin: 0; // No margin on mobile
    border-radius: 0; // No border radius on mobile
    text-align: center;

    @media (min-width: $tabletBreakpoint) {
        width: 46%;
        margin: 4px;
        border-radius: 0.75rem;
    }

    .tickets-image {
        width: 100%;
        margin-bottom: 3rem;
        align-self: center;
    }

    .rewards {
        h2 {
            font-size: 3rem;
            margin-top: 0;
            margin-bottom: 2rem;
        }

        p {
            font-size: 1.75rem;
            margin-top: 0;
            margin-bottom: 5.375rem;
        }

        .nq-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin-top: 0;

            // Nimiq Light blue on dark, with hover color adjusted as well
            background: #0CA6FE;
            background-image: radial-gradient(100% 100% at 100% 100%, #0B7FF2 0%, var(--nimiq-light-blue-on-dark) 100%);
            &:before {
                background-image: radial-gradient(100% 100% at 100% 100%, #0B7FF2 0%, var(--nimiq-light-blue) 100%);
            }

            .nq-icon {
                margin-left: 1.5rem;

                --size: 1.5rem;
                height: var(--size);
                width: var(--size);

                transform: translateY(-15%);
                transition: transform .3s var(--nimiq-ease);
            }

            &:hover {
                .nq-icon {
                    transform: translateY(-30%) translateX(30%);
                }
            }
        }
    }
}
</style>
