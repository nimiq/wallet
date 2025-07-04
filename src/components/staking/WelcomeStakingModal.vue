<template>
    <Modal v-bind="$attrs" v-on="$listeners" emitClose :swipeToClose="false" ref="$modal">
        <PageHeader>
            {{ $t('Welcome to the new Nimiq') }}
            <p slot="more">
                {{ $t('Nimiq now runs on ‘Proof-of-Stake’. '
                    +'Enjoy the massive performance boost, energy-efficiency and staking.') }}
            </p>
        </PageHeader>

        <PageBody>
            <div class="features">
                <div class="feature">
                    <!-- eslint-disable max-len -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="55" height="56" viewBox="0 0 55 56" fill="none">
                        <path fill-rule="evenodd" clip-rule="evenodd"
                            d="M27.5417 0.683594C12.4549 0.683594 0.224609 12.9139 0.224609 28.0007C0.224609 43.0875 12.4549 55.3177 27.5417 55.3177C42.6285 55.3177 54.8588 43.0875 54.8588 28.0007C54.8588 12.9139 42.6285 0.683594 27.5417 0.683594ZM28.3209 14.1101L17.1767 29.2666C16.7819 29.8036 17.1653 30.5615 17.8319 30.5615H25.4292V42.1619C25.4292 42.9473 26.4323 43.2764 26.8975 42.6436L38.0418 27.4871C38.4366 26.9501 38.0532 26.1922 37.3866 26.1922H29.7893V14.5918C29.7893 13.8064 28.7862 13.4773 28.3209 14.1101Z"
                            fill="url(#paint0_radial_6834_51179)" />
                        <defs>
                            <radialGradient id="paint0_radial_6834_51179" cx="0" cy="0" r="1"
                                gradientUnits="userSpaceOnUse"
                                gradientTransform="translate(54.8588 55.3177) rotate(-180) scale(54.6341)">
                                <stop stop-color="#EC991C" />
                                <stop offset="1" stop-color="#E9B213" />
                            </radialGradient>
                        </defs>
                    </svg>
                    <!-- eslint-enable max-len -->
                    <p>{{ $t('Almost instant transactions') }}</p>
                </div>

                <div class="feature">
                    <!-- eslint-disable max-len -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" fill="none">
                        <rect y="0.683594" width="56" height="54.6341" rx="27.3171"
                            fill="url(#paint0_radial_6834_51187)" />
                        <path
                            d="M25.0847 11.9974L25.1947 11.9435C29.2805 9.9436 34.2792 11.6018 36.3596 15.6472V15.6472"
                            stroke="white" stroke-width="2.73171" stroke-linecap="round" stroke-linejoin="round" />
                        <path
                            d="M32.3034 19.0506C30.735 16.9876 30.0027 14.3481 34.1456 12.8272C36.2452 8.85357 38.9577 10.5167 40.6891 12.7973C42.2987 14.9161 42.7126 20.1386 41.286 23.2622C41.2493 23.3408 41.1952 23.4102 41.1277 23.4652C41.0601 23.5203 40.9809 23.5595 40.8961 23.58C40.8112 23.6005 40.7228 23.6016 40.6377 23.5834C40.5525 23.5652 40.4728 23.5281 40.4044 23.4749C37.6075 21.2605 34.1449 21.4736 32.3034 19.0506Z"
                            stroke="white" stroke-width="2.73171" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M43.234 32.8496V32.8496C43.234 37.3757 39.5649 41.0447 35.0389 41.0447L34.834 41.0447"
                            stroke="white" stroke-width="2.73171" stroke-linecap="round" stroke-linejoin="round" />
                        <path
                            d="M33.5798 35.9686C36.1776 35.5008 38.919 36.0209 38.4123 40.3282C41.076 43.9223 38.3199 45.5708 35.4491 46.086C32.7815 46.5654 27.8304 44.6275 25.6343 41.9987C25.5795 41.9319 25.5409 41.8538 25.5216 41.7703C25.5023 41.6867 25.5027 41.5999 25.5228 41.5164C25.5429 41.4328 25.5822 41.3547 25.6377 41.288C25.6933 41.2213 25.7635 41.1676 25.8433 41.1311C29.1407 39.6513 30.5288 36.5176 33.5798 35.9686Z"
                            stroke="white" stroke-width="2.73171" stroke-linecap="round" stroke-linejoin="round" />
                        <path
                            d="M16.6945 37.8882L16.6053 37.8379C12.6369 35.6027 11.3003 30.6131 13.6199 26.6935V26.6935"
                            stroke="white" stroke-width="2.73171" stroke-linecap="round" stroke-linejoin="round" />
                        <path
                            d="M18.767 28.1752C17.8849 30.5959 16.0507 32.6435 12.4663 30.0633C7.93214 30.5084 7.84136 27.3641 8.81778 24.6901C9.72443 22.2049 13.9266 19.0062 17.3669 18.4721C17.4538 18.4593 17.5427 18.4659 17.6268 18.4914C17.7109 18.5169 17.788 18.5606 17.8524 18.6193C17.9168 18.678 17.9667 18.7502 17.9984 18.8303C18.0301 18.9104 18.0428 18.9964 18.0354 19.0818C17.7052 22.5972 19.8033 25.3326 18.767 28.1752Z"
                            stroke="white" stroke-width="2.73171" stroke-linecap="round" stroke-linejoin="round" />
                        <defs>
                            <radialGradient id="paint0_radial_6834_51187" cx="0" cy="0" r="1"
                                gradientUnits="userSpaceOnUse"
                                gradientTransform="translate(56 55.3177) rotate(-180) scale(56 54.6341)">
                                <stop stop-color="#265DD7" />
                                <stop offset="1" stop-color="#0582CA" />
                            </radialGradient>
                        </defs>
                    </svg>
                    <!-- eslint-enable max-len -->
                    <p>{{ $t('Super eco-friendly') }}</p>
                </div>

                <div class="feature">
                    <!-- eslint-disable max-len -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="57" height="56" viewBox="0 0 57 56" fill="none">
                        <path
                            d="M0.501953 28.0007C0.501953 12.9139 12.7322 0.683594 27.819 0.683594H29.1849C44.2717 0.683594 56.502 12.9139 56.502 28.0007C56.502 43.0875 44.2717 55.3177 29.1849 55.3177H27.819C12.7322 55.3177 0.501953 43.0875 0.501953 28.0007Z"
                            fill="url(#paint0_radial_6834_51208)" />
                        <line x1="26.776" y1="29.3561" x2="26.776" y2="40.9658" stroke="white" stroke-width="2.73171"
                            stroke-linecap="round" stroke-linejoin="round" />
                        <path
                            d="M37.3585 26.1113C37.3585 33.2821 33.6024 37.0382 26.4316 37.0382C26.4316 26.8796 29.5902 26.1113 37.3585 26.1113Z"
                            stroke="white" stroke-width="2.73171" stroke-linecap="round" stroke-linejoin="round" />
                        <path
                            d="M31.1572 14.3392C34.3804 20.7447 32.7955 26.1409 26.3899 29.3641C23.0397 20.0378 25.0946 17.6484 31.1572 14.3392Z"
                            stroke="white" stroke-width="2.73171" stroke-linecap="round" stroke-linejoin="round" />
                        <path
                            d="M16.2075 23.2439C16.6644 30.9988 19.2764 34.693 26.4347 34.2713C25.9779 26.5165 25.1554 22.7168 16.2075 23.2439Z"
                            stroke="white" stroke-width="2.73171" stroke-linecap="round" stroke-linejoin="round" />
                        <defs>
                            <radialGradient id="paint0_radial_6834_51208" cx="0" cy="0" r="1"
                                gradientUnits="userSpaceOnUse"
                                gradientTransform="translate(56.502 55.3177) rotate(-180) scale(56 54.6341)">
                                <stop stop-color="#41A38E" />
                                <stop offset="1" stop-color="#21BCA5" />
                            </radialGradient>
                        </defs>
                    </svg>
                    <!-- eslint-enable max-len -->
                    <p>{{ $t('Earn new NIM by staking') }}</p>
                </div>
            </div>
        </PageBody>

        <PageFooter>
            <div class="nq-text-s">
                {{ $t('No action required.') }}
                <a class="nq-link" href="https://www.nimiq.com/blog/nimiq-proof-of-stake-is-now-live" target="_blank">
                    {{ $t('Learn more about the update') }}
                </a>
            </div>
            <button class="nq-button-s" @click="close" @mousedown.prevent>
                {{ $t('Continue to Wallet') }}
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { PageHeader, PageBody, PageFooter } from '@nimiq/vue-components';
import Modal from '../modals/Modal.vue';
import { WELCOME_STAKING_MODAL_LOCALSTORAGE_KEY } from '../../lib/Constants';

