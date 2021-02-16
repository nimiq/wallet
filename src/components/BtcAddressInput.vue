<template>
    <div class="btc-address-input" :class="{ invalid }">
        <LabelInput v-model="address"
            :style="{ fontSize: `calc(var(--body-size) * ${inputFontSizeScaleFactor})` }"
            :placeholder="placeholder"
            @input="onInput"
            @paste="onPaste"
            ref="$input"
        />
        <transition name="fade">
            <button v-if="!address.length" class="reset scan-qr-button" @click="$emit('scan')">
                <ScanQrCodeIcon/>
            </button>
        </transition>
        <span class="invalid-address nq-orange">{{ $t('This is not a valid address') }}</span>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api';
import { LabelInput, ScanQrCodeIcon } from '@nimiq/vue-components';
import Config from 'config';
import { loadBitcoinJS } from '../lib/BitcoinJSLoader';
import { ENV_MAIN } from '../lib/Constants';
import { parseBitcoinUrl, validateAddress } from '../lib/BitcoinTransactionUtils';

export default defineComponent({
    props: {
        placeholder: {
            type: String,
            required: false,
        },
        value: {
            type: String,
            default: '',
        },
    },
    setup(props, context) {
        const $input = ref<LabelInput>(null);
        const inputFontSizeScaleFactor = ref(1);
        let inputPadding: number | null = null;

        const address = ref('');
        const invalid = ref(false);

        let checkingAddress = false;

        function checkAddress() {
            // BTC addresses are at least 26 characters long
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
            await context.root.$nextTick();

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

        function onUpdate() {
            checkAddress();
            updateInputFontSize();
        }

        function onInput() {
            context.emit('input', address.value);
            onUpdate();
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

        watch(() => props.value, () => {
            address.value = props.value;
            onUpdate();
        });

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
        ScanQrCodeIcon,
    },
});
</script>

<style lang="scss" scoped>
    .btc-address-input {
        text-align: center;
        position: relative;
    }

    .label-input {
        font-family: 'Fira Mono', monospace;

        /deep/ input {
            width: 100% !important;
            padding: 1.75rem 2rem;
            line-height: 2.5rem;

            &::placeholder {
                font-size: var(--body-size);
                font-weight: 600;
                font-family: Muli, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu,
                    Cantarell, "Helvetica Neue", sans-serif;
            }

            .invalid & {
                --border-color: rgba(252, 135, 2, 0.4);
                color: var(--nimiq-orange);
            }
        }
    }

    .scan-qr-button {
        position: absolute;
        right: 1.25rem;
        top: 1.25rem;
        font-size: 3.5rem;
        opacity: 0.4;

        transition: opacity var(--attr-duration) var(--nimiq-ease);

        &:hover,
        &:focus {
            opacity: 0.6;
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
