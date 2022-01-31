<template>
    <Modal class="discover-nimiq-wallet-modal" :showCloseButton="false">
        <!-- TODO: Add nimiq SVG logo in the background -->

        <!-- TODO: Add language selector and dark mode switcher -->
        <header>
            <select @input="setLanguage($event.target.value)">
                <option
                    v-for="lang in languages" :key="lang.code"
                    :value="lang.code" :selected="language === lang.code"
                >{{ lang.name }}</option>
            </select>
            <!-- TODO - Here a switch will be implemented to change themes -->
        </header>

        <div class="content">
            <div class="description">
                <GreenNimiqLogoOutlineWithStars />
                <h1 class="nq-h1">{{ $t('Discover the Nimiq Wallet!') }}</h1>
                <p class="nq-text">
                    {{ $t('It\'s free, does not collect data and is controlled by no one but you.') }}
                </p>
            </div>

            <div class="call-to-action">
                <button class="nq-button light-blue" @click="() => startTour()">{{ $t('Start Wallet tour') }}</button>
                <!-- TODO It is an a element? -->
                <a @click="() => skipTour()" class="skip-tour">
                    Skip tour
                    <!-- TODO Add icon -->
                    <CaretRightIcon />
                </a>
            </div>
        </div>

    </Modal>
</template>

<script lang="ts">
import { useAccountStore } from '@/stores/Account';
import { useSettingsStore } from '@/stores/Settings';
import { PageHeader } from '@nimiq/vue-components';
import { defineComponent } from '@vue/composition-api';
import { TourName } from '@/lib/tour';
import { Languages } from '../../i18n/i18n-setup';
import GreenNimiqLogoOutlineWithStars from '../icons/GreenNimiqLogoOutlineWithStars.vue';
import CaretRightIcon from '../icons/CaretRightIcon.vue';
import Modal from './Modal.vue';

export default defineComponent({
    setup(props, context) {
        const { setLanguage, language } = useSettingsStore();
        const { setTour } = useAccountStore();

        function startTour() {
            setTour({ name: TourName.ONBOARDING, isANewUser: true });
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
        GreenNimiqLogoOutlineWithStars,
        CaretRightIcon,
    },
});
</script>

<style lang="scss" scoped>
.discover-nimiq-wallet-modal {
    header {
        padding: 2rem;
        position: relative;

        select {
            font-size: inherit;
            font-family: inherit;
            font-weight: bold;
            font-size: var(--body-size);
            line-height: inherit;
            color: inherit;
            border: none;
            appearance: none;
            cursor: pointer;

            box-shadow: inset 0 0 0 1.5px var(--text-16);
            border-radius: 2.5rem;
            padding: {
                top: 0.625rem;
                bottom: 0.875rem;
                left: 2rem;
                right: 3.5rem;
            }

            background-color: transparent;
            background-image: url('../../assets/arrow-down.svg');
            background-size: 1.25rem;
            background-repeat: no-repeat;
            background-position-x: calc(100% - 1.75rem);
            background-position-y: 55%;

            &[name="theme"] {
                text-transform: capitalize;
            }

            &:disabled {
                opacity: .5;
                cursor: default;
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

                svg {
                    width: 9px;
                    height: 9px;
                }
            }
        }
    }
}
</style>
