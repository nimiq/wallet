<template>
    <Modal class="transaction-modal">
        <PageHeader :class="{'inline-header': !peerLabel}">
            {{
                peerAddress === constants.CASHLINK_ADDRESS
                    ? '' /* Use the peerLabel below only, without prefix */
                    : isCashlink
                        ? isIncoming
                            ? $t('Cashlink from')
                            : $t('Cashlink to')
                        : isIncoming
                            ? $t('Transaction from')
                            : $t('Transaction to')
            }}<label><i v-html="'&nbsp;'"></i>{{
                peerLabel || peerAddress.substring(0, 9)
            }}</label>

            <span
                v-if="state === TransactionState.NEW || state === TransactionState.PENDING"
                slot="more"
                class="nq-light-blue flex-row"
            >
                <CircleSpinner/>
                {{ $t('Pending...') }}
            </span>
            <span
                v-else-if="state === TransactionState.EXPIRED || state === TransactionState.INVALIDATED"
                slot="more"
                class="nq-red failed flex-row"
            >
                <CrossIcon/>
                {{ state === TransactionState.EXPIRED ? $t('Expired') : $t('Failed') }}
            </span>
            <span v-else slot="more" :class="isIncoming ? 'nq-green' : 'opacity-60'">
                {{ isIncoming ? $t('received at') : $t('sent at') }}
                {{ datum }} <strong>&middot;</strong> {{ time }}
            </span>
        </PageHeader>
        <PageBody class="flex-column" :class="state">
            <div v-if="isIncoming" class="flex-row sender-recipient">
                <div class="address-info flex-column">
                    <div class="identicon">
                        <Identicon :address="peerAddress"/>
                        <div v-if="isCashlink" class="cashlink">
                            <CashlinkSmallIcon/>
                        </div>
                    </div>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="peerIsContact || !peerLabel"
                        :placeholder="$t('Add contact')"
                        :value="peerLabel || ''"
                        @input="setContact(peerAddress, $event.target.value)"
                    />
                    <span v-else class="label">{{ peerLabel }}</span>
                    <Copyable v-if="peerAddress !== constants.CASHLINK_ADDRESS" :text="peerAddress">
                        <AddressDisplay :address="peerAddress"/>
                    </Copyable>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <Identicon :address="activeAddressInfo.address"/>
                    <span class="label">{{ activeAddressInfo.label }}</span>
                    <Copyable :text="activeAddressInfo.address">
                        <AddressDisplay :address="activeAddressInfo.address"/>
                    </Copyable>
                </div>
            </div>
            <div v-else class="flex-row sender-recipient">
                <div class="address-info flex-column">
                    <Identicon :address="activeAddressInfo.address"/>
                    <span class="label">{{ activeAddressInfo.label }}</span>
                    <Copyable :text="activeAddressInfo.address">
                        <AddressDisplay :address="activeAddressInfo.address"/>
                    </Copyable>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <div class="identicon">
                        <UnclaimedCashlinkIcon v-if="peerAddress === constants.CASHLINK_ADDRESS" />
                        <Identicon v-else :address="peerAddress"/>
                        <div v-if="isCashlink" class="cashlink">
                            <CashlinkSmallIcon/>
                        </div>
                    </div>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="peerIsContact || !peerLabel"
                        :placeholder="$t('Add contact')"
                        :value="peerLabel || ''"
                        @input="setContact(peerAddress, $event.target.value)"
                    />
                    <span v-else class="label">{{ peerLabel }}</span>
                    <Copyable v-if="peerAddress !== constants.CASHLINK_ADDRESS" :text="peerAddress">
                        <AddressDisplay :address="peerAddress"/>
                    </Copyable>
                    <button
                        v-else-if="hubCashlink && hubCashlink.value"
                        class="nq-button-s manage-cashlink"
                        @click="manageCashlink(hubCashlink.address)">Show Link</button>
                </div>
            </div>

            <div class="amount-and-message flex-column">
                <Amount :amount="transaction.value" :class="{
                    isIncoming,
                    'nq-light-blue': state === TransactionState.NEW || state === TransactionState.PENDING,
                    'nq-green': (state === TransactionState.MINED || state === TransactionState.CONFIRMED)
                        && isIncoming,
                }"/>
                <transition name="fade">
                    <FiatConvertedAmount v-if="state === TransactionState.PENDING" :amount="transaction.value"/>
                    <div v-else-if="fiatValue === undefined" class="fiat-amount-loading">&nbsp;</div>
                    <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount-unavailable">
                        Fiat value unavailable
                    </div>
                    <FiatAmount v-else :amount="fiatValue" :currency="fiatCurrency" :locale="language"/>
                </transition>

                <div class="message">{{ data }}</div>
            </div>

            <!-- <button class="nq-button-s">Send more</button> -->
            <div class="flex-spacer"></div>

            <Tooltip v-if="transaction.blockHeight" preferredPosition="bottom right">
                <InfoCircleSmallIcon slot="trigger"/>
                <span class="block">{{ $t('Block #{height}', { height: transaction.blockHeight }) }}</span>
                <span v-if="confirmations" class="confirmations">
                    {{ $tc('{count} Confirmation | {count} Confirmations', confirmations) }}
                </span>
                <span v-if="transaction.fee" class="fee"><Amount :amount="transaction.fee"/> fee</span>
            </Tooltip>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { AddressBook, BrowserDetection } from '@nimiq/utils';
