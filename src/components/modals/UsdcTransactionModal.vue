<template>
    <Modal class="transaction-modal" :class="{'value-masked': amountsHidden}">
        <PageHeader>
             <i18n path="Transaction from {address}" :tag="false">
                <template v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>
            </i18n>

            <span slot="more" class="date nq-green">
                <i18n path="Received at {dateAndTime}" :tag="false">
                    <template v-slot:dateAndTime>
                        {{ datum }} <strong>&middot;</strong> {{ time }}
                    </template>
                </i18n>
            </span>
        </PageHeader>
        <PageBody class="flex-column">
            <div class="flex-row sender-recipient">
                <div class="address-info flex-column">
                    <div class="crypto-logo-container">
                       <Avatar :label="peerLabel || ''"/>
                    </div>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="peerAddress && (peerIsContact || !peerLabel)"
                        :placeholder="$t('Add contact')"
                        :value="peerLabel || ''"
                        @input="setContact(peerAddress, $event.target.value)"
                    />
                    <span v-else class="label">{{ peerLabel }}</span>
                    <Tooltip preferredPosition="bottom right" class="left-aligned">
                        <ShortAddress :address="peerAddress" slot="trigger"/>
                        {{ peerAddress }}
                    </Tooltip>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <div class="crypto-logo-container">
                       <UsdcIcon class="usdc" />
                    </div>
                    <span class="label">{{ $t('USD Coin') }}</span>
                    <Tooltip preferredPosition="bottom right" class="left-aligned">
                        <ShortAddress :address="transaction.recipient" slot="trigger"/>
                        {{ transaction.recipient }}
                    </Tooltip>
                </div>
            </div>

            <div class="amount-block flex-column">
                <Amount :amount="transaction.value" currency="usdc" value-mask :currency-decimals="6"
                    class="transaction-value nq-green isIncoming" />

                <div class="flex-row">
                    <div class="fiat-amount">
                        <Tooltip>
                            <template slot="trigger">
                                <FiatAmount :amount="fiatValue" :currency="fiatCurrency" value-mask/>
                            </template>
                            <span>{{ $t('Historic value') }}</span>
                            <p class="explainer">
                                {{ $t('This historic value is based on an average of cross-exchange prices.'
                                    + ' It might vary due to market volatility and liquidity.') }}
                            </p>
                        </Tooltip>
                    </div>
                </div>
            </div>
            <div class="flex-spacer"></div>

            <Tooltip preferredPosition="bottom right" class="info-tooltip">
                <InfoCircleSmallIcon slot="trigger"/>
                <span v-if="transaction.blockHeight" class="block">
                    {{ $t('Block #{height}', { height: transaction.blockHeight }) }}
                </span>
                <span class="confirmations">
                    {{ $tc('{count} Confirmation | {count} Confirmations', confirmations) }}
                </span>
                <!-- <span v-if="transaction.fee" class="fee"><Amount :amount="transaction.fee"/> fee</span> -->

                <BlueLink
                    :href="blockExplorerLink"
                    target="_blank" rel="noopener"
                >{{ $t('Block explorer') }}</BlueLink>
            </Tooltip>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { explorerTxLink } from '@/lib/ExplorerUtils';
