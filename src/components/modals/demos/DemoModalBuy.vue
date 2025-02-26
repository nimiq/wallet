<template>
  <Modal :showOverlay="showOverlay">
    <PageHeader class="flex-column">
      <h1 class="nq-h1">{{ $t('Buy NIM') }}</h1>
      <div class="demo-warning nq-label">
        {{ $t('DEMO') }}
      </div>
    </PageHeader>
    <PageBody>
      <div class="flex-row">

       <AmountInput v-model="amount" :decimals="5">
          <AmountMenu slot="suffix" class="ticker" currency="nim"  :open="amountMenuOpened"
            :activeCurrency="activeCurrency" :fiatCurrency="fiatCurrency" :feeOption="false"
            :otherFiatCurrencies="otherFiatCurrencies"
            @click.native.stop="amountMenuOpened = !amountMenuOpened"
          />
        </AmountInput>
      </div>
    </PageBody>
    <PageFooter>
      <button class="nq-button light-blue" @click="buyDummyNim" :disabled="!amount">
        {{ $t('Buy NIM') }}
      </button>
    </PageFooter>

    <PageBody slot="overlay" class="overlay-content">
        <HighFiveIcon />
        <h2 class="nq-h2">
          {{ $t('Your NIM is under its way!') }}
        </h2>
        <p>
          {{ $t('This transaction is instant and secure.') }}
        </p>
    </PageBody>
  </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import { PageBody, PageHeader, PageFooter } from '@nimiq/vue-components';
import AmountInput from '@/components/AmountInput.vue';
import AmountMenu from '@/components/AmountMenu.vue';
import Modal from '@/components/modals/Modal.vue';
import { useAccountStore } from '@/stores/Account';
import { useFiatStore } from '@/stores/Fiat';
import { FIAT_CURRENCIES_OFFERED } from '@/lib/Constants';
// import { useTransactionsStore } from '@/stores/Transactions';
import { useDemoStore } from '@/stores/Demo';
import { useRouter } from '@/router';
import HighFiveIcon from '@/components/icons/HighFiveIcon.vue';
// import { useAddressStore } from '@/stores/Address';

export default defineComponent({
    setup() {
        const { activeCurrency } = useAccountStore();
        const { currency: fiatCurrency } = useFiatStore();
        const otherFiatCurrencies = computed(() =>
            FIAT_CURRENCIES_OFFERED.filter((fiat) => fiat !== fiatCurrency.value));
        const amount = ref(0);
        const amountMenuOpened = ref(false);
        const showOverlay = ref(false);
        const router = useRouter();

        // const { activeAddressInfo } = useAddressStore();
        // const maxSendableAmount = computed(() => Math.max((activeAddressInfo.value!.balance || 0), 0));
        // const sendMax = () => amount.value = maxSendableAmount.value;

        function buyDummyNim() {
            useDemoStore().buyDemoNim(amount.value);
            showOverlay.value = true;
            setTimeout(() => {
                showOverlay.value = false;
                router.push('/');
            }, 4000);
        }

        return {
            amount,
            activeCurrency,
            fiatCurrency,
            otherFiatCurrencies,
            amountMenuOpened,
            buyDummyNim,
            showOverlay,
            // sendMax,
        };
    },
    components: {
        Modal,
        AmountInput,
        AmountMenu,
        PageHeader,
        PageBody,
        PageFooter,
        HighFiveIcon,
    },
});
</script>

<style scoped lang="scss">
.small-page {
  > .page-header {
    overflow: hidden;

    .demo-warning {
      margin: 0;
      text-align: center;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: var(--nimiq-orange-bg);
      color: white;
      padding: 0.5rem 0;
    }
  }
}

::v-deep .nq-card.overlay {
  background: var(--nimiq-green);
  color: white;

  .overlay-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;

    svg {
      width: 128px;
      height: 128px;
    }

  p {
    margin-top: 0;
    text-wrap: pretty;
  }
  }

  .close-button {
    display: none;
  }
}
</style>
