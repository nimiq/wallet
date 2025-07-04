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
            <UsdtIconPadded />
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="$router.push({ name: RouteName.StablecoinSelection })"
            @mousedown.prevent>
                {{ $t('Learn more') }}
            </button>
            <a class="nq-link" @click="stickWithUsdc">
                {{ $t('I’m happy, stick with USDC') }}
            </a>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { PageBody, PageHeader, PageFooter } from '@nimiq/vue-components';
import { useRouter, RouteName } from '@/router';
import Modal from './Modal.vue';
import { CryptoCurrency } from '../../lib/Constants';
import { useAccountSettingsStore } from '../../stores/AccountSettings';
import { useAccountStore } from '../../stores/Account';
import UsdcIcon from '../icons/UsdcIcon.vue';
import UsdtIconPadded from '../icons/UsdtIconPadded.vue';
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    name: 'usdt-added-modal',
    setup() {
        const router = useRouter();
        const modal$ = ref<Modal | null>(null);

        useAccountSettingsStore().setKnowsAboutUsdt(true);

        const { isMobile } = useWindowSize();

        async function stickWithUsdc() {
            useAccountSettingsStore().setStablecoin(CryptoCurrency.USDC);
            useAccountStore().setActiveCurrency(CryptoCurrency.USDC);
            await modal$.value?.forceClose();
            if (isMobile.value) {
                router.push('/transactions');
            }
        }

        return {
            modal$,
            stickWithUsdc,
            RouteName,
        };
    },
    components: {
        PageBody,
        PageHeader,
        PageFooter,
        Modal,
        UsdcIcon,
        UsdtIconPadded,
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
    width: 15.5rem;
    color: var(--usdc-blue);
}

.usdt {
    width: 19rem;
    color: var(--usdt-green);
    margin-left: -10%;
    stroke: white;
    stroke-width: 14;
    paint-order: stroke fill;
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