export default defineComponent({
    name: 'WelcomeStakingModal',
    setup() {
        const $modal = ref<Modal | null>(null);

        async function close() {
            window.localStorage.setItem(WELCOME_STAKING_MODAL_LOCALSTORAGE_KEY, '1');
            await $modal.value?.forceClose();
        }

        return { $modal, close };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
    },
});
</script>

<style lang="scss" scoped>
.modal {
    ::v-deep .small-page {
        width: 65rem;
        min-height: 63rem;
    }

    ::v-deep .close-button {
        display: none;
    }
}

.page-header {
    text-align: center;
    padding-bottom: 0;

    ::v-deep h1 {
        font-size: 3rem;
        font-weight: 700;
    }

    p {
        font-size: 2rem;
        font-weight: 500;
        color: var(--text-50);
    }
}

.page-body {
    padding-top: 2rem;
    padding-bottom: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
}

.page-footer {
    padding-bottom: 3rem;
}

.features {
    display: flex;
    flex-direction: row;
    gap: 1rem;
}

.feature {
    position: relative;
    display: flex;
    align-items: center;
    flex-direction: column;
    padding: 2rem;
    padding-top: 4rem;

    color: var(--color);
    font-size: 2rem;
    font-weight: 500;

    border-radius: 1rem;
    overflow: hidden;

    text-wrap: balance;
    text-align: center;

    &:before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        z-index: 0;
        width: 100%;
        height: 100%;
        opacity: 0.1;

        background-color: var(--color);

    }

    &:nth-child(1) { --color: var(--nimiq-gold) }
    &:nth-child(2) {
        --color: var(--nimiq-light-blue);
        min-width: 31%;
    }
    &:nth-child(3) { --color: var(--nimiq-green) }

    svg, p {
        z-index: 0;
    }

    svg {
        width: 7rem;
        height: auto;
        flex-grow: 1;
    }

    p {
        margin-bottom: 0;
    }
}

.nq-text-s {
    text-align: center;
    color: var(--nimiq-blue);
    opacity: 0.5;
    margin-bottom: 2rem;

    .nq-link {
        color: var(--nimiq-blue);
        text-decoration: underline;
    }
}

.nq-button-s {
    margin-bottom: 3rem;
    width: auto;
    margin: 0 auto;
}
</style>
