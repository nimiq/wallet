<template>
  <Modal :showOverlay="!!status">
    <PageHeader class="flex-column">
      <h1 class="nq-h1">{{ $t('Buy NIM') }}</h1>
    </PageHeader>
    <PageBody>

      <section class="identicon-section flex-row">
                        <BankIconButton :bankName="bank ? bank.name : ''" />
                        <div class="separator-wrapper">
                            <div class="separator"></div>
                        </div>
                        <div class="flex-column">
                            <Identicon class="primary"
            v-if="activeCurrency === CryptoCurrency.NIM"
            :address="activeAddressInfo.address"/>
                            <InteractiveShortAddress v-if="activeCurrency === CryptoCurrency.NIM"
                                :address="activeAddressInfo.address
                                    .replace(/^NQ(.+)$/, (_, rest) => 'NQ' + rest.replace(/./g, 'X'))"
                                tooltipPosition="bottom left"/>
                        </div>
                    </section>

                    <section class="amount-section">
                        <div class="flex-row primary-amount">
                            <AmountInput v-model="fiatAmount"
                                :decimals="fiatCurrencyInfo.decimals"
                                placeholder="0.00" ref="eurAmountInput$"
                            >
                                <span slot="suffix" class="ticker">{{ selectedFiatCurrency.toUpperCase() }}</span>
                            </AmountInput>
                        </div>
                        <span class="secondary-amount flex-row">
                            <svg xmlns="http://www.w3.org/2000/svg" width="31" height="29" viewBox="0 0 31 29">
                                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
                                    <path d="M.75 1.25v12.5a8 8 0 008 8h21.5" />
                                    <path d="M23.75 15.25l6.5 6.5-6.5 6.5" stroke-linejoin="round"/>
                                </g>
                            </svg>
                            <AmountInput v-model="cryptoAmount" :decimals="5">
                                <span class="ticker" slot="suffix">
                                    NIM
                                </span>
                            </AmountInput>
                        </span>
                    </section>
    </PageBody>
    <PageFooter>
      <button class="nq-button light-blue" @click="buyDummyNim" :disabled="!cryptoAmount">
        {{ $t('Buy NIM') }}
      </button>
    </PageFooter>

        <div slot="overlay" class="page">
            <StatusScreen
                title="Your NIM is on its way!"
                :state="status"
                message="This transaction is instant and secure."
            />
        </div>
  </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import { PageBody, PageHeader, PageFooter, Identicon } from '@nimiq/vue-components';
import AmountInput from '@/components/AmountInput.vue';
import Modal from '@/components/modals/Modal.vue';
import { useAccountStore } from '@/stores/Account';
import { useFiatStore } from '@/stores/Fiat';
import { FIAT_CURRENCIES_OFFERED, CryptoCurrency } from '@/lib/Constants';
import { dangerouslyInsertFakeBuyNimTransaction } from '@/lib/Demo';
import { useRouter } from '@/router';
import BankIconButton from '@/components/BankIconButton.vue';
import { useAddressStore } from '@/stores/Address';
import { CurrencyInfo } from '@nimiq/utils';
import InteractiveShortAddress from '@/components/InteractiveShortAddress.vue';
import StatusScreen, { State as StatusScreenState } from '@/components/StatusScreen.vue';

export default defineComponent({
    setup() {
        const { activeCurrency } = useAccountStore();
        const { currency: fiatCurrency } = useFiatStore();

        const fiatCurrencyInfo = computed(() => {
            if (activeCurrency.value === CryptoCurrency.BTC) {
                return new CurrencyInfo(fiatCurrency.value);
            }
            return new CurrencyInfo(activeCurrency.value);
        });

        const { activeAddressInfo } = useAddressStore();
        const otherFiatCurrencies = computed(() =>
            FIAT_CURRENCIES_OFFERED.filter((fiat) => fiat !== fiatCurrency.value));
        const { currency: selectedFiatCurrency, exchangeRates } = useFiatStore();

        const amountMenuOpened = ref(false);
        const router = useRouter();
        const addressListOpened = ref(false);
        const status = ref<StatusScreenState|undefined>();

        // backing refs
        const _fiatAmount = ref<number>(0);
        const _cryptoAmount = ref<number>(0);

        const exchangeRate = computed<number>(() => (
            exchangeRates.value[activeCurrency.value]?.[selectedFiatCurrency.value]
      ?? 0
        ));

        const fiatAmount = computed({
            get: () => {
                if (_fiatAmount.value !== 0) return _fiatAmount.value;
                return (_cryptoAmount.value / 10 ** (fiatCurrencyInfo.value.decimals + 1)) * exchangeRate.value;
            },
            set: (value: number) => {
                _cryptoAmount.value = 0;
                _fiatAmount.value = value;
            },
        });

        const cryptoAmount = computed({
            get: () => {
                if (_cryptoAmount.value !== 0) return _cryptoAmount.value;
                if (!exchangeRate.value || exchangeRate.value === 0) return 0;
                const raw = _fiatAmount.value / exchangeRate.value;
                return raw * (10 ** (fiatCurrencyInfo.value.decimals + 1));
            },
            set: (value: number) => {
                _fiatAmount.value = 0;
                _cryptoAmount.value = value;
            },
        });

        function buyDummyNim() {
            status.value = StatusScreenState.LOADING;
            setTimeout(() => {
                status.value = StatusScreenState.SUCCESS;
                dangerouslyInsertFakeBuyNimTransaction(cryptoAmount.value);
                setTimeout(() => {
                    status.value = undefined;
                    router.push('/');
                }, 2500);
            }, 1000);
        }

        return {
            addressListOpened,
            activeAddressInfo,
            selectedFiatCurrency,
            bank: { name: 'Demo Bank' },
            activeCurrency,
            fiatCurrency,
            fiatCurrencyInfo,
            otherFiatCurrencies,
            amountMenuOpened,
            buyDummyNim,
            CryptoCurrency,
            fiatAmount,
            cryptoAmount,
            status,
            StatusScreenState,
        };
    },
    components: {
        Modal,
        AmountInput,
        PageHeader,
        PageBody,
        PageFooter,
        InteractiveShortAddress,
        Identicon,
        BankIconButton,
        StatusScreen,
    },
});
</script>

