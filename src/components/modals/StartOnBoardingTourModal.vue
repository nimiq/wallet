<template>
    <Modal class="start-onboarding-tour-modal" :showCloseButton="false">
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
import { useAccountStore } from '@/stores/Account';
import { PageHeader } from '@nimiq/vue-components';
import { defineComponent } from '@vue/composition-api';
import GreenNimiqLogoOutlineWithStars from '../icons/GreenNimiqLogoOutlineWithStars.vue';
import Modal from './Modal.vue';

export default defineComponent({
    setup(props, context) {
        function startTour() {
            const { setTour } = useAccountStore();
            setTour({ name: 'onboarding', isANewUser: true });
            context.root.$router.push('/');
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
    }
}
</style>
