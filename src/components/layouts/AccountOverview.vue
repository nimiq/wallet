<template>
    <div class="account-overview" ref="root$">
        <div
            v-if="activeAccountInfo && activeAccountInfo.type === AccountType.BIP39 && !activeAccountInfo.fileExported"
            class="backup-warning file nq-orange-bg flex-row"
        >
            <span class="alert-text">
                <AlertTriangleIcon class="alert-icon"/>
                {{ $t('Your account is not safe yet!') }}
            </span>
            <button class="nq-button-s inverse" @click="backup(activeAccountInfo.id)" @mousedown.prevent>
                {{ $t('Login File') }}<ArrowRightSmallIcon/>
            </button>
        </div>
        <div
            v-else-if="activeAccountInfo && !activeAccountInfo.wordsExported"
            class="backup-warning words nq-orange flex-row"
        >
            <span class="alert-text">
                <AlertTriangleIcon class="alert-icon"/>
                {{ $t('There is no ‘forgot password’') }}
            </span>
            <button
                class="nq-button-pill orange"
                @click="backup(activeAccountInfo.id, { wordsOnly: true })" @mousedown.prevent
            >
                {{ $t('Recovery Words') }}<ArrowRightSmallIcon/>
            </button>
        </div>

        <div class="mobile-menu-bar flex-row">
            <button class="reset menu-button" @click="$router.push({name: 'root', query: {sidebar: 'true'}})">
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

            <div class=account-grid>
                <div class="nimiq-account" ref="nimiqAccount$">
                    <header class="flex-row">
                        <span class="nq-icon nimiq-logo"></span>
                        <span>NIM</span>
                        <button class="add-address reset" @click="activeAccountId && addAddress(activeAccountId)">
                            <MiniAddIcon/>
                        </button>
                    </header>
                    <AddressList @address-selected="onAddressSelected"/>
                </div>

                <Tooltip class="nim-btc-swap-button" :container="root$ && { $el: root$ }"
                    v-if="hasBitcoinAddresses && $config.enableBitcoin">
                    <button class="reset" slot="trigger" @click="$router.push('/swap/NIM-BTC')">
                        <div class="inner-circle"><DoubleArrowIcon /></div>
                    </button>
                    <i18n path="Swap NIM {arrowIcon} BTC">
                        <LinkedDoubleArrowIcon slot="arrowIcon" />
                    </i18n>
                </Tooltip>

                <Tooltip class="nim-usdc-swap-button" :container="root$ && { $el: root$ }"
                    v-if="activeAccountInfo.type !== AccountType.LEDGER && hasUsdcAddresses && $config.usdc.enabled">
                    <button class="reset" slot="trigger" @click="$router.push('/swap/NIM-USDC')">
                        <div class="inner-circle"><DoubleArrowIcon /></div>
                    </button>
                    <i18n path="Swap NIM {arrowIcon} USDC">
                        <LinkedDoubleArrowIcon slot="arrowIcon" />
                    </i18n>
                </Tooltip>

                <button v-if="canHaveMultipleAddresses && $config.enableBitcoin" ref="bitcoinAccount$"
                    class="reset bitcoin-account flex-column"
                    :class="{
                            'active': activeCurrency === CryptoCurrency.BTC,
                            'requires-activation': !hasBitcoinAddresses,
                        }"
                    >
                    <div class="bitcoin-account-item reset flex-column" @click="selectBitcoin">
                        <div class="bitcoin-account-item-name flex-row"><BitcoinIcon/>{{ $t('Bitcoin') }}</div>
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
                    </div>
                </button>

                <Tooltip class="btc-usdc-swap-button" :container="root$ && { $el: root$ }"
                    v-if="activeAccountInfo.type !== AccountType.LEDGER
                        && hasBitcoinAddresses && hasUsdcAddresses
                        && $config.enableBitcoin && $config.usdc.enabled">
                    <button class="reset" slot="trigger" @click="$router.push('/swap/BTC-USDC')">
                        <div class="inner-circle"><DoubleArrowIcon /></div>
                    </button>
                    <i18n path="Swap BTC {arrowIcon} USDC">
                        <LinkedDoubleArrowIcon slot="arrowIcon" />
                    </i18n>
                </Tooltip>

                <button v-if="activeAccountInfo.type !== AccountType.LEDGER
                        && canHaveMultipleAddresses
                        && $config.usdc.enabled" ref="usdcAccount$"
                    class="reset usdc-account flex-column"
                    :class="{
                            'active': activeCurrency === CryptoCurrency.USDC,
                            'requires-activation': !hasUsdcAddresses,
                        }"
                    >
                    <div class="usdc-account-item reset flex-column" @click="selectUsdc">
                        <div class="usdc-account-item-name flex-row"><UsdcIcon/>{{ $t('USD Coin') }}</div>
                        <div class="balances" v-if="hasUsdcAddresses">
                            <template v-if="usdcAccountBalance !== null">
                                <div class="flex-row">
                                    <AlertTriangleIcon v-if="usdcConsensus === 'connecting'" />
                                    <Amount
                                        :amount="usdcAccountBalance"
                                        :currency="CryptoCurrency.USDC"
                                        value-mask
                                    />
                                </div>
                                <FiatConvertedAmount class="fiat-balance"
                                    :amount="usdcAccountBalance"
                                    :currency="CryptoCurrency.USDC"
                                    value-mask
                                />
                            </template>
                            <template v-else>
                                <CircleSpinner />
                            </template>
                        </div>
                        <button v-else
                            class="nq-button-pill light-blue"
                            @click.stop="$router.push('/usdc-activation')" @mousedown.prevent
                        >{{ $t('Activate') }}</button>
                    </div>
                </button>

                <div class="account-backgrounds">
                    <div class="nimiq-account-background" :style="getAccountBackgroundPosition('nimiq')"></div>
                    <div class="bitcoin-account-background" :style="getAccountBackgroundPosition('bitcoin')"></div>
                    <div class="usdc-account-background" :style="getAccountBackgroundPosition('usdc')"></div>
                </div>
            </div>

            <div v-if="!canHaveMultipleAddresses">
                <LegacyAccountUpgradeButton/>
                <p class="future-notice">
                    {{ $t('All new features are exclusive to new accounts. Upgrade now, it only takes seconds.') }}
                </p>
            </div>

            <div class="bottom-spacer"></div>

            <MobileActionBar/>
        </template>

        <Portal>
            <transition name="modal">
                <LegacyAccountNoticeModal
                    v-if="showModalLegacyAccountNotice"
                    emitClose @close="showModalLegacyAccountNotice = false"/>
            </transition>
        </Portal>

        <!-- <Portal>
            <transition name="modal">
                <OasisLaunchModal/>
            </transition>
        </Portal> -->
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onMounted, onUnmounted, onActivated } from '@vue/composition-api';
import { ArrowRightSmallIcon, AlertTriangleIcon, CircleSpinner, Tooltip } from '@nimiq/vue-components';
// @ts-expect-error missing types for this package
import { Portal } from '@linusborg/vue-simple-portal';
import AccountBalance from '../AccountBalance.vue';
import AddressList from '../AddressList.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import UsdcIcon from '../icons/UsdcIcon.vue';
import MenuIcon from '../icons/MenuIcon.vue';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import ConsensusIcon from '../ConsensusIcon.vue';
import MobileActionBar from '../MobileActionBar.vue';
import LegacyAccountNotice from '../LegacyAccountNotice.vue';
import LegacyAccountUpgradeButton from '../LegacyAccountUpgradeButton.vue';
import LegacyAccountNoticeModal from '../modals/LegacyAccountNoticeModal.vue';
// import OasisLaunchModal from '../swap/OasisLaunchModal.vue';
import AttentionDot from '../AttentionDot.vue';
import { backup, addAddress } from '../../hub';
import { useAccountStore, AccountType } from '../../stores/Account';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useUsdcAddressStore } from '../../stores/UsdcAddress';
import { useWindowSize } from '../../composables/useWindowSize';
import { CryptoCurrency } from '../../lib/Constants';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { useSettingsStore } from '../../stores/Settings';
import { useUsdcNetworkStore } from '../../stores/UsdcNetwork';
import MiniAddIcon from '../icons/MiniAddIcon.vue';
import DoubleArrowIcon from '../icons/DoubleArrowIcon.vue';
import LinkedDoubleArrowIcon from '../icons/LinkedDoubleArrowIcon.vue';

