<template>
    <div class="btc-address-input" :class="{ invalid }">
        <LabelInput v-model="address"
            :style="{ fontSize: `calc(var(--body-size) * ${inputFontSizeScaleFactor})` }"
            :placeholder="placeholder"
            :disabled="disabled"
            @input="onInput"
            @paste="onPaste"
            ref="input$"
        />
        <transition name="fade">
            <button v-if="!address.length && !disabled" class="reset scan-qr-button" @click="$emit('scan')">
                <ScanQrCodeIcon/>
            </button>
        </transition>
        <span class="notice"
            :class="{
                'resolving': isResolvingUnstoppableDomain,
                'nq-orange': resolverError || invalid,
            }"
            :style="{'opacity': invalid || isResolvingUnstoppableDomain ? 1 : 0}"
        >
            <template v-if="isResolvingUnstoppableDomain">
                {{ $t('Resolving Unstoppable Domain...') }}
            </template>
            <template v-else-if="resolverError">
                {{ resolverError }}
            </template>
            <template v-else-if="invalid">
                {{ $t('This is not a valid address') }}
            </template>
        </span>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick } from 'vue';
import { LabelInput, ScanQrCodeIcon } from '@nimiq/vue-components';
import { parseRequestLink, Currency } from '@nimiq/utils';
import { useI18n } from '@/lib/useI18n';
import { loadBitcoinJS } from '../lib/BitcoinJSLoader';
import { ENV_MAIN } from '../lib/Constants';
import { normalizeAddress, validateAddress } from '../lib/BitcoinTransactionUtils';
import {
    isValidDomain as isValidUnstoppableDomain,
    resolve as resolveUnstoppableDomain,
} from '../lib/UnstoppableDomains';
import { useConfig } from '../composables/useConfig';

const BtcAddressInput = defineComponent({
    props: {
        placeholder: {
            type: String,
            required: false,
        },
        value: {
            type: String,
            default: '',
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, context) {
        const { $t } = useI18n();
        const { config } = useConfig();

        const input$ = ref<LabelInput | null>(null);
        const inputFontSizeScaleFactor = ref(1);
        let inputPadding: number | null = null;

        const address = ref('');
        const invalid = ref(false);

        const isResolvingUnstoppableDomain = ref(false);
        const resolverError = ref('');

        function focus() {
            if (!input$.value) return;
            input$.value.focus();
        }

        async function checkAddress() {
            resolverError.value = '';

            // Detect unstoppable domains
            if (isValidUnstoppableDomain(address.value)) {
                isResolvingUnstoppableDomain.value = true;
                const domain = address.value;
                const ticker = config.environment === ENV_MAIN ? 'BTC' : 'TBTC';
                try {
                    const [resolvedAddress] = await Promise.all([
                        resolveUnstoppableDomain(domain, ticker),
                        loadBitcoinJS(),
                    ]);
                    const normalizedAddress = resolvedAddress && normalizeAddress(resolvedAddress);
                    if (normalizedAddress && validateAddress(normalizedAddress)) {
                        context.emit('domain-address', domain, normalizedAddress);
                        invalid.value = false;
                    } else {
                        resolverError.value = $t('Domain does not resolve to a valid address') as string;
                        invalid.value = true;
                    }
                } catch (e) {
                    console.debug(e); // eslint-disable-line no-console
                    let message = e instanceof Error ? e.message : String(e);
                    message = message.replace(`crypto.${ticker}.address record`, `${ticker} address`);
                    resolverError.value = message;
                    invalid.value = true;
                } finally {
                    isResolvingUnstoppableDomain.value = false;
                }

                return;
            }

            // BTC addresses are at least 26 characters long
            if (address.value.length < 26) {
                invalid.value = false;
                return;
            }

            const normalizedAddress = normalizeAddress(address.value);
            await loadBitcoinJS();
            if (validateAddress(normalizedAddress)) {
                context.emit('address', normalizedAddress);
                invalid.value = false;
            } else {
                invalid.value = true;
            }
        }

        async function updateInputFontSize() {
            await nextTick();

            if (!input$.value) return;

            if (!inputPadding) {
                inputPadding = parseInt(
                    window.getComputedStyle(input$.value.$el.children[2])
                        .getPropertyValue('padding-left')
                        .replace('px', ''),
                    10,
                );
            }

            inputFontSizeScaleFactor.value = 1;
            await nextTick();

            const width = input$.value.$el.children[1].clientWidth;
            const maxWidth = input$.value.$el.children[2].clientWidth - (inputPadding / 2);

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

            const bitcoinRequestLink = parseRequestLink(pastedData, {
                currencies: [Currency.BTC],
                normalizeAddress: {
                    [Currency.BTC]: normalizeAddress,
                },
                // No need to pass isValidAddress (which would require loading BitcoinJS) because validity will be
                // checked in onUpdate, too.
            });
            if (bitcoinRequestLink) {
                event.preventDefault();
                address.value = bitcoinRequestLink.recipient;
                onUpdate();
            }

            context.emit('paste', event, pastedData);
        }

        watch(() => props.value, () => {
            address.value = props.value;
            onUpdate();
        });

        return {
            focus, // exposed for use from other components

            input$,
            address,
            invalid,
            onPaste,
            onInput,
            inputFontSizeScaleFactor,
            isResolvingUnstoppableDomain,
            resolverError,
        };
    },
    components: {
        LabelInput,
        ScanQrCodeIcon,
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type BtcAddressInput = InstanceType<typeof BtcAddressInput>;
export default BtcAddressInput;
</script>

<style lang="scss" scoped>
    .btc-address-input {
        text-align: center;
        position: relative;
    }

    .label-input {
        font-family: 'Fira Mono', monospace;

        ::v-deep input {
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

        ::v-deep .width-finder {
            padding: 0 2rem;
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

    .notice {
        display: block;
        margin-top: 0.75rem;
        opacity: 0;
        font-weight: 600;

        transition: opacity 0.3s var(--nimiq-ease);

        &.resolving {
            font-size: var(--small-size);
            opacity: 0.5 !important;
        }
    }
</style>
