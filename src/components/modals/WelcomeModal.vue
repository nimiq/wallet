<template>
    <Modal class="welcome-modal" :showCloseButton="false">
        <!-- Nimiq SVG logo cropped in the top left corner -->
        <svg class="nimiq-logo-background" width="128" height="114" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity=".05"
            d="m125.33 1.34-48.5-83.68A19.42 19.42 0 0 0 60-92h-97.02c-6.79 0-13.26 3.54-16.81 9.66l-48.51 83.68a18.81
            18.81 0 0 0 0 19.32l48.5 83.68A19.43 19.43 0 0 0-37 114h97.02c6.79 0 13.26-3.54 16.81-9.66l48.51-83.68a18.81
            18.81 0 0 0 0-19.32Z"
            fill="#1F2348"/>
        </svg>

        <header>
            <NimiqSelector :options="languages" @select="setLanguage($event.code)">
                <template slot="trigger" class="trigger">
                    <SpeechBubble />
                    <span>{{ language }}</span>
                </template>
                <span slot="nimiq-option" slot-scope="{ option }">{{ option.name }}</span>
            </NimiqSelector>
            <!-- TODO - Here a switch will be implemented to change themes -->
        </header>

        <div class="content">
            <div class="description">
                <NimiqLogoOutlineWithStars />
                <h1 class="nq-h1">{{ $t('Discover the Nimiq Wallet!') }}</h1>
                <p class="nq-text">
                    {{ $t('It\'s free, does not collect data and is controlled by no one but you.') }}
                </p>
            </div>

            <div class="call-to-action">
                <button class="nq-button light-blue" @click="() => startTour()">{{ $t('Start Wallet tour') }}</button>
                <button @click="() => skipTour()" class="reset skip-tour">
                    Skip tour
                    <CaretRightSmallIcon />
                </button>
            </div>
        </div>

    </Modal>
</template>

<script lang="ts">
import { useAccountStore } from '@/stores/Account';
import { useSettingsStore } from '@/stores/Settings';
import { PageHeader, CaretRightSmallIcon } from '@nimiq/vue-components';
import { defineComponent } from '@vue/composition-api';
import { TourName, ITourOrigin } from '@/lib/tour';
import { Languages } from '../../i18n/i18n-setup';
import NimiqLogoOutlineWithStars from '../icons/NimiqLogoOutlineWithStars.vue';
import NimiqSelector from '../NimiqSelector.vue';
import Modal from './Modal.vue';
import SpeechBubble from '../icons/SpeechBubble.vue';

export default defineComponent({
    setup(props, context) {
        const { setLanguage, language } = useSettingsStore();
        const { setTour } = useAccountStore();

        function startTour() {
            setTour({ name: TourName.ONBOARDING, startedFrom: ITourOrigin.WELCOME_MODAL, step: 0 });
            context.root.$router.push('/');
        }

        function skipTour() {
            setTour(null);
            context.root.$router.push('/');
        }

        return {
            languages: Languages,
            language,
            setLanguage,
            startTour,
            skipTour,
        };
    },
    components: {
        Modal,
        PageHeader,
        NimiqSelector,
        NimiqLogoOutlineWithStars,
        CaretRightSmallIcon,
        SpeechBubble,
    },
});
</script>

<style lang="scss" scoped>
.welcome-modal {
    svg.nimiq-logo-background {
        position: absolute;
    }

    header {
        padding: 3.25rem 2.5rem;
        position: relative;

        & ::v-deep .selector {
            .dropdown {
                width: max-content;
                left: 6rem;

                .list {
                    max-height: clamp(72px, 50rem, 100vh);
                }
            }

            .trigger {
                display: flex;
                align-items: center;
                column-gap: 1rem;

                span {
                    text-transform: uppercase;
                    color: var(--dark-blue);
                    opacity: 0.4;
                    letter-spacing: 0.095em;
                    font-weight: bold;
                    font-size: 14px;
                }
            }
        }
    }
    .content {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding-bottom: 24px;

        .description {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            max-width: 175px;

            ::v-deep svg {
                color: var(--nimiq-green);
            }

            // TODO Add correct dimensions

            p {
                font-size: 15px;
                line-height: 21px;
                text-align: center;
                color: var(--nimiq-blue);
                margin: 0;
            }
        }

        .call-to-action {
            .skip-tour {
                color: var(--nimiq-blue);
                font-weight: 600;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                cursor: pointer;
                margin: 0 auto;

                svg {
                    width: 9px;
                    height: 9px;
                }
            }
        }
    }
}
</style>