import {
    PageHeader,
    PageBody,
    Identicon,
    ArrowRightIcon,
    Copyable,
    AddressDisplay,
    FiatAmount,
    Tooltip,
    InfoCircleSmallIcon,
    CircleSpinner,
    LabelInput,
    CashlinkSmallIcon,
    CrossIcon,
} from '@nimiq/vue-components';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import Modal from './Modal.vue';
import UnclaimedCashlinkIcon from '../icons/UnclaimedCashlinkIcon.vue';
import { useTransactionsStore, TransactionState } from '../../stores/Transactions';
import { useAddressStore } from '../../stores/Address';
import { useContactsStore } from '../../stores/Contacts';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { useNetworkStore } from '../../stores/Network';
import { twoDigit } from '../../lib/NumberFormatting';
import { parseData } from '../../lib/DataFormatting';
import { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS } from '../../lib/Constants';
import { isCashlinkData } from '../../lib/CashlinkDetection';
import { useCashlinkStore } from '../../stores/Cashlink';
import { manageCashlink } from '../../hub';

export default defineComponent({
    name: 'transaction-modal',
    props: {
        hash: {
            type: String,
            required: true,
        },
    },
    setup(props, context) {
        const constants = { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS };
        const transaction = computed(() => useTransactionsStore().state.transactions[props.hash]);

        const { activeAddressInfo, state: addresses$ } = useAddressStore();
        const { getLabel, setContact } = useContactsStore();

        const state = computed(() => transaction.value.state);

        const isIncoming = computed(() => transaction.value.recipient === activeAddressInfo.value!.address);

        // Data & Cashlink Data
        const isCashlink = computed(() => isCashlinkData(transaction.value.data.raw));
        const hubCashlink = computed(() => {
            if (!isCashlink.value) return null;

            const { state: cashlinks$ } = useCashlinkStore();
            const cashlinkAddress = isIncoming.value ? transaction.value.sender : transaction.value.recipient;
            const cashlink = cashlinks$.hubCashlinks[cashlinkAddress];

            if (cashlink) return cashlink;

            /**
             * In all browsers in iOS and also in Safari for Mac, we are unable to access
             * stored cashlinks from the Hub, because those browsers deny access to
             * IndexedDB in iframes (and we can't store the cashlinks in cookies like we
             * do for accounts & addresses, as that would occupy valuable cookie space,
             * which is limited to 4kb).
             * What we do instead in those browsers is to always show the "Show Link" button
             * as long as we are uncertain if the Hub has this cashlink or not. Because
             * when the user clicks the button and opens the Hub, we get one of three results:
             * 1. The Hub errors, and we know that the Hub DOES NOT have the cashlink.
             *    This is handled in the hub interface (/hub.ts) in the manageCashlink() method,
             *    by storing a dummy cashlink object with a value of 0 (explained below).
             * 2. The Hub returns a cashlink object, which we can store and now know that the
             *    Hub DOES have the cashlink data.
             * 3. The user closes the popup with the window controls instead of with the "Done"
             *    button in the Hub, which gives us no info and does not change anything.
             *
             * # Why set the value to 0?
             * To identify which cashlinks are stored in the Hub and which aren't, we are
             * using the cashlink value, since for real cashlinks this cannot be 0. So when
             * the cashlink's value is 0, we know this is a not-stored cashlink.
             */
            if (BrowserDetection.isIOS() || BrowserDetection.isSafari()) {
                return {
                    address: cashlinkAddress,
                    message: '',
                    value: 1,
                };
            }

            return null;
        });
        const data = computed(() => {
            if (isCashlink.value) return hubCashlink.value ? hubCashlink.value.message : '';
            return parseData(transaction.value.data.raw);
        });

        // Related Transaction
        const { state: transactions$ } = useTransactionsStore();
        const relatedTx = computed(() => {
            if (!transaction.value.relatedTransactionHash) return null;
            return transactions$.transactions[transaction.value.relatedTransactionHash] || null;
        });

        // Peer
        const peerAddress = computed(() => isCashlink.value
            ? relatedTx.value
                ? isIncoming.value
                    ? relatedTx.value.sender // This is a claiming tx, so the related tx is the funding one
                    : relatedTx.value.recipient // This is a funding tx, so the related tx is the claiming one
                : constants.CASHLINK_ADDRESS // No related tx yet, show placeholder
            : isIncoming.value
                ? transaction.value.sender
                : transaction.value.recipient);
        const peerLabel = computed(() => {
            // Label cashlinks
            if (peerAddress.value === constants.CASHLINK_ADDRESS) {
                return isIncoming.value
                    ? context.root.$t('Cashlink')
                    : context.root.$t('Unclaimed Cashlink');
            }

            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[peerAddress.value];
            if (ownedAddressInfo) return ownedAddressInfo.label;

            // Search contacts
            if (getLabel.value(peerAddress.value)) return getLabel.value(peerAddress.value);

            // Search global address book
            const globalLabel = AddressBook.getLabel(peerAddress.value);
            if (globalLabel) return globalLabel;

            return false;
        });
        const peerIsContact = computed(() => !!getLabel.value(peerAddress.value));

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

        const { state: network$ } = useNetworkStore();
        const confirmations = computed(() =>
            transaction.value.blockHeight && (network$.height - transaction.value.blockHeight + 1));

        const { language } = useSettingsStore();

        return {
            transaction,
            constants,
            state,
            TransactionState,
            datum,
            time,
            data,
            fiatCurrency,
            fiatValue,
            isCashlink,
            isIncoming,
            language,
            peerAddress,
            peerLabel,
            activeAddressInfo,
            confirmations,
            peerIsContact,
            setContact,
            hubCashlink,
            manageCashlink,
        };
    },
    components: {
        Amount,
        FiatConvertedAmount,
        ArrowRightIcon,
        Identicon,
        PageBody,
        PageHeader,
        Modal,
        Copyable,
        AddressDisplay,
        FiatAmount,
        Tooltip,
        InfoCircleSmallIcon,
        CircleSpinner,
        CrossIcon,
        LabelInput,
        CashlinkSmallIcon,
        UnclaimedCashlinkIcon,
    } as any,
});
</script>