<style scoped lang="scss">
    .identicon-section {
    ::v-deep .bank-icon-button svg.triangle-down-icon {
        display: none;
    }

        justify-content: space-around;
        align-items: stretch;
        align-self: stretch;
        margin-bottom: 3.5rem;

        & > .flex-column {
            align-items: center;

            .identicon-stack {
                padding-bottom: 4rem;
            }

            .interactive-short-address {
                margin-top: 7px;
            }
        }

        .separator-wrapper {
            --height: 0.25rem;

            height: var(--height);
            margin-left: -2rem;
            margin-right: -2rem;
            margin-bottom: 5rem;

            position: relative;
            flex-grow: 1;
            align-self: center;
            overflow: hidden;
            mask: radial-gradient(circle at center, white, white calc(100% - 3rem), rgba(255,255,255, 0));

            .separator {
                height: 100%;
                width: 50%;
                background: var(--text-14);
                border-radius: calc(var(--height) / 2);

                position: absolute;
                left: -50%;
                animation: separatorSliding 2.2s infinite;

                @keyframes separatorSliding {
                    0% { transform: translateX(0) }
                    100% { transform: translateX(300%) }
                }
            }
        }
    }

    .amount-section {
        text-align: center;
        width: max-content;
        margin: 3rem auto 2rem auto;

        &.orange {
            color: var(--nimiq-orange);
            transition: color 200ms cubic-bezier(0.5, 0, 0.15, 1);

            .amount-input {
                &, &:hover, &:focus {
                    color: var(--nimiq-orange);
                    transition: color 200ms cubic-bezier(0.5, 0, 0.15, 1);

                    ::v-deep .nq-input,
                    ::v-deep .label-input + span,
                    ::v-deep .label-input:focus-within + span {
                        --border-color: rgba(252, 135, 2, 0.3); // --nimiq-orange 0.3 opacity
                        color: var(--nimiq-orange);

                        transition: {
                            property: border, color;
                            duration: 200ms;
                            timing-function: cubic-bezier(0.5, 0, 0.15, 1);
                        }
                    }
                }
            }
        }

        .primary-amount {
            align-items: flex-end;
            color: var(--nimiq-light-blue);
            margin-bottom: 1rem;

            .amount-input {
                width: auto;
                max-width: 100%;
                font-weight: bold;

                ::v-deep .ticker {
                    font-size: 2.5rem;
                    margin-left: 1.25rem;
                }

                ::v-deep .label-input * {
                    font-weight: 600;
                    font-size: 4rem !important;
                    padding: .5rem 1rem;
                }
            }
        }

        .secondary-amount {
            font-weight: 600;

            > svg {
                margin: 0 1rem 0 1.5rem;
                opacity: 0.3;
            }

            .amount-input {
                width: auto;
                margin-top: 0.375rem;

                &.has-value:not(.focussed) {
                    color: var(--text-60);
                }

                ::v-deep .ticker {
                    font-weight: bold;
                    font-size: 2rem;
                }

                ::v-deep .label-input * {
                    font-weight: 600;
                    font-size: 2.5rem !important;
                    padding: 0.375rem 0.75rem;
                }
            }
        }
    }

    ::v-deep .status-screen {
        height: 100%;
        position: absolute;
        inset: -6px;
        width: calc(100% + 6px);
    }
</style>
