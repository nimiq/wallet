<template>
    <div class="account-overview">
        <div
            v-if="activeAccountInfo && activeAccountInfo.type === AccountType.BIP39 && !activeAccountInfo.fileExported"
            class="backup-warning file nq-orange-bg flex-row"
        >
            <AlertTriangleIcon class="alert-icon"/>
            <span class="alert-text">{{ $t('Your account is not safe yet!') }}</span>
            <div class="flex-grow"></div>
            <button class="nq-button-s inverse" @click="backup(activeAccountInfo.id)" @mousedown.prevent>
                {{ $t('Save now') }}<ArrowRightSmallIcon/>
            </button>
        </div>
        <div
            v-else-if="activeAccountInfo && !activeAccountInfo.wordsExported"
            class="backup-warning words nq-orange flex-row"
        >
            <AlertTriangleIcon class="alert-icon"/>
            <span class="alert-text">{{ $t('There is no ‘forgot password’') }}</span>
            <div class="flex-grow"></div>
            <button
                class="nq-button-pill orange"
                @click="backup(activeAccountInfo.id, { wordsOnly: true })" @mousedown.prevent
            >
                {{ $t('Backup') }}<ArrowRightSmallIcon/>
            </button>
        </div>

        <div class="mobile-menu-bar flex-row">
            <button class="reset menu-button" @click="$router.push({name: 'root', query: {sidebar: true}})">
                <MenuIcon/>
                <AttentionDot v-if="updateAvailable"/>
            </button>
            <button class="reset consensus" @click="$router.push('/network').catch(() => {})">
                <ConsensusIcon/>
            </button>
        </div>

        <template v-if="showFullLegacyAccountNotice">
            <LegacyAccountNotice/>
        </template>

        <template v-else>
            <AccountBalance />

            <AddressList
                :showAddAddressButton="canHaveMultipleAddresses"
                @address-selected="onAddressSelected"
                @add-address="addAddress(activeAccountId)"
            />

            <div v-if="canHaveMultipleAddresses" class="bitcoin-account flex-column">
                <button
                    class="bitcoin-account-item reset flex-row"
                    :class="{
                        'active': activeCurrency === CryptoCurrency.BTC,
                        'requires-activation': !hasBitcoinAddresses,
                    }"
                    @click="selectBitcoin"
                >
                    <BitcoinIcon/>
                    {{ $t('Bitcoin') }}
                    <div class="flex-grow"></div>
                    <div class="balances" v-if="hasBitcoinAddresses">
                        <div class="flex-row">
                            <AlertTriangleIcon v-if="btcConsensus === 'connecting'" />
                            <Amount
                                :amount="btcAccountBalance"
                                :currency="CryptoCurrency.BTC"
                                value-mask
                            />
                        </div>
                        <FiatConvertedAmount class="fiat-balance"
                            :amount="btcAccountBalance"
                            :currency="CryptoCurrency.BTC"
                            value-mask
                        />
                    </div>
                    <button v-else
                        class="nq-button-pill light-blue"
                        @click.stop="$router.push('/btc-activation')" @mousedown.prevent
                    >{{ $t('Activate') }}</button>
                    <div v-if="hasBitcoinAddresses" class="mobile-arrow"></div>
                </button>
            </div>
            <div v-else>
                <LegacyAccountUpgradeButton/>
                <p class="future-notice">
                    {{ $t('All new features are exclusive to new accounts. Upgrade now, it only takes seconds.') }}
                </p>
            </div>

            <MobileActionBar/>
        </template>

        <Portal>
            <transition name="modal">
                <LegacyAccountNoticeModal
                    v-if="showModalLegacyAccountNotice"
                    emitClose @close="showModalLegacyAccountNotice = false"/>
            </transition>
        </Portal>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from '@vue/composition-api';
