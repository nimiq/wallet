<template>
    <Modal ref="modal$" class="stablecoin-selection-modal">
        <PageHeader>
            <i18n path="You can now choose{linebreak}between USDC and USDT">
                <br slot="linebreak" />
            </i18n>
            <div slot="more" class="subtitle">
                {{ $t('We added support for USDT, which you can now use instead of USDC.') }}
            </div>
        </PageHeader>
        <PageBody class="flex-row">
            <UsdcIcon />
            <UsdtIcon />
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="$router.push('/stablecoin-selection')" @mousedown.prevent>
                {{ $t('Learn more') }}
            </button>
            <a class="nq-link" @click="stickWithUsdc">
                {{ $t('I’m happy, stick with USDC') }}
            </a>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageBody, PageHeader, PageFooter } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import { CryptoCurrency } from '../../lib/Constants';
import { useAccountSettingsStore } from '../../stores/AccountSettings';
import { useAccountStore } from '../../stores/Account';
import UsdcIcon from '../icons/UsdcIcon.vue';
import UsdtIcon from '../icons/UsdtIcon.vue';
import { useWindowSize } from '../../composables/useWindowSize';
import { useRouter } from '../../router';

export default defineComponent({
    name: 'usdt-added-modal',
    setup(props, context) {
        const modal$ = ref<Modal>(null);

        useAccountSettingsStore().setKnowsAboutUsdt(true);

        const { isMobile } = useWindowSize();

        async function stickWithUsdc() {
            useAccountSettingsStore().setStablecoin(CryptoCurrency.USDC);
            useAccountStore().setActiveCurrency(CryptoCurrency.USDC);
            await modal$.value?.forceClose();
            if (isMobile.value) {
                context.root.$router.push('/transactions');
            }
        }

        return {
            modal$,
            stickWithUsdc,
        };
    },
    components: {
        PageBody,
        PageHeader,
        PageFooter,
        Modal,
        UsdcIcon,
        UsdtIcon,
    },
});
</script>

<style lang="scss" scoped>
.modal ::v-deep .small-page {
    width: 500px;
}

.subtitle {
    margin: 1.25rem auto 0;
    max-width: 400px;
    font-size: var(--body-size);
    color: var(--text-60);
}

.page-header {
    padding-bottom: 3rem;
}

.page-body {
    padding-top: 0;
    align-items: center;
    justify-content: center;
}

.usdc {
    width: 14rem;
    color: var(--usdc-blue);
}

.usdt {
    width: 16rem;
    border: 1rem solid white;
    border-radius: 100%;
    color: var(--usdt-green);
    margin-left: -10%;
}

.page-footer {
    .nq-button {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1.5rem;
    }

    .nq-link {
        font-weight: 600;
        font-size: var(--small-size);
        color: var(--text-60);
        margin: auto;
        margin-top: -1.25rem;
        margin-bottom: 1rem;
    }
}
</style>
