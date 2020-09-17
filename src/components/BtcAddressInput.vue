<template>
    <div class="btc-address-input"
        :class="{invalid}"
        :style="{ fontSize: `calc(var(--body-size) * ${inputFontSizeScaleFactor})` }"
    >
        <LabelInput v-model="address" :placeholder="placeholder" @input="onInput" @paste="onPaste" ref="$input"/>
        <span class="invalid-address nq-orange">{{ $t('This is not a valid address') }}</span>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, Ref } from '@vue/composition-api';
import { LabelInput } from '@nimiq/vue-components';
import Config from 'config';
import { loadBitcoinJS } from '../lib/BitcoinJSLoader';
import { ENV_MAIN } from '../lib/Constants';
import { parseBitcoinUrl } from '../lib/BitcoinTransactionUtils';

/* global BitcoinJS */

export const BIP49_ADDRESS_VERSIONS = {
    // See https://en.bitcoin.it/wiki/List_of_address_prefixes
    MAIN: [0, 5], // 0 = BIP44, 5 = BIP49
    TEST: [111, 196], // 111 = BIP44, 196 = BIP49
};

export const BIP84_ADDRESS_PREFIX = {
    // See https://en.bitcoin.it/wiki/List_of_address_prefixes
    MAIN: 'bc',
    TEST: 'tb',
};

function validateAddress(address: string, network: 'MAIN' | 'TEST') {
    try {
        // @ts-ignore BitcoinJS is not defined
        const parsedAddress = BitcoinJS.address.fromBase58Check(address);
        return BIP49_ADDRESS_VERSIONS[network].includes(parsedAddress.version); // Check includes legacy BIP44 versions
    } catch (error) {
        // Ignore
    }

    try {
        // @ts-ignore BitcoinJS is not defined
        const parsedAddress = BitcoinJS.address.fromBech32(address);
        return BIP84_ADDRESS_PREFIX[network] === parsedAddress.prefix;
    } catch (error) {
        // Ignore
    }

    return false;
}

export default defineComponent({
    props: {
        placeholder: {
            type: String,
            required: false,
        },
    },
    setup(props, context) {
        const $input: Ref<LabelInput | null> = ref(null);
        const inputFontSizeScaleFactor: Ref<number> = ref(1);
        let inputPadding: number | null = null;

        const address = ref('');
        const invalid = ref(false);

        let checkingAddress = false;

        function checkAddress() {
            // BTC addresses are between 26-35 characters long
            if (address.value.length < 26) {
                invalid.value = false;
                return;
            }

            if (checkingAddress) return;
            checkingAddress = true;

            loadBitcoinJS().then(() => {
                const isValid = validateAddress(address.value, Config.environment === ENV_MAIN ? 'MAIN' : 'TEST');
                if (isValid) {
                    context.emit('address', address.value);
                }
                invalid.value = !isValid;

                checkingAddress = false;
            });
        }

        async function updateInputFontSize() {
            if (!$input.value) return;

            if (!inputPadding) {
                inputPadding = parseInt(
                    window.getComputedStyle($input.value.$el.children[2])
                        .getPropertyValue('padding-left')
                        .replace('px', ''),
                    10,
                );
            }

            inputFontSizeScaleFactor.value = 1;
            await context.root.$nextTick();

            const width = $input.value.$el.children[1].clientWidth;
            const maxWidth = $input.value.$el.children[2].clientWidth - (inputPadding / 2);

            inputFontSizeScaleFactor.value = Math.max(Math.min(maxWidth / width, 1), 0.7);
        }

        function onPaste(event: ClipboardEvent) {
            const { clipboardData } = event;
            const pastedData = clipboardData ? clipboardData.getData('text/plain') : '';

            try {
                const { recipient } = parseBitcoinUrl(pastedData);
                event.preventDefault();
                address.value = recipient;
                checkAddress();
            } catch (err) {
                // Ignore
            }

            context.emit('paste', event, pastedData);
        }

        async function onInput() {
            context.emit('input', address.value);
            checkAddress();
            await updateInputFontSize();
        }

        return {
            $input,
            address,
            invalid,
            checkAddress,
            onPaste,
            onInput,
            inputFontSizeScaleFactor,
        };
    },
    methods: {
        focus() {
            (this.$refs.$input as LabelInput).focus();
        },
    },
    components: {
        LabelInput,
    },
});
</script>

<style lang="scss" scoped>
    .btc-address-input {
        text-align: center;
    }

    .label-input {
        font-family: 'Fira Mono', monospace;

        /deep/ input {
            width: 100% !important;
            padding: 1.75rem 2rem;
            line-height: 2.5rem;

            &::placeholder {
                font-size: var(--body-size);
                font-family: Muli, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu,
                    Cantarell, "Helvetica Neue", sans-serif;
            }

            .invalid & {
                --border-color: rgba(252, 135, 2, 0.4);
                color: var(--nimiq-orange);
            }
        }
    }

    .invalid-address {
        display: block;
        margin-top: 0.75rem;
        opacity: 0;
        font-weight: 600;

        transition: opacity 0.3s var(--nimiq-ease);

        .invalid & {
            opacity: 1;
        }
    }
</style>
