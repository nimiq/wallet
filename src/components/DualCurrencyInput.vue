<template>
  <section class="dual-currency-input" :class="{ orange: invalid }">
    <div class="flex-row primary-amount">
      <AmountInput v-model="_cryptoAmount" :decimals="cryptoCurrencyDecimals">
        <div class="amount-menu ticker" slot="suffix">
          <button class="reset button flex-row" @click.stop="currencySelectorOpen = !currencySelectorOpen">
            {{ cryptoCurrency.toUpperCase() }}
          </button>
          <div v-if="currencySelectorOpen" class="menu flex-column">
            <button class="reset flex-row" @click="()=> { $emit('set-max'); currencySelectorOpen= false}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
                  <line class="cls-1" x1="8.25" y1="6.25" x2="8.25" y2="15.25" />
                  <path class="cls-1" d="M12.25,9.3l-4-4-4,4" />
                  <line class="cls-1" x1="3.25" y1="1.25" x2="13.25" y2="1.25" />
                </g>
              </svg>
              {{ $t('Sell max') }}
            </button>
          </div>
        </div>
      </AmountInput>
    </div>
    <span class="secondary-amount flex-row">
      <svg xmlns="http://www.w3.org/2000/svg" width="31" height="29" viewBox="0 0 31 29">
        <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
          <path d="M.75 1.25v12.5a8 8 0 008 8h21.5" />
          <path d="M23.75 15.25l6.5 6.5-6.5 6.5" stroke-linejoin="round" />
        </g>
      </svg>
      <AmountInput v-model="_fiatAmount" :decimals="fiatCurrencyDecimals" placeholder="0.00">
        <span slot="suffix" class="ticker">{{ fiatCurrency.toUpperCase() }}</span>
      </AmountInput>
    </span>
  </section>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import { CryptoCurrency, FiatCurrency } from '@/lib/Constants';
import AmountInput from './AmountInput.vue';

export default defineComponent({
    props: {
        fiatAmount: {
            type: Number,
            required: true,
        },
        fiatCurrency: {
            type: String as () => FiatCurrency,
            required: true,
        },
        cryptoAmount: {
            type: Number,
            required: true,
        },
        cryptoCurrency: {
            type: String as () => CryptoCurrency,
            required: true,
        },
        fiatCurrencyDecimals: {
            type: Number,
            default: 2,
        },
        cryptoCurrencyDecimals: {
            type: Number,
            default: 2,
        },
        invalid: {
            type: Boolean,
            required: true,
        },
    },
    setup(props, context) {
        const currencySelectorOpen = ref(false);

        const _fiatAmount = computed({
            get: () => props.fiatAmount,
            set: (newValue) => context.emit('update:fiatAmount', newValue),
        });
        const _cryptoAmount = computed({
            get: () => props.cryptoAmount,
            set: (newValue) => context.emit('update:cryptoAmount', newValue),
        });

        return {
            currencySelectorOpen,
            CryptoCurrency,
            _fiatAmount,
            _cryptoAmount,
        };
    },
    components: {
        AmountInput,
    },
});
</script>

<style lang="scss" scoped>
section.dual-currency-input {
        text-align: center;
        margin-top: 3rem;
        margin-bottom: 2rem;

        &.orange {
            color: var(--nimiq-orange);
            transition: color 200ms cubic-bezier(0.5, 0, 0.15, 1);

            .amount-input {
                &, &:hover, &:focus {
                    color: var(--nimiq-orange);
                    transition: color 200ms cubic-bezier(0.5, 0, 0.15, 1);

                    ::v-deep .nq-input,
                    ::v-deep .label-input + span,
                    ::v-deep .label-input + .ticker,
                    ::v-deep .label-input:focus-within + .ticker {
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

            .amount-menu {
                .button {
                    align-items: center;
                    cursor: pointer;
                    transition: color var(--attr-duration) var(--nimiq-ease);

                    &::after {
                        content: '';
                        display: block;
                        width: 0;
                        height: 0;
                        border: 1rem solid transparent;
                        border-width: 1rem 0.625rem;
                        border-top-color: inherit;
                        margin-left: 0.75rem;
                        margin-bottom: -1.5rem;
                        opacity: 0.4;

                        transition: opacity var(--attr-duration) var(--nimiq-ease);
                    }

                    &:hover,
                    &:active,
                    &:focus-within {
                        &::after {
                            opacity: 0.7;
                        }
                    }
                }

                .menu {
                    position: absolute;
                    z-index: 1;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    background: var(--nimiq-blue-bg);
                    box-shadow: 0 1.25rem 2.5rem rgba(0, 0, 0, 0.2);

                    button {
                        color: white;
                        opacity: 0.7;
                        font-size: var(--body-size);
                        line-height: 1.5;
                        font-weight: 600;
                        padding: 0.5rem;
                        align-items: center;

                        transition: opacity var(--attr-duration) var(--nimiq-ease);

                        svg {
                            width: 2rem;
                            margin-right: 1rem;
                        }

                        &:hover,
                        &:focus {
                            opacity: 1 !important;
                        }
                    }
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
</style>