import { twoDigit } from '@/lib/NumberFormatting';
import { useAccountStore } from '@/stores/Account';
import { useAddressStore } from '@/stores/Address';
import { useFiatStore } from '@/stores/Fiat';
import { useSettingsStore } from '@/stores/Settings';
import { useUsdcContactsStore } from '@/stores/UsdcContacts';
import { useUsdcNetworkStore } from '@/stores/UsdcNetwork';
import {
    Amount,
    ArrowRightIcon, FiatAmount, InfoCircleSmallIcon, PageBody,
    PageHeader,
    Tooltip,
} from '@nimiq/vue-components';
import { computed, defineComponent } from '@vue/composition-api';
import { useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import Avatar from '../Avatar.vue';
import BlueLink from '../BlueLink.vue';
import UsdcIcon from '../icons/UsdcIcon.vue';
import ShortAddress from '../ShortAddress.vue';
import Modal from './Modal.vue';

export default defineComponent({
    name: 'usdc-transaction-modal',
    props: {
        hash: {
            type: String,
            required: true,
        },
    },
    setup(props, context) {
        const { amountsHidden } = useSettingsStore();
        const { state: addresses$ } = useAddressStore();

        const transaction = computed(() => useUsdcTransactionsStore().state.transactions[props.hash]);

        // Peer
        const { getLabel, setContact } = useUsdcContactsStore();

        const peerAddress = computed(() => transaction.value.sender);
        const peerLabel = computed(() => {
            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[peerAddress.value];
            if (ownedAddressInfo) {
                // Find account label
                const { accountInfos } = useAccountStore();
                return Object.values(accountInfos.value)
                    .find((accountInfo) => accountInfo.polygonAddresses.includes(ownedAddressInfo.address))?.label;
            }

            // Search contacts
            if (getLabel.value(peerAddress.value)) return getLabel.value(peerAddress.value)!;

            return false;
        });
        const peerIsContact = computed(() => !!peerAddress.value && !!getLabel.value(peerAddress.value));

        // Date
        const date = computed(() => transaction.value.timestamp && new Date(transaction.value.timestamp * 1000));
        const datum = computed(() => date.value && date.value.toLocaleDateString());
        const time = computed(() => date.value
            && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`);

        // Fiat currency
        const { currency: fiatCurrency } = useFiatStore();
        const fiatValue = computed(() => transaction.value.fiatValue
            ? transaction.value.fiatValue[fiatCurrency.value]
            : undefined,
        );

        // Top left tooltip
        const { height: blockHeight } = useUsdcNetworkStore();
        const confirmations = computed(() =>
            transaction.value.blockHeight ? blockHeight.value - transaction.value.blockHeight + 1 : 0);
        const blockExplorerLink = computed(() => explorerTxLink('USDC', transaction.value.transactionHash));

        return {
            amountsHidden,
            blockExplorerLink,
            confirmations,
            datum,
            fiatCurrency,
            fiatValue,
            peerAddress,
            peerLabel,
            peerIsContact,
            setContact,
            time,
            transaction,
        };
    },
    components: {
        Amount,
        Avatar,
        ArrowRightIcon,
        BlueLink,
        FiatAmount,
        InfoCircleSmallIcon,
        Modal,
        PageBody,
        PageHeader,
        ShortAddress,
        Tooltip,
        UsdcIcon,
    },
});
</script>

<style lang="scss" scoped>
.page-header {
    ::v-deep .nq-h1 {
        margin-left: 2rem;
        margin-right: 2rem;
        max-width: calc(100% - 4rem);
        white-space: nowrap;
        overflow: hidden;
        margin-bottom: 1rem;
        mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
    }

    span {
        font-size: var(--body-size);
        font-weight: 600;
        align-items: center;
        justify-content: center;

        &.date {
            display: block;
        }

        ::v-deep .circle-spinner,
        &.failed svg {
            margin-right: 1rem;
        }
    }

    &.inline-header {
        display: flex;
        flex-direction: column;

        ::v-deep .nq-h1 {
            align-self: center;
        }
    }
}

.page-body {
    justify-content: space-between;
    align-items: center;
    padding-bottom: 3rem;
    overflow-y: initial;

    &.expired,
    &.invalidated {
        .avatar {
            filter: saturate(0);
            opacity: 0.5;
        }

        .label {
            opacity: 0.5;
        }

        .address-display {
            opacity: 0.3;
        }

        .amount-block {
            opacity: 0.4;
        }
    }

    button.swap-other-side {
        border-radius: 8rem;
        padding: 0.25rem 1.5rem;
        margin: -0.25rem -1.5rem;
        transition: background-color var(--transition-time) var(--nimiq-ease);

        &:hover,
        &:focus{
            background-color: #F2F2F4;
        }

        &.incoming:hover,
        &.incoming:focus{
            background-color: #EDFAF8;
        }
    }
}

.opacity-60 {
    opacity: 0.6;
}

.sender-recipient {
    justify-content: space-between;
    width: 100%;
    padding: 0 1rem;

    .arrow {
        font-size: 3rem;
        margin-top: 2.5rem;
        opacity: 0.4;
        flex-shrink: 0;
    }
}

.address-info {
    align-items: center;
    width: 19rem;

    .nq-link {
        font-size: var(--small-size);
        color: inherit;
        opacity: 0.5;
    }
}

.avatar,
.bank-icon,
.address-info > svg {
    position: relative;
    width: 8rem;
    height: 8rem;
    font-size: 3.75rem;
    display: block;
}

.address-info > svg {
    color: var(--bitcoin-orange);
}

.address-info .crypto-logo-container {
    position: relative;
    display: inherit;

    > svg {
        width: 8rem;
        height: 8rem;

        &.usdc {
            color: var(--usdc-blue);
        }
    }
}

.label,
.nq-input-s {
    font-size: var(--body-size);
    font-weight: 600;
    text-align: center;
}

.label {
    margin: 2rem 0 1rem;
    white-space: nowrap;
    overflow: hidden;
    width: 100%;
    mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));

    &.unlabelled {
        font-style: italic;
    }
}

.nq-input-s {
    margin: 1.25rem 0 0.375rem;
    max-width: 100%;
}

.nq-input-s:not(:focus):not(:hover) {
    mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0) calc(100% - 1rem));
}

.address-info .tooltip ::v-deep {
    .tooltip-box {
        padding: 1rem;
        font-size: var(--small-size);
        line-height: 1;
        font-family: 'Fira Mono', monospace;
        font-weight: normal;
        letter-spacing: -0.02em;
        white-space:nowrap;
        word-spacing: -0.2em;
    }

    .trigger {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        transition: background 300ms var(--nimiq-ease);

        &:hover,
        &:focus,
        &:focus-within {
            background: var(--text-6);

            .short-address {
                opacity: .6;
            }
        }
    }
}

.tooltip.left-aligned ::v-deep .tooltip-box {
    transform: translate(-9.25rem, 2rem);
}

.tooltip.right-aligned ::v-deep .tooltip-box {
    transform: translate(9.25rem, 2rem);
}

.short-address {
    font-size: var(--body-size);
    opacity: 0.5;
    transition: opacity .3s var(--nimiq-ease);
}

.amount-block {
    align-items: center;
    margin: 4rem 0 2rem;

    .amount.transaction-value {
        --size: 5rem;
        font-size: var(--size);
        line-height: 1;
        margin-bottom: 0.5rem;

        ::v-deep .currency {
            font-size: 0.5em;
            font-weight: bold;
            margin-right: -1.9em;
        }

        &:not(.isIncoming)::before {
            content: '-';
            margin-right: -0.1em;
            margin-left: -0.4em;
        }

        &.isIncoming::before {
            content: '+';
            margin-right: -0.1em;
            margin-left: -0.6em;
        }

        @media (max-width: 700px) { // Full Mobile Breakpoint
            font-size: 4.75rem;
        }
    }

    .flex-row {
        align-items: center;
    }

    .fiat-amount {
        --size: var(--small-size);
        font-size: var(--size);
        font-weight: 600;
        color: var(--text-50);
        line-height: 1;

        .tooltip {
            ::v-deep .trigger {
                .fiat-amount {
                    transition: color 0.2s var(--nimiq-ease);
                }

                &:hover .fiat-amount,
                &:focus .fiat-amount {
                    color: var(--text-60);
                }

                &::after {
                    top: -1.5rem;
                    background: #211B43;
                }
            }

            ::v-deep .tooltip-box {
                width: 28rem;
                transform: translate(-10rem, -1.5rem);
            }

            ::v-deep [value-mask]::after{
                margin-right: 0;
            }
        }
    }

    .dot {
        margin: 0 1rem;
        color: var(--text-30);
    }

    button {
        line-height: 1;
    }

    .icon,
    .swapped-amount {
        color: var(--text-50);
    }

    .icon {
        margin-right: 0.375rem;
    }

    .swapped-amount {
        --size: var(--small-size);
        font-size: var(--size);
        font-weight: bold;
    }

    .swap-other-side.incoming {
        .icon,
        .swapped-amount {
            color: var(--nimiq-green);
        }
    }

    .message {
        margin: 1rem 0;
        text-align: center;
        font-size: var(--body-size);
        line-height: 1.375;
        word-break: break-word;
    }
}

.info-tooltip {
    position: absolute;
    left: 2rem;
    top: 2rem;
    z-index: 3; // To be above .swipe-handle

    ::v-deep .trigger {
        color: rgba(31, 35, 72, 0.25);
        font-size: 2.25rem;

        transition: color 0.3s var(--nimiq-ease);

        &::before {
            content: '';
            display: block;
            position: absolute;
            left: -1.5rem;
            top: -1.5rem;
            right: -1.5rem;
            bottom: -1.5rem;
            border-radius: 50%;
        }

        &:hover,
        &:focus {
            color: rgba(31, 35, 72, 0.6);
        }
    }

    ::v-deep .tooltip-box {
        font-size: var(--small-size);
        white-space: nowrap;
        line-height: 1.3;
        font-weight: 600;
        transform: translate(-1rem, 2rem);
    }

    .confirmations {
        display: block;
        font-size: var(--small-label-size);
        opacity: 0.6;
    }

    // .fee {
    //     display: inline-block;
    //     margin-top: 1.25rem;
    // }

    .blue-link {
        color: var(--nimiq-light-blue-on-dark);
        margin-top: 1.25rem;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .page-header {
        ::v-deep .nq-h1 {
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }

        &.inline-header ::v-deep .nq-h1 {
            align-self: unset;
        }

        &:not(.inline-header) {
            ::v-deep .nq-h1 {
                white-space: normal;
            }

            label {
                white-space: nowrap;
            }
        }
    }

    .address-info {
        flex-shrink: 0;
    }

    .tooltip.left-aligned ::v-deep .tooltip-box {
        transform: translate(-7.75rem, 2rem);
    }

    .tooltip.right-aligned ::v-deep .tooltip-box {
        transform: translate(7.75rem, 2rem);
    }

    .tooltip {
        ::v-deep .tooltip-box {
            transform: translate(1rem, 2rem);
        }
    }
}

@media (max-width: 450px) { // Nimiq Style breakpoint for smaller .nq-card-header padding
    .page-header {
        ::v-deep .nq-h1 {
            margin-left: 3rem;
            margin-right: 3rem;
            // max-width: calc(100% - 6rem);
        }
    }
}

@media (max-width: 400px) {
    .sender-recipient {
        padding: 0;
    }
}

@media (max-width: 374px) {
    .page-body {
        padding-left: 2rem;
        padding-right: 2rem;
    }
}
</style>