export default defineComponent({
    name: 'account-overview',
    setup(props, context) {
        const {
            activeAccountInfo,
            activeAccountId,
            setActiveCurrency,
            activeCurrency,
            hasBitcoinAddresses,
            hasUsdcAddresses,
        } = useAccountStore();
        const { accountBalance: btcAccountBalance } = useBtcAddressStore();
        const { accountBalance: usdcAccountBalance } = useUsdcAddressStore();

        const isLegacyAccount = computed(() => (activeAccountInfo.value || false)
            && activeAccountInfo.value.type === AccountType.LEGACY);

        const canHaveMultipleAddresses = computed(() => (activeAccountInfo.value || false)
            && activeAccountInfo.value.type !== AccountType.LEGACY);

        const { isMobile, isTablet } = useWindowSize();

        function onAddressSelected() {
            setActiveCurrency(CryptoCurrency.NIM);

            if (isMobile.value) {
                context.root.$router.push('/transactions');
            }
        }

        function selectBitcoin() {
            if (!hasBitcoinAddresses.value) return;

            setActiveCurrency(CryptoCurrency.BTC);

            if (isMobile.value) {
                context.root.$router.push('/transactions');
            }
        }

        function selectUsdc() {
            if (!hasUsdcAddresses.value) return;

            setActiveCurrency(CryptoCurrency.USDC);

            if (isMobile.value) {
                context.root.$router.push('/transactions');
            }
        }

        const showFullLegacyAccountNotice = computed(() =>
            isLegacyAccount.value
            && activeAccountInfo.value!.addresses.length === 1
            && !isTablet.value);

        const showModalLegacyAccountNotice = ref(false);

        function determineIfShowModalLegacyAccountNotice() {
            showModalLegacyAccountNotice.value = isLegacyAccount.value && isTablet.value;
        }

        function determineModalToShow() {
            determineIfShowModalLegacyAccountNotice();
        }

        watch(activeAccountInfo, determineModalToShow);

        const { consensus: btcConsensus } = useBtcNetworkStore();
        const { consensus: usdcConsensus } = useUsdcNetworkStore();

        const { updateAvailable } = useSettingsStore();

        // Html refs for backgrounds and swap buttons' positions
        const root$ = ref<HTMLElement | null>(null);
        const usdcAccount$ = ref<HTMLElement | null>(null);
        const nimiqAccount$ = ref<HTMLElement | null>(null);
        const bitcoinAccount$ = ref<HTMLElement | null>(null);

        const forceUpdateRef = ref(false);
        const resizeObserver = new ResizeObserver(forceUpdate);
        const mutationObserver = new MutationObserver(() => forceUpdate());

        // start observing on mount / listen to window resize
        onMounted(async () => {
            resizeObserver.observe(context.root.$el);
            mutationObserver.observe(context.root.$el, { // for account switch & add address
                attributes: false,
                childList: true,
                subtree: true,
            });
        });
        // disconnect observers on unmount / remove window resize listener
        onUnmounted(() => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        });
        onActivated(forceUpdate);

        async function forceUpdate() {
            await context.root.$nextTick();
            // trick to force vue to update the position on component resize
            forceUpdateRef.value = !forceUpdateRef.value;
        }

        function getAccountBackgroundPosition(currency: 'usdc' | 'nimiq' | 'bitcoin') {
            // trick to force vue to update the position on component resize
            forceUpdateRef.value = !!forceUpdateRef.value;

            const el$ = {
                usdc: usdcAccount$.value,
                nimiq: nimiqAccount$.value,
                bitcoin: bitcoinAccount$.value,
            }[currency];

            if (el$ && root$.value) {
                const accountPosition = el$.getBoundingClientRect();
                const accountOverviewPosition: DOMRect = root$.value.getBoundingClientRect();

                return {
                    height: `${accountPosition.height}px`,
                    width: `${accountPosition.width}px`,
                    top: `${accountPosition.top - accountOverviewPosition.top}px`,
                    left: `${accountPosition.left - accountOverviewPosition.left}px`,
                };
            }
            return null;
        }

        return {
            activeAccountInfo,
            AccountType,
            backup,
            canHaveMultipleAddresses,
            addAddress,
            activeAccountId,
            onAddressSelected,
            btcAccountBalance,
            usdcAccountBalance,
            showFullLegacyAccountNotice,
            showModalLegacyAccountNotice,
            selectBitcoin,
            selectUsdc,
            activeCurrency,
            CryptoCurrency,
            hasBitcoinAddresses,
            hasUsdcAddresses,
            btcConsensus,
            usdcConsensus,
            updateAvailable,
            root$,
            usdcAccount$,
            nimiqAccount$,
            bitcoinAccount$,
            getAccountBackgroundPosition,
        };
    },
    components: {
        ArrowRightSmallIcon,
        AlertTriangleIcon,
        AccountBalance,
        AddressList,
        BitcoinIcon,
        UsdcIcon,
        MenuIcon,
        ConsensusIcon,
        MobileActionBar,
        LegacyAccountNotice,
        LegacyAccountUpgradeButton,
        LegacyAccountNoticeModal,
        // OasisLaunchModal,
        Portal,
        Amount,
        FiatConvertedAmount,
        AttentionDot,
        CircleSpinner,
        MiniAddIcon,
        DoubleArrowIcon,
        Tooltip,
        LinkedDoubleArrowIcon,
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
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    flex-shrink: 0;
    padding: 0.625rem 1rem;
    border-radius: 0.75rem;
    font-size: var(--body-size);

    .alert-text {
        margin: 0.625rem 0 0.625rem 1rem;
        font-weight: bold;
        line-height: 3.375rem; // Same height as .nq-button-s

        .alert-icon {
            width: calc(1.0625 * var(--body-size)); // 1.0625 * 16px = 17px
            margin-bottom: -0.125em;
            flex-shrink: 0;
            display: inline;
        }
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
    height: auto;
    padding-bottom: .5rem;
    z-index: 2;
}

.nimiq-account,
.bitcoin-account,
.usdc-account {
    z-index: 3;
    border-radius: 1.25rem;

    header {
        font-size: 2rem;
        font-weight: 600;
        align-items: center;
        padding: 3rem;

        .nq-icon {
            margin-right: 1rem;
            font-size: 2.75rem;
        }

        .nq-icon + span {
            opacity: .7;
        }
    }
}

// grid setup
.account-grid {
    --grid-gap: 2rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: minmax(0px, 1fr) auto auto;
    gap: var(--grid-gap);
    align-items: center;
    min-height: 0;

    margin-top: 7rem;

    .nimiq-account {
        grid-row: 1;
        grid-column: 1 / 3;
        margin-bottom: calc(-1 * var(--grid-gap) / 2);

        min-height: 0;
        height: calc(100% + (var(--grid-gap) / 2));
    }
    .nim-btc-swap-button {
        grid-row: 2;
        grid-column: 1 / 2;
    }
    .nim-usdc-swap-button {
        grid-row: 2;
        grid-column: 2 / 3;
    }
    .nimiq-account ~ button:first-of-type {
        grid-column-start: 1;
    }
    .nimiq-account ~ button:last-of-type {
        grid-column-end: 3;
    }
    .tooltip:last-of-type {
        grid-column: 1 / 3;
    }
    .bitcoin-account {
        grid-row: 3;
        grid-column: 1 / 2;

        margin-top: calc(-1 * var(--grid-gap) / 2);
    }
    .btc-usdc-swap-button {
        grid-row: 3;
        grid-column: 1 / 3;
        margin-top: calc(-1 * var(--grid-gap) / 2);
    }
    .usdc-account {
        grid-row: 3;
        grid-column: 2 / 3;

        margin-top: calc(-1 * var(--grid-gap) / 2);
    }
    & > .tooltip {
        display: flex;
        justify-content: center;
        height: 0;
        justify-self: center;
        white-space: nowrap;

        &::v-deep {
            .tooltip-box {
                transform: translateY(-3.75rem);
            }

            &.top .trigger::after {
                transform: scaleY(-1) translateY(1.85rem);
            }
        }
    }
}

.nimiq-account {
    padding: 0.5rem 1rem;
    padding-bottom: 0;
    overflow-y: auto;
    overflow-x: hidden;
    flex-shrink: 1;

    @extend %custom-scrollbar;

    .add-address {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-left: auto;
        height: 3rem;
        width: 3rem;
        border-radius: 2.5rem;
        background-color: var(--text-10);

        svg {
            width: 8px;
            height: auto;
            color: var(--nimiq-blue);
            opacity: .6;

            path {
                stroke-width: 2px;
                stroke-linejoin: round;
            }
        }
    }
}

.bitcoin-account,
.usdc-account {
    padding: 1rem;
    color: var(--text-70);
    font-size: var(--body-size);
    font-weight: 600;
    position: relative;
    transition: color 400ms var(--nimiq-ease);

    &.active {
        cursor: auto;
        color: var(--text-100);
    }

    &.requires-activation {
        pointer-events: none;

        button {
            pointer-events: all;
        }
    }

    &.disabled {
        color: var(--text-40);

        svg.bitcoin,
        svg.usdc {
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

    &:not(.active):not(.requires-activation):not(.disabled):hover,
    &:not(.active):not(.requires-activation):not(.disabled):focus,
    &:not(.active):not(.requires-activation):not(.disabled):focus-within {
        color: var(--text-100);

        &.bitcoin-account ~ .account-backgrounds .bitcoin-account-background,
        &.usdc-account ~ .account-backgrounds .usdc-account-background {
            background-color: var(--text-10);
        }
    }

    .bitcoin-account-item,
    .usdc-account-item {
        position: relative;
        width: 100%;
        padding: 2rem;
        flex-shrink: 0;
        align-items: flex-start;
        border-radius: 0.75rem;

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
    }

    &.active {
        .bitcoin-account-item,
        .usdc-account-item {
            &::before {
                opacity: 1;
                box-shadow:
                    0 0.337011px 2px rgba(0, 0, 0, 0.0254662),
                    0 1.5px 3px rgba(0, 0, 0, 0.05),
                    0 4px 16px rgba(0, 0, 0, 0.07);
            }
        }
    }

    .bitcoin-account-item-name,
    .usdc-account-item-name {
        align-items: center;
        margin-bottom: 2rem;

        svg {
            margin-right: 1rem;
            width: 2.75rem;
            height: auto;

            &.bitcoin {
                color: var(--bitcoin-orange);
            }

            &.usdc {
                color: var(--usdc-blue);
            }
        }
    }

    .balances {
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
}

.account-backgrounds {
    div {
        position: absolute;
        z-index: 1;
        border-radius: 1.25rem;
        background-color: var(--text-6);
        transition: background 400ms var(--nimiq-ease);
    }
}

.nim-usdc-swap-button,
.nim-btc-swap-button,
.btc-usdc-swap-button {
    button {
        --size: 3rem;
        --transition-duration: 200ms;

        cursor: pointer;
        height: var(--size);
        width: var(--size);
        background-color: var(--bg-base);
        border-radius: 50%;
        border: none;
        position: relative;
        z-index: 2;
        transform: translateY(-50%);
        display: flex;
        justify-content: center;
        align-items: center;

        transition: {
            property: height, width;
            duration: var(--transition-duration);
            timing-function: var(--nimiq-ease);
        };
    }

    .inner-circle {
        --size: 0.5rem;

        height: var(--size);
        width: var(--size);
        background-color: var(--text-20);
        border-radius: 50%;

        transition: {
            property: height, width, background-color;
            duration: var(--transition-duration);
            timing-function: var(--nimiq-ease);
        };

        svg {
            opacity: 0;
            height: 1.5rem;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);

            transition: opacity var(--transition-duration) var(--nimiq-ease);

            path {
                transition: d var(--transition-duration) var(--nimiq-ease);

                d: path("m4 7 0 0 0 0m0 0 0 0 0 0");
            }
        }
    }

    &.btc-usdc-swap-button .inner-circle svg {
        transform: translate(-50%, -50%) rotate(90deg);
    }

    & button:hover,
    & button:focus,
    &.tooltip.shown button {
        --size: 4.75rem;

        .inner-circle {
            --size: 4rem;

            background-color: var(--text-6);

            svg {
                opacity: 1;

                path { d: path("m1 4 3-3 3 3m0 6-3 3-3-3") }
            }
        }
    }

    span {
        display: flex;
        flex-direction: row;
        align-items: center;

        .linked-double-arrow-icon {
            display: inline;
            margin: 0 0.5rem;
        }
    }

}

.future-notice {
    font-size: var(--small-size);
    font-weight: 600;
    color: var(--text-40);
    margin: 2rem 0;
    text-align: center;
}

.bottom-spacer {
    min-height: 1rem;
    flex-grow: 1;
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

            &.syncing {
                // Generated with https://codepen.io/sosuke/full/Pjoqqp to make white into ~nimiq-blue
                filter: brightness(0.1) sepia(27%) saturate(3808%) hue-rotate(216deg) brightness(91%) contrast(89%);
                opacity: 0.3;
            }

            &.established {
                filter: none;
                color: var(--text-30);
            }

            ::v-deep svg {
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
}

@media (max-width: 700px) { // Full mobile breakpoint
    .address-list {
        margin-top: 0;
        padding-bottom: 0;
    }

    .account-grid {
        margin-top: 4rem;
    }

    .nimiq-account {
        padding: 1.5rem;
    }

    .bitcoin-account,
    .usdc-account {
        color: var(--text-100);

        .bitcoin-account-item::before,
        .usdc-account-item::before {
            display: none;
        }

        &.active {
            &.bitcoin-account ~ .account-backgrounds .bitcoin-account-background,
            &.usdc-account ~ .account-backgrounds .usdc-account-background {
                background-color: var(--text-10);
            }
        }
    }

    .nim-usdc-swap-button,
    .nim-btc-swap-button,
    .btc-usdc-swap-button {
        button { --size: 4rem }

        .inner-circle {
            background: none;

            svg {
                height: 1.75rem;
                opacity: .4;
                path { d: path("m1 4 3-3 3 3m0 6-3 3-3-3") }
            }
        }
    }

    .mobile-action-bar {
        margin: 0 calc(-1 * var(--padding-sides));
        box-shadow: 0 0 60px rgba(31, 35, 72, 0.07);
    }
}

@media (max-height: 520px) { // small mobile
    .mobile-menu-bar,
    .bitcoin-account,
    .usdc-account {
        padding: 0;
    }

    .account-grid {
        margin-top: 1rem;
    }
}

@media (max-height: 450px) { // tiny mobile
    .account-balance-container {
        margin-top: -3rem;
    }
}
</style>
