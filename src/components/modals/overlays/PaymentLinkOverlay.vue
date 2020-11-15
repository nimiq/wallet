<template>
    <div class="payment-link-overlay">
        <PageHeader class="link-overlay">
            {{ $t('Share your Payment Link') }}
            <div slot="more">
                {{ $t('Share the link or QR code with the sender.\nOptionally include an amount. ') }}
            </div>
        </PageHeader>
        <PageBody class="flex-column link-overlay">
            <div class="inputs">
                <div class="separator"></div>
                <AmountInput
                    v-model="amount"
                    :maxFontSize="5"
                    :decimals="currency === 'btc' ? btcUnit.decimals : undefined"
                >
                    <span slot="suffix" class="ticker" v-if="currency === 'btc'">{{ btcUnit.ticker }}</span>
                </AmountInput>
                <div class="separator"></div>
            </div>
            <QrCode
                :data="requestLink"
                :size="400"
                :fill="'#1F2348' /* nimiq-blue */"
                class="qr-code"
            />
            <Copyable :text="`${origin}/${requestLink}`">
                {{ origin.replace(/https?:\/\//, '') }}/{{ requestLink }}
            </Copyable>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from '@vue/composition-api';
import { PageHeader, PageBody, QrCode, Copyable } from '@nimiq/vue-components';
import { createRequestLink, GeneralRequestLinkOptions, NimiqRequestLinkType, Currency } from '@nimiq/utils';
import { useSettingsStore } from '@/stores/Settings';
import AmountInput from '../../AmountInput.vue';

export default defineComponent({
    props: {
        address: {
            type: String,
            required: true,
        },
        currency: {
            type: String,
            required: true,
            validator: (currency: Currency) => Object.values(Currency).includes(currency),
        },
    },
    setup(props/* , context */) {
        const amount = ref<number>(0);
        const message = ref<string>('');
        const { btcUnit } = useSettingsStore();

        const requestLinkOptions = computed(() => ({
            type: props.currency === Currency.NIM ? NimiqRequestLinkType.URI : undefined,
            amount: amount.value,
            currency: props.currency,
            message: message.value,
        } as GeneralRequestLinkOptions));

        const requestLink = computed(
            () => createRequestLink(props.address, requestLinkOptions.value),
        );

        return {
            origin: window.location.origin,
            amount,
            message,
            btcUnit,
            requestLink,
        };
    },
    methods: {
        clear() {
            (this as Vue & { amount: number }).amount = 0;
        },
    },
    components: {
        PageHeader,
        PageBody,
        QrCode,
        Copyable,
        AmountInput,
    },
});
</script>

<style lang="scss" scoped>
.page-header {
    padding: 4rem 3rem 2rem;

    div {
        font-size: var(--body-size);
        line-height: 1.4;
        font-weight: 600;
        opacity: 0.6;
        margin-top: 1rem;
    }
}

.page-body {
    padding: 1rem 3rem 3rem;
    justify-content: space-between;
    align-items: center;
    overflow: visible;

    .dynamic-spacer {
        flex-grow: 1;
        max-height: 1rem;
    }

    .inputs {
        width: calc(100% + 4rem);
        margin: -1rem -2rem 4rem;
        position: relative;

        .separator:first-child {
            height: 2px;
            margin-bottom: 1.5rem;
            box-shadow: inset 0 1.5px 0 var(--text-10);
        }

        .separator:last-child {
            height: 2px;
            margin-top: 1.5rem;
            box-shadow: inset 0 -1.5px 0 var(--text-10);
        }

        .amount-input {
            font-size: 5rem;

            /deep/ .nim {
                font-size: 0.5em;
                margin-left: 0.5rem;
                margin-right: calc(-1.9em - 0.5rem);
            }

            /deep/ .nq-input {
                padding: 0;
            }

            /deep/ .width-finder {
                padding: 0 1rem;
            }
        }
    }

    .qr-code {
        flex-shrink: 1;
        // min-height: 0;

        // The QrCode is rendered at 2x size and then scaled to half its size,
        // to be sharp on retina displays:
        // 2 x 200px = 400px
        // But now we need to make it behave as half its size as well, that's
        // why we use negative margins on all sides (100px = 200px / 2).
        transform: scale(0.5);
        margin: -100px;
    }

    .copyable {
        flex-shrink: 0;
        max-width: 100%;
        word-wrap: break-word;
        color: rgba(31, 35, 72, 0.5);
        text-align: center;
        font-size: var(--h2-size);
        margin-top: 2rem;
    }
}
</style>