<style lang="scss" scoped>
.page-header {
    /deep/ .nq-h1 {
        margin-left: 2rem;
        margin-right: 2rem;
        white-space: nowrap;
        overflow: hidden;
        margin-bottom: 1rem;
        mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
    }

    span {
        display: block;
        font-size: 2rem;
        font-weight: 600;
        align-items: center;
        justify-content: center;

        /deep/ .circle-spinner,
        &.failed svg {
            margin-right: 0.5rem;
        }

        /deep/ .circle-spinner {
            margin-bottom: -0.375rem;
        }

        &.failed svg { // The cross icon for expired or invalidated transactions
            margin-bottom: -0.25rem;
        }
    }

    &.inline-header {
        display: flex;
        flex-direction: column;

        /deep/ .nq-h1 {
            align-self: center;
        }
    }
}

.page-body {
    justify-content: space-between;
    align-items: center;
    padding-bottom: 3rem;

    &.expired,
    &.invalidated {
        .identicon {
            filter: saturate(0);
            opacity: 0.5;
        }

        .label {
            opacity: 0.5;
        }

        .address-display {
            opacity: 0.3;
        }

        .amount-and-message {
            opacity: 0.4;
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
}

.identicon {
    position: relative;
    width: 9rem;
    height: 9rem;
    margin: -0.5rem 0; // Identicon should be 72x63

    > .identicon {
        margin: 0;
    }

    img {
        display: block;
        height: 100%
    }

    svg {
        width: 100%;
        height: 100%;
    }

    .cashlink {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        bottom: -0.675rem;
        right: -0.25rem;
        color: white;
        background: var(--nimiq-blue-bg);
        border: 0.375rem solid white;
        border-radius: 3rem;
        height: 3.75rem;
        width: 3.75rem;
        font-size: 3rem;
    }
}

.label {
    font-size: 2rem;
    font-weight: 600;
    margin: 2rem 0 1rem;
    white-space: nowrap;
    overflow: hidden;
    width: 100%;
    text-align: center;
    mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
}

.nq-input-s {
    font-size: 2rem;
    font-weight: 600;
    margin: 1.25rem 0 0.375rem;
    max-width: 100%;
    text-align: center;
}

.nq-input-s:not(:focus):not(:hover) {
    mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0) calc(100% - 1rem));
}

