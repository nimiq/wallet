<template>
    <Modal class="start-onboarding-tour-modal" :showCloseIcon="false">
        <!-- TODO: Add nimiq SVG logo in the background -->

        <!-- TODO: Add language selector and dark mode switcher -->
        <header class="flex-row" style="justify-content: space-between">
            <p>Choose language</p>
            <p>Switch theme mode</p>
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
                <button class="nq-button light-blue" @click="startTour">{{ $t('Start Wallet tour') }}</button>
                <!-- TODO It is an a element? -->
                <a href="http://">
                    <span>Skip tour</span>
                    <!-- TODO Add icon -->
                    <span>></span>
                </a>
            </div>
        </div>

    </Modal>
</template>

<script lang="ts">
import { PageHeader } from '@nimiq/vue-components';
import { defineComponent } from '@vue/composition-api';
import GreenNimiqLogoOutlineWithStars from '../icons/GreenNimiqLogoOutlineWithStars.vue';
import Modal from './Modal.vue';

export default defineComponent({
    setup(props, context) {
        function startTour() {
            context.root.$router.push({
                name: 'root',
                params: {
                    // It has to be a string since it is a value encapsulated in Location.params
                    // which is Dictionary<string>. Using a 'false' value will lead to the same
                    // behaviour
                    doOnboardingTour: 'true',
                },
            });
        }

        return {
            startTour,
        };
    },
    components: {
        Modal,
        PageHeader,
        GreenNimiqLogoOutlineWithStars,
    },
});
</script>

<style lang="scss" scoped>
.start-onboarding-tour-modal {
    .content {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;

        .description {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            max-width: 175px;

            // TODO Add correct dimensions

            p {
                font-size: 15px;
                line-height: 21px;
                text-align: center;
                color: var(--nimiq-blue);
                margin: 0;
            }
        }
    }
}
</style>
