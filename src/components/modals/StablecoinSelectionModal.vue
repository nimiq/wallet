<template>
    <Modal ref="modal$" class="stablecoin-selection-modal">
        <PageHeader>
            {{ $t('Choose your stablecoin') }}
            <div slot="more" class="subtitle">
                {{ $t('Pick a stable coin for your wallet. You can always switch between the two.') }}
            </div>
        </PageHeader>
        <PageBody class="flex-column">
            <div class="argument-grid">
                <div class="usdc" :class="{ 'active': selection === 'usdc' }">
                    {{ $t('Higher transparency and regulatory compliance.')}}
                </div>
                <div class="usdt" :class="{ 'active': selection === 'usdt' }">
                    {{ $t('Higher liquidity and global market adoption.')}}
                </div>
            </div>
            <StablecoinSelector v-model="selection" />
            <a
                href="https://www.moonpay.com/learn/cryptocurrency/what-is-the-difference-between-usdt-and-usdc"
                target="_blank" rel="noopener"
                class="nq-link flex-row"
            >
                {{ $t('Learn more') }}
                <CaretRightSmallIcon />
            </a>
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="choose" @mousedown.prevent>
                {{ $t('Choose {ticker}', { ticker: selection.toUpperCase() }) }}
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageBody, PageHeader, PageFooter, CaretRightSmallIcon } from '@nimiq/vue-components';
import { useRouter } from '@/router';
import Modal from './Modal.vue';
import { CryptoCurrency } from '../../lib/Constants';
import StablecoinSelector from '../StablecoinSelector.vue';
import { Stablecoin, useAccountSettingsStore } from '../../stores/AccountSettings';
import { useAccountStore } from '../../stores/Account';
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    name: 'stablecoin-selection-modal',
    setup() {
        const modal$ = ref<Modal>(null);

        const selection = ref<Stablecoin>(CryptoCurrency.USDC);

        useAccountSettingsStore().setKnowsAboutUsdt(true);

        const { isMobile } = useWindowSize();

        const router = useRouter();

        async function choose() {
            useAccountSettingsStore().setStablecoin(selection.value);
            useAccountStore().setActiveCurrency(selection.value);
            await modal$.value?.forceClose();
            if (isMobile.value) {
                router.push('/transactions');
            }
        }

        return {
            modal$,
            selection,
            choose,
        };
    },
    components: {
        PageBody,
        PageHeader,
        PageFooter,
        Modal,
        StablecoinSelector,
        CaretRightSmallIcon,
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
    justify-content: center;
}

.argument-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    font-size: var(--body-size);
    text-align: center;
    font-weight: 600;
    color: var(--text-50);
    gap: 2rem;
    transition: color 300ms var(--nimiq-ease);

    .usdc {
        grid-column: 1/2;

        &.active {
            color: var(--usdc-blue);
        }
    }

    .usdt {
        grid-column: 2/3;

        &.active {
            color: var(--usdt-green);
        }
    }
}

.nq-link {
    margin: 5rem auto 0;
    font-size: var(--small-size);
    font-weight: 600;
    color: var(--text-60);
    align-items: center;
    gap: 0.125rem;
    transition: color 300ms var(--nimiq-ease);

    .nq-icon {
        font-size: 1.5rem;
        margin-bottom: -0.125rem;
        transition: transform 300ms var(--nimiq-ease);
        will-change: transform;

        ::v-deep path {
            stroke-width: 1.25;
        }
    }

    &:hover {
        color: var(--text-70);
        text-decoration: none;

        .nq-icon {
            transform: translateX(0.25rem);
        }
    }
}

.stablecoin-selector {
    margin: 5rem auto 0;
}

.page-footer .nq-button {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
}
</style>