.copyable {
    padding: 0rem;
    margin-bottom: 3.5rem;

    &::before,
    &::after {
        padding-top: 1.5rem;
        padding-bottom: 0;
    }
}

.address-display {
    font-size: 2rem;
}

.address-display /deep/ .chunk {
    margin: 0.5rem 0;
}

.manage-cashlink {
    margin-top: 3rem;
}

.amount-and-message {
    align-items: center;

    .amount {
        font-size: 5rem;
        line-height: 1;
        margin-bottom: 0.25rem;

        /deep/ .currency {
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
    }
}

.fiat-amount {
    font-size: 1.75rem;
    font-weight: 600;
    color: rgba(31, 35, 72, 0.5);
}

.message {
    margin: 1rem 0;
    text-align: center;
    font-size: 2rem;
    line-height: 1.375;
    word-break: break-word;
}

.tooltip {
    position: absolute;
    left: 2rem;
    top: 2rem;

    /deep/ a {
        color: rgba(31, 35, 72, 0.25);

        &:hover,
        &:focus {
            color: rgba(31, 35, 72, 0.6);
        }
    }

    /deep/ .tooltip-box {
        font-size: 1.75rem;
        white-space: nowrap;
        line-height: 1.3;
        font-weight: 600;
    }

    .confirmations {
        display: block;
        font-size: 1.5rem;
        opacity: 0.6;
    }

    .fee {
        display: inline-block;
        margin-top: 1.25rem;
    }
}

@media (max-width: 500px) { // Full mobile breakpoint
    .page-header {
        /deep/ .nq-h1 {
            font-size: 2.75rem;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }

        &.inline-header /deep/ .nq-h1 {
            align-self: unset;
        }

        &:not(.inline-header) {
            /deep/ .nq-h1 {
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
