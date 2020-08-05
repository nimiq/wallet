<template>
    <div class="btc-address-input" :class="{invalid}">
        <LabelInput v-model="address" :placeholder="placeholder" @input="checkAddress" @paste="onPaste" ref="input"/>
        <span class="invalid-address nq-orange">{{ $t('This is not a valid address') }}</span>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { LabelInput } from '@nimiq/vue-components';
import Config from 'config';
import { loadBitcoinJS } from '../lib/BitcoinJSLoader';
import { BIP49_ADDRESS_VERSIONS, BIP84_ADDRESS_PREFIX } from '../../../hub/src/lib/bitcoin/BitcoinConstants';
import { ENV_MAIN } from '../lib/Constants';

/* global BitcoinJS */

function validateAddress(address: string, network: 'MAIN' | 'TEST') {
    try {
        // @ts-ignore BitcoinJS is not defined
        const parsedAddress = BitcoinJS.address.fromBase58Check(address);
        return BIP49_ADDRESS_VERSIONS[network].includes(parsedAddress.version);
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
        const address = ref('');
        const invalid = ref(false);

        let checkingAddress = false;

        function checkAddress() {
            context.emit('input', address.value);

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

        function onPaste(event: ClipboardEvent) {
            const { clipboardData } = event;
            const pastedData = clipboardData ? clipboardData.getData('text/plain') : '';
            context.emit('paste', event, pastedData);
        }

        return {
            address,
            invalid,
            checkAddress,
            onPaste,
        };
    },
    methods: {
        focus() {
            (this.$refs.input as LabelInput).focus();
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
        /deep/ input {
            width: 100% !important;
            font-family: 'Fira Mono', monospace;
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