import { ArrowRightSmallIcon, AlertTriangleIcon } from '@nimiq/vue-components';
// @ts-expect-error missing types for this package
import { Portal } from '@linusborg/vue-simple-portal';
import AccountBalance from '../AccountBalance.vue';
import AddressList from '../AddressList.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import MenuIcon from '../icons/MenuIcon.vue';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import ConsensusIcon from '../ConsensusIcon.vue';
import MobileActionBar from '../MobileActionBar.vue';
import LegacyAccountNotice from '../LegacyAccountNotice.vue';
import LegacyAccountUpgradeButton from '../LegacyAccountUpgradeButton.vue';
import LegacyAccountNoticeModal from '../modals/LegacyAccountNoticeModal.vue';
import AttentionDot from '../AttentionDot.vue';
import { backup, addAddress } from '../../hub';
import { useAccountStore, AccountType } from '../../stores/Account';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useWindowSize } from '../../composables/useWindowSize';
import { CryptoCurrency } from '../../lib/Constants';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { useSettingsStore } from '../../stores/Settings';

const BTC_ACTIVATION_SHOWN_STORAGE_KEY = 'btc-activation-modal-shown';

export default defineComponent({
    name: 'account-overview',
    setup(props, context) {
        const { activeAccountInfo, activeAccountId, setActiveCurrency, activeCurrency } = useAccountStore();
        const { accountBalance: btcAccountBalance } = useBtcAddressStore();

        const isLegacyAccount = computed(() => (activeAccountInfo.value || false)
            && activeAccountInfo.value.type === AccountType.LEGACY);

        const canHaveMultipleAddresses = computed(() => (activeAccountInfo.value || false)
            && activeAccountInfo.value.type !== AccountType.LEGACY);

        const hasBitcoinAddresses = computed(() => (activeAccountInfo.value || false)
            && (activeAccountInfo.value.btcAddresses || false)
            && activeAccountInfo.value.btcAddresses.external.length > 0);

        const { width } = useWindowSize();

        function onAddressSelected() {
            setActiveCurrency(CryptoCurrency.NIM);

            if (width.value <= 700) { // Full mobile breakpoint
                context.root.$router.push('/transactions');
            }
        }

        function selectBitcoin() {
            setActiveCurrency(CryptoCurrency.BTC);

            if (width.value <= 700) { // Full mobile breakpoint
                context.root.$router.push('/transactions');
            }
        }

        const showFullLegacyAccountNotice = computed(() =>
            isLegacyAccount.value
            && activeAccountInfo.value!.addresses.length === 1
            && width.value > 960); // Tablet breakpoint

        const showModalLegacyAccountNotice = ref(false);

        function determineIfShowModalLegacyAccountNotice() {
            showModalLegacyAccountNotice.value = isLegacyAccount.value && width.value <= 960; // Tablet breakpoint
        }

        function determineIfShowBtcActivationModal() {
            if (!activeAccountInfo.value) return;

            // Showing the modal after login is handled in hub.ts
            if (hasBitcoinAddresses.value) return;

            const isEligibleAccountType = activeAccountInfo.value.type === AccountType.BIP39;
            if (!isEligibleAccountType) return;

            const alreadyShown = localStorage.getItem(BTC_ACTIVATION_SHOWN_STORAGE_KEY) || '0';
            if (alreadyShown === '1') return;

            context.root.$router.push('/btc-activation');
            localStorage.setItem(BTC_ACTIVATION_SHOWN_STORAGE_KEY, '1');
        }

        function determineModalToShow() {
            determineIfShowModalLegacyAccountNotice();
            determineIfShowBtcActivationModal();
        }

        watch(activeAccountInfo, determineModalToShow);

        const { consensus: btcConsensus } = useBtcNetworkStore();

        const { updateAvailable } = useSettingsStore();

        return {
            activeAccountInfo,
            AccountType,
            backup,
            canHaveMultipleAddresses,
            addAddress,
            activeAccountId,
            onAddressSelected,
            btcAccountBalance,
            showFullLegacyAccountNotice,
            showModalLegacyAccountNotice,
            selectBitcoin,
            activeCurrency,
            CryptoCurrency,
            hasBitcoinAddresses,
            btcConsensus,
            updateAvailable,
        };
    },
    components: {
        ArrowRightSmallIcon,
        AlertTriangleIcon,
        AccountBalance,
        AddressList,
        BitcoinIcon,
        MenuIcon,
        ConsensusIcon,
        MobileActionBar,
        LegacyAccountNotice,
        LegacyAccountUpgradeButton,
        LegacyAccountNoticeModal,
        Portal,
        Amount,
        FiatConvertedAmount,
        AttentionDot,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
.account-overview {
    @include flex-full-height;
    max-height: 100%;
    flex-direction: column;
    position: relative;

    /* Default: 1440px */
    --padding-top: 6rem;
    --padding-sides: 6rem;
    --padding-bottom: 0;

    @media (max-width: 1319px) {
        --padding-top: 5rem;
        --padding-sides: 4rem;
        --padding-bottom: 0;
    }

    @media (max-width: 960px) { // Tablet breakpoint
        --padding-top: 3rem;
        --padding-sides: 3rem;
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        --padding-top: 1rem;
        --padding-sides: 1rem;
    }

    @media (min-width: 1800px) {
        --padding-top: 9rem;
        --padding-sides: 9rem;
        --padding-bottom: 2rem;
    }

    @media (min-width: 2000px) {
        --padding-top: 11rem;
        --padding-sides: 11rem;
        --padding-bottom: 4rem;
    }

    --item-margin: var(--padding-top);

    padding: var(--padding-top) var(--padding-sides) var(--padding-bottom);

    .backup-warning,
    .mobile-menu-bar {
        margin-bottom: var(--item-margin);
    }
}

.account-balance {
    padding: 0 2rem;
}

.backup-warning {
    align-items: center;
    flex-wrap: wrap;
    padding: 0.625rem 1rem;
    border-radius: 0.75rem;
    font-size: var(--body-size);

    .alert-icon {
        width: calc(1.0625 * var(--body-size)); // 1.0625 * 16px = 17px
        margin: 0 calc(1rem - 0.0625 * var(--body-size)) 0 1rem;
        flex-shrink: 0;
    }

    .alert-text {
        margin: 0.625rem 0;
        font-weight: bold;
        line-height: 3.375rem; // Same height as .nq-button-s
    }

    button {
        margin: 0.625rem 0.25rem 0.625rem 1rem;
    }

    button .nq-icon {
        display: inline-block;
        font-size: 1.25rem;
        vertical-align: middle;
        margin-bottom: 0.25rem;
        margin-left: 0.625rem;

        transition: transform 0.25s var(--nimiq-ease);
    }

    button:hover .nq-icon,
    button:focus .nq-icon {
        transform: translateX(0.25rem);
    }

    &.words {
        box-shadow: inset 0 0 0 1.5px var(--text-10);
    }
}

.mobile-menu-bar {
    display: none;
}

.address-list {
    margin-top: calc(var(--item-margin) - 2.5rem);
    flex-grow: 1;
    margin-bottom: 1rem;
}

.bitcoin-account {
    height: 15rem;
    padding: 3rem 2rem;
    margin: 0 -2rem;
    color: var(--text-70);
    font-size: var(--body-size);
    font-weight: 600;
    box-shadow: 0 -1.5px 0 var(--text-10);

    @media (max-width: 1319px) {
        padding: 3rem 1rem;
        margin: 0 -1rem;
    }

    .bitcoin-account-item {
        position: relative;
        width: 100%;
        padding: 0 2rem;
        flex-shrink: 0;
        flex-grow: 1;
        align-items: center;
        border-radius: 0.75rem;
        transition: {
            property: color, background;
            duration: 400ms;
            timing-function: var(--nimiq-ease);
        };

        &.active {
            color: var(--text-100);
        }

        &:not(.active):not(.requires-activation):hover {
            color: var(--text-100);
            background: var(--nimiq-highlight-bg);
        }

        &.requires-activation {
            pointer-events: none;

            button {
                pointer-events: all;
            }
        }

        &::before {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: -1;
            background: var(--bg-card);
            border-radius: 0.75rem;
            box-shadow: none;
            opacity: 0;

            transition: {
                property: opacity, box-shadow;
                duration: 350ms;
                timing-function: cubic-bezier(0.4, 0, 0, 1);
            };
        }

        &.active::before {
            opacity: 1;
            box-shadow:
                0px 0.337011px 2px rgba(0, 0, 0, 0.0254662),
                0px 1.5px 3px rgba(0, 0, 0, 0.05),
                0px 4px 16px rgba(0, 0, 0, 0.07);
        }

        &.disabled {
            color: var(--text-40);

            svg.bitcoin {
                color: var(--text-20);
            }

            label {
                text-transform: uppercase;
                font-size: var(--small-label-size);
                font-weight: bold;
                letter-spacing: 0.06em;
                padding: 0.75rem 1.75rem;
                box-shadow: 0 0 0 1.5px var(--text-10);
                border-radius: 500px;
            }
        }
    }

    svg.bitcoin {
        color: var(--bitcoin-orange);
        margin-right: 2rem;
    }

    .balances {
        text-align: right;
        flex-shrink: 0;

        .nq-icon {
            opacity: 0.3;
            margin-right: 1rem;
        }
    }

    .amount {
        --size: var(--body-size);
        display: block;
        line-height: 1.2;
        font-weight: bold;
    }

    .fiat-balance {
        --size: var(--small-size);
        font-size: var(--size);
        font-weight: 600;
        opacity: 0.5;
    }

    .mobile-arrow {
        display: none;
    }
}

.future-notice {
    font-size: var(--small-size);
    font-weight: 600;
    color: var(--text-40);
    margin: 2rem 0;
    text-align: center;
}

@media (max-width: 1160px) { // Half mobile breakpoint
    .mobile-menu-bar {
        display: flex;
        flex-shrink: 0;
        justify-content: space-between;
        padding: 1rem;
        margin: calc(-1 * var(--padding-top) + 1rem) calc(-1 * var(--padding-sides) + 1rem);
        z-index: 1; // To be above .total-balance
        pointer-events: none;

        button {
            padding: 1rem;
            pointer-events: all;
        }

        .menu-button {
            width: 3.5rem;
            height: 2.75rem;
            box-sizing: content-box;
            position: relative;

            svg {
                opacity: 0.3;
            }

            .attention-dot {
                position: absolute;
                top: 0;
                right: 0;
                border: 0.375rem solid var(--bg-base);
            }
        }

        .consensus-icon {
            width: 3rem;
            height: 3rem;

            &.syncing, &.established {
                // Generated with https://codepen.io/sosuke/full/Pjoqqp to make white into ~nimiq-blue
                filter: brightness(0.1) sepia(27%) saturate(3808%) hue-rotate(216deg) brightness(91%) contrast(89%);
                opacity: 0.3;
            }

            /deep/ svg {
                width: 3.25rem;
                height: 3rem;
            }
        }

        button.consensus {
            &:hover,
            &:focus {
                .consensus-icon.established {
                    filter: none;
                    opacity: 1;
                }
            }
        }
    }

    .account-balance {
        margin-top: -4rem;
    }
}

@media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    .account-balance {
        margin-top: -2rem;
    }

    .bitcoin-account .balances {
        display: none;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .address-list {
        margin-top: 0;
    }

    .bitcoin-account {
        height: 11rem;
        padding: 0;
        margin: 0;

        .bitcoin-account-item::before {
            display: none;
        }

        .mobile-arrow {
            display: block;
            border: 1rem solid transparent;
            border-width: 0.5rem 0.75rem;
            border-left-color: inherit;
            margin-left: 1.5rem;
            margin-right: -0.75rem;
            opacity: 0.3;
        }
    }

    .mobile-action-bar {
        margin: 0 calc(-1 * var(--padding-sides));
        box-shadow: 0px 0px 60px rgba(31, 35, 72, 0.07);
    }
}
</style>
