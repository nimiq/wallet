<template>
    <div class="amount-menu">
        <button class="reset button flex-row">{{ activeCurrency.toUpperCase() }}</button>
        <div v-if="open" class="menu">
            <button class="reset flex-row" @click="$emit('fee-selection')">
                <!-- eslint-disable-next-line max-len -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><line class="cls-1" x1="15.25" y1="3.25" x2="7.75" y2="3.25"/><line class="cls-1" x1="12.25" y1="7.75" x2="0.75" y2="7.75"/><line class="cls-1" x1="13.75" y1="12.25" x2="4.75" y2="12.25"/></g></svg>
                {{ $t('Set fee') }}
            </button>
            <button class="reset flex-row" @click="$emit('send-max')">
                <!-- eslint-disable-next-line max-len -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><line class="cls-1" x1="8.25" y1="6.25" x2="8.25" y2="15.25"/><path class="cls-1" d="M12.25,9.3l-4-4-4,4"/><line class="cls-1" x1="3.25" y1="1.25" x2="13.25" y2="1.25"/></g></svg>
                {{ $t('Send all') }}
            </button>
            <div class="separator"></div>
            <div class="flex-row currencies">
                <button
                    class="reset" :class="{'active': activeCurrency === 'nim'}"
                    @click="$emit('currency', 'nim')"
                >NIM</button>
                <button
                    v-for="fiatCurrency of [fiatCurrency, ...otherFiatCurrencies]" :key="fiatCurrency"
                    class="reset" :class="{'active': activeCurrency === fiatCurrency}"
                    @click="$emit('currency', fiatCurrency)"
                >{{ fiatCurrency.toUpperCase() }}</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { FiatCurrency } from '../lib/Constants';

export default defineComponent({
    props: {
        open: {
            type: Boolean,
            default: false,
        },
        activeCurrency: {
            type: String,
            required: true,
        },
        fiatCurrency: {
            type: String,
            required: true,
        },
        otherFiatCurrencies: {
            type: Array as () => FiatCurrency[],
            required: true,
        },
    },
});
</script>

<style lang="scss" scoped>
.button {
    align-items: center;
    cursor: pointer;

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
    &:active {
        &::after {
            opacity: 0.7;
        }
    }
}

.menu {
    width: 16.75rem;
    border-radius: 0.5rem;
    background: var(--nimiq-blue-bg);
    padding: 1rem;
    box-shadow: 0 1.25rem 2.5rem rgba(0, 0, 0, 0.2);

    button {
        color: white;
        opacity: 0.7;
        font-size: var(--body-size);
        line-height: 1.5;
        font-weight: 600;
        width: 100%;
        text-align: left;
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

    .separator {
        height: 0.125rem;
        background: white;
        opacity: 0.16;
        border-radius: 1rem;
        margin: 1rem 0;
    }

    .currencies {
        flex-wrap: wrap;

        button {
            width: 50%;
            opacity: 0.4;
            font-weight: bold;

            &.active {
                opacity: 1;

                &::after {
                    content: '';
                    display: inline-block;
                    border: 1rem solid transparent;
                    border-width: 0.5rem 0.75rem;
                    border-right-color: inherit;
                    margin-bottom: 0.25rem;
                    margin-left: -0.25rem;
                }
            }
        }
    }
}
</style>
