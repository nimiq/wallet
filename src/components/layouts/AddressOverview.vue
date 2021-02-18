<template>
    <div class="address-overview"
        :class="{ 'no-accounts flex-column': !activeAddressInfo && activeCurrency !== CryptoCurrency.BTC }">
        <template v-if="activeAddressInfo || activeCurrency === CryptoCurrency.BTC">
            <div class="actions-mobile flex-row">
                <button class="reset icon-button" @click="$router.back()"><ArrowLeftIcon/></button>
                <SearchBar v-model="searchString"/>
                <button
                    v-if="activeCurrency === 'nim' && unclaimedCashlinkCount"
                    class="nq-button-s orange unclaimed-cashlinks"
                    :class="{'active': showUnclaimedCashlinkList}"
                    @click="showUnclaimedCashlinkList = !showUnclaimedCashlinkList"
                    @mousedown.prevent
                >
                    {{ $tc(
                        '{count} pending Cashlink | {count} pending Cashlinks',
                        unclaimedCashlinkCount,
                    ) }}
                </button>
                <button
                    class="reset icon-button"
                    @click="$event.currentTarget.focus() /* Required for MacOS Safari & Firefox */"
                >
                    <MenuDotsIcon/>
                    <div class="popup-menu nq-blue-bg">
                        <button v-if="activeCurrency === 'nim'"
                            class="reset flex-row"
                            @mousedown="rename(activeAccountId, activeAddressInfo.address)"
                        >
                            <RenameIcon/>{{ $t('Rename') }}
                        </button>
                        <button v-if="activeCurrency === 'btc'"
                            class="reset flex-row"
                            @mousedown="rescan"
                        >
                            <RefreshIcon/>{{ $t('Rescan') }}
                        </button>
                    </div>
                </button>
            </div>
            <div class="active-address flex-row">
                <div class="identicon-wrapper">
                    <Identicon v-if="activeCurrency === 'nim'" :address="activeAddressInfo.address" />
                    <BitcoinIcon v-else/>
                    <button class="reset identicon-menu flex-row"
                        @click="$event.currentTarget.focus() /* Required for MacOS Safari & Firefox */"
                    >
                        <GearIcon/>
                        <div class="popup-menu nq-blue-bg">
                            <button v-if="activeCurrency === 'nim'"
                                class="reset flex-row"
                                @mousedown="rename(activeAccountId, activeAddressInfo.address)"
                            >
                                <RenameIcon/>{{ $t('Rename') }}
                            </button>
                            <button v-if="activeCurrency === 'btc'"
                                class="reset flex-row"
                                @mousedown="rescan"
                            >
                                <RefreshIcon/>{{ $t('Rescan') }}
                            </button>
                        </div>
                    </button>
                </div>
                <div class="meta">
                    <div class="flex-row">
                        <div v-if="activeCurrency === 'nim'" class="label">{{activeAddressInfo.label}}</div>
                        <div v-else class="label bitcoin">{{ $t('Bitcoin') }}</div>
                        <Amount v-if="activeCurrency === 'nim'" :amount="activeAddressInfo.balance" value-mask/>
                        <Amount v-else :amount="btcAccountBalance" currency="btc" value-mask/>
                    </div>
                    <div class="flex-row">
                        <!-- We need to key the Copyable component, so that the tooltip disappears when
                             switching addresses while the tooltip is showing -->
                        <Copyable v-if="activeCurrency === 'nim'"
                            :text="activeAddressInfo.address" :key="activeAddressInfo.address"
                        >
                            <div class="address" v-responsive="{'masked': el => el.width < addressMaskedWidth}">
                                {{activeAddressInfo.address}}
                            </div>
                        </Copyable>
                        <FiatConvertedAmount v-if="activeCurrency === 'nim' && activeAddressInfo.balance !== null"
                            :amount="activeAddressInfo.balance" value-mask/>
                        <span v-else-if="activeCurrency === 'nim'" class="fiat-amount"></span>
                        <FiatConvertedAmount v-else
                            :amount="btcAccountBalance" currency="btc" value-mask/>
                    </div>
                </div>
            </div>
            <div class="actions flex-row">
                <SearchBar v-model="searchString"/>

                <button
                    v-if="activeCurrency === 'nim' && unclaimedCashlinkCount"
                    class="nq-button-s orange unclaimed-cashlinks"
                    :class="{'active': showUnclaimedCashlinkList}"
                    @click="showUnclaimedCashlinkList = !showUnclaimedCashlinkList"
                    @mousedown.prevent
                >
                    {{ $tc(
                        '{count} pending Cashlink | {count} pending Cashlinks',
                        unclaimedCashlinkCount,
                    ) }}
                </button>

                <button class="send nq-button-pill light-blue flex-row"
                    @click="$router.push(activeCurrency === 'nim' ? '/send' : '/btc-send')" @mousedown.prevent
                    :disabled="(activeCurrency === 'nim' && (!activeAddressInfo || !activeAddressInfo.balance))
                        || (activeCurrency === 'btc' && !btcAccountBalance)"
                >
                    <ArrowRightSmallIcon />{{ $t('Send') }}
                </button>
                <button class="receive nq-button-s flex-row"
                    @click="$router.push(activeCurrency === 'nim' ? '/receive' : '/btc-receive')" @mousedown.prevent
                >
                    <ArrowRightSmallIcon />{{ $t('Receive') }}
                </button>
            </div>
            <div class="scroll-mask top"></div>
            <TransactionList
                v-if="activeCurrency === CryptoCurrency.NIM"
                :searchString="searchString"
                :showUnclaimedCashlinkList="showUnclaimedCashlinkList"
                @unclaimed-cashlink-count="setUnclaimedCashlinkCount"
                @close-unclaimed-cashlink-list="hideUnclaimedCashlinkList"
            />
            <BtcTransactionList
                v-else
                :searchString="searchString"
            />
        </template>
        <template v-else>
            <img :src="'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/'
                + 'illustrations/To_the_stars_qhyy.svg'"/>
            <span class="opacity-75">{{ $t('Let\'s get started! Create your Nimiq account:') }}</span>
            <button class="nq-button" @click="onboard" @mousedown.prevent>{{ $t('Signup') }}</button>
        </template>

        <transition name="fadeY">
            <div class="promo-box nq-light-blue-bg flex-column" v-if="promoBoxVisible">
                <div class="flex-row">
                    <EventIcon />
                    <h2 class="nq-h2">
                        {{ $t('You did it – time to spread the word. Promote Nimiq and get your fiat back! ') }}
                    </h2>
                </div>
                <ul>
                    <li>{{ $t('Tweet about your experience with a Twitter account that’s at least 1 month old.') }}</li>
                    <li>{{ $t('Include #NimiqOASIS') }}</li>
                    <li class="flex-row">
                        <ArrowRightSmallIcon />
                        {{ $t('Until end of March, 10 swaps will get their fiat back.') }}
                        <a class="nq-button-s inverse light-blue flex-row"
                            href="https://twitter.com/intent/tweet?hashtags=NimiqOasis"
                            target="_blank" rel="noopener">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 14">
                                <!-- eslint-disable-next-line max-len -->
                                <path fill="#fff" d="M15.8 3.15a.34.34 0 00-.15-.6l-.54-.13a.34.34 0 01-.23-.49l.3-.6a.34.34 0 00-.4-.49l-1.37.39a.34.34 0 01-.3-.06A3.44 3.44 0 007.6 3.92v.25a.17.17 0 01-.16.18c-1.93.22-3.78-.76-5.78-3.06a.35.35 0 00-.35-.1.34.34 0 00-.2.28 5.22 5.22 0 00.33 3.48.17.17 0 01-.2.16l-.76-.15a.34.34 0 00-.4.4 3.55 3.55 0 001.7 2.67.17.17 0 01-.07.25l-.36.14a.34.34 0 00-.18.48 3 3 0 002.2 1.7.17.17 0 01.09.27.17.17 0 01-.09.06c-.93.39-1.94.58-2.95.57a.35.35 0 10-.14.69c1.76.83 3.67 1.28 5.6 1.33 1.72.02 3.4-.45 4.83-1.38a8.6 8.6 0 003.83-7.18v-.6a.35.35 0 01.12-.26l1.13-.95z"/>
                            </svg>
                            {{ $t('Tweet') }}
                        </a>
                    </li>
                </ul>
                <CrossCloseButton @click="setPromoBoxVisible(false)"/>
            </div>
        </transition>

        <MobileActionBar/>

        <Portal>
            <transition name="modal">
                <router-view name="modal"/>
            </transition>
        </Portal>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed } from '@vue/composition-api';
import {
    Identicon,
    GearIcon,
    Copyable,
    ArrowRightSmallIcon,
    ArrowLeftIcon,
    MenuDotsIcon,
    CrossIcon,
} from '@nimiq/vue-components';
// @ts-expect-error missing types for this package
import { Portal } from '@linusborg/vue-simple-portal';
// @ts-expect-error missing types for this package
import { ResponsiveDirective } from 'vue-responsive-components';

import BitcoinIcon from '../icons/BitcoinIcon.vue';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SearchBar from '../SearchBar.vue';
import TransactionList from '../TransactionList.vue';
import BtcTransactionList from '../BtcTransactionList.vue';
import MobileActionBar from '../MobileActionBar.vue';
import RenameIcon from '../icons/AccountMenu/RenameIcon.vue';
import RefreshIcon from '../icons/RefreshIcon.vue';

import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { onboard, rename } from '../../hub';
import { useWindowSize } from '../../composables/useWindowSize';
import { BTC_ADDRESS_GAP, CryptoCurrency } from '../../lib/Constants';
import { checkHistory } from '../../electrum';
import EventIcon from '../icons/EventIcon.vue';
import { useSwapsStore } from '../../stores/Swaps';
import CrossCloseButton from '../CrossCloseButton.vue';

export default defineComponent({
    name: 'address-overview',
    setup() {
        const { activeAccountId, activeCurrency } = useAccountStore();
        const { activeAddressInfo, activeAddress } = useAddressStore();
        const { accountBalance: btcAccountBalance } = useBtcAddressStore();
        const { promoBoxVisible, setPromoBoxVisible } = useSwapsStore();

        const searchString = ref('');

        const unclaimedCashlinkCount = ref(0);
        const showUnclaimedCashlinkList = ref(false);

        function hideUnclaimedCashlinkList() {
            showUnclaimedCashlinkList.value = false;
        }

        function setUnclaimedCashlinkCount(count: number) {
            unclaimedCashlinkCount.value = count;
            if (!count) hideUnclaimedCashlinkList();
        }

        function clearSearchString() {
            searchString.value = '';
        }

        watch(activeAddress, () => {
            hideUnclaimedCashlinkList();
            clearSearchString();
        });

        const { width: windowWidth } = useWindowSize();

        const addressMaskedWidth = computed(() => windowWidth.value > 1160
            ? 396
            : windowWidth.value > 700
                ? 372
                : 322);

        function rescan() {
            const { addressSet } = useBtcAddressStore();
            checkHistory(
                addressSet.value.external,
                [],
                0,
                BTC_ADDRESS_GAP,
                console.error, // eslint-disable-line no-console
                true,
            );
        }

        return {
            activeCurrency,
            searchString,
            activeAccountId,
            activeAddressInfo,
            onboard,
            rename,
            rescan,
            unclaimedCashlinkCount,
            setUnclaimedCashlinkCount,
            showUnclaimedCashlinkList,
            hideUnclaimedCashlinkList,
            addressMaskedWidth,
            btcAccountBalance,
            CryptoCurrency,
            promoBoxVisible,
            setPromoBoxVisible,
        };
    },
    components: {
        ArrowRightSmallIcon,
        Identicon,
        BitcoinIcon,
        GearIcon,
        RenameIcon,
        RefreshIcon,
        Copyable,
        Amount,
        FiatConvertedAmount,
        SearchBar,
        TransactionList,
        BtcTransactionList,
        ArrowLeftIcon,
        MenuDotsIcon,
        MobileActionBar,
        Portal,
        EventIcon,
        CrossIcon,
        CrossCloseButton,
    },
    directives: {
        responsive: ResponsiveDirective,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

// TODO: Extract into SCSS mixin or global style
.scroll-mask {
    // position: sticky;
    height: 3rem;
    flex-shrink: 0;
    z-index: 2;
    pointer-events: none;
    margin-right: 2rem;

    &.top {
        // top: 0;
        background: linear-gradient(var(--bg-primary), rgba(255, 255, 255, 0));
        margin-bottom: -3rem;
    }
}

.address-overview {
    @include flex-full-height;
    background: var(--bg-primary);
    flex-direction: column;
    box-shadow: -0.75rem 0 12rem rgba(0, 0, 0, 0.05);

    /* Default: 1440px */
    --padding: 4rem;
    --padding-bottom: 6rem;

    @media (max-width: 1319px) {
        --padding: 3rem;
        --padding-bottom: 5rem;
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        --padding: 1rem;
        --padding-bottom: 2rem;
    }

    @media (min-width: 1800px) {
        --padding: 7rem;
        --padding-bottom: 6rem;
    }

    @media (min-width: 2000px) {
        --padding: 9rem;
        --padding-bottom: 6rem;
    }

    &.no-accounts {
        padding: 6rem 0;
        justify-content: center;
        text-align: center;

        img {
            width: 50%;
            margin: 0 auto 4rem;
        }
    }
}

.active-address {
    flex-shrink: 0;
    align-items: center;
    padding: calc(var(--padding) + 2rem);
    padding-right: calc(var(--padding) + 4rem);
    padding-bottom: var(--padding-bottom);

    .identicon-wrapper {
        position: relative;
        margin-right: 4rem;

        .identicon-menu {
            position: absolute;
            right: 0.25rem;
            bottom: -1.25rem;
            width: 4rem;
            height: 4rem;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
            background: var(--bg-primary);
            box-shadow:
                0px 0.337011px 2px rgba(31, 35, 72, 0.08),
                0px 1.5px 3px rgba(31, 35, 72, 0.08),
                0px 4px 16px rgba(31, 35, 72, 0.11);

            opacity: 0;
            transition: opacity 0.3s var(--nimiq-ease);

            .nq-icon {
                opacity: 0.5;
                transition: opacity 0.3s var(--nimiq-ease);
            }
        }

        > svg {
            width: 10.5rem;
            height: 10.5rem;
            color: var(--bitcoin-orange);
            margin: -0.25rem 0.375rem;
            display: block;
        }
    }

    .identicon {
        height: 11.25rem;
        width: 11.25rem;
        margin: -0.625rem 0; // Negative margin above and below to size identicon to be 90x80 px
        flex-shrink: 0;
    }

    .meta {
        flex-grow: 1;
        min-width: 0;

        .flex-row {
            align-items: center;
        }
    }

    .address,
    .label {
        flex-grow: 1;
        overflow: hidden;
        white-space: nowrap;
    }

    .label,
    .amount {
        --size: var(--h1-size);
        font-size: var(--size);
        margin-top: 0.25rem;
    }

    .address,
    .fiat-amount {
        --size: var(--body-size);
        font-size: var(--size);
        opacity: 0.5;
    }

    .label {
        font-weight: 600;
        margin-bottom: 0.75rem;
        margin-right: 3rem;
        mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));

        &.bitcoin {
            position: relative;
            top: 1.25rem;
        }
    }

    .address {
        word-spacing: -0.2em;
        font-family: "Fira Mono", monospace; // TODO: Improve monospace font stack
        transition: opacity .3s var(--nimiq-ease);

        &.masked {
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }
    }

    .copyable {
        padding: 0.5rem 1rem;
        margin-left: -1rem;
        min-width: 0;
        margin-right: 3rem;

        &:hover .address,
        &:focus .address,
        &.copied .address {
            opacity: 1;
            font-weight: 500;
        }
    }

    .fiat-amount {
        margin-left: auto;
    }

    .amount,
    .fiat-amount {
        flex-shrink: 0;
    }

    .amount {
        font-weight: bold;
        margin-bottom: 0.5rem;
    }

    .fiat-amount {
        font-weight: 600;
        line-height: 1;
    }

    &:hover {
        .identicon-wrapper .identicon-menu {
            opacity: 1;
        }
    }
}

.actions,
.actions-mobile {
    justify-content: space-between;
    margin-bottom: 0.75rem;
    align-items: center;
    margin: 0 var(--padding) 2rem;
    padding: 0 3rem 0 2rem;

    button {
        flex-shrink: 0;
    }
}

.actions-mobile .icon-button,
.active-address .identicon-wrapper .identicon-menu {
    .popup-menu {
        position: absolute;
        font-size: var(--body-size);
        padding: 0.5rem;
        font-weight: 600;
        word-break: keep-all;
        border-radius: 0.5rem;
        z-index: 1;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s var(--nimiq-ease);

        button {
            align-items: center;
            padding: 1rem 1.5rem 1rem 1rem;
            border-radius: 0.25rem;
            transition: background-color .3s var(--nimiq-ease);
            white-space: nowrap;

            svg {
                width: 2.75rem;
                height: 3rem;
                margin: -0.125rem 1rem -0.125rem 0;
                opacity: 0.8;
            }

            &:hover,
            &:focus {
                background: rgba(255, 255, 255, 0.12);
            }
        }
    }

    &:hover,
    &:focus,
    &:focus-within {
        opacity: 1;

        .nq-icon {
            opacity: 0.8;
        }
    }

    &:focus,
    &:focus-within {
        .popup-menu {
            pointer-events: all;
            opacity: 1;
        }
    }
}

.actions-mobile .icon-button .popup-menu {
    top: 1.375rem;
    right: var(--padding);
}

.active-address .identicon-wrapper .identicon-menu .popup-menu {
    top: -0.25rem;
    left: -0.25rem;
}

.send, .receive {
    margin: 0 0.5rem;
    align-items: center;

    padding: 1.125rem 2rem;
    height: unset;
    line-height: 1;
    border-radius: 500px;
    font-size: var(--large-button-size);

    .nq-icon {
        width: 1.5rem;
        height: 1.5rem;
        margin-right: 1rem;
    }

    &:disabled {
        pointer-events: none;
        background: rgba(131, 131, 131, 0.07);
        color: #B5B6C1;
    }
}

.send {
    margin-left: 1rem;

    .nq-icon {
        transform: rotateZ(-90deg);
    }
}

.receive {
    margin-right: 0;

    .nq-icon {
        transform: rotateZ(90deg);
    }
}

.search-bar {
    margin-right: 3rem;
}

.unclaimed-cashlinks {
    flex-shrink: 0;
    margin-right: 1rem;

    padding: 1.125rem 2rem;
    height: unset;
    line-height: 1;
    border-radius: 500px;
    font-size: var(--large-button-size);

    background: none !important;
    box-shadow: inset 0 0 0 1.5px rgba(252, 135, 2, 0.35); // Based on Nimiq Orange

    transition:
        color .3s var(--nimiq-ease),
        background-color .3s var(--nimiq-ease),
        box-shadow .3s var(--nimiq-ease);

    &:hover,
    &:focus {
        box-shadow: inset 0 0 0 1.5px rgba(252, 117, 0, 0.45); // Based on Nimiq Orange Darkened
    }

    &.active {
        box-shadow: none;
        background:rgba(252, 135, 2, 0.13) !important;
    }
}

.actions-mobile {
    display: none;
}

.transaction-list {
    flex-grow: 1;
}

.promo-box {
    position: absolute;
    bottom: 3rem;
    right: 3rem;
    border-radius: 0.75rem;
    width: 48rem;
    padding: 2.25rem;

    .flex-row {
        align-items: center;

        .nq-h2 {
            font-size: 16px;
            margin: 0;
            line-height: 130%;
        }

        svg {
            width: 29px;
            height: 29px;
            flex-shrink: 0;
            margin-right: 1.5rem;
        }
    }

    ul {
        padding-left: 2.25rem;
        margin: 0;

        li {
            padding-top: 1.5rem;
            font-size: 14px;
            color: rgba(white, 0.8);
            font-weight: 600;

            &.flex-row {
                margin-left: -2.25rem;
                list-style-type: none;
                position: relative;
                align-items: flex-start;

                .nq-icon {
                    opacity: .7;
                    width: 12px;
                    height: auto;
                    padding-top: 6px;
                }

                .nq-button-s {
                    font-size: 14px;
                    line-height: 18px;
                    margin-left: 2rem;

                    &:hover,
                    &:focus,
                    &:active {
                        color: white;
                    }

                    svg {
                        width: 15px;
                        height: auto;
                    }
                }
            }

            &::marker {
                color: rgba(white, .7);
                transform: translateX(2px);
                font-size: 12px;
            }
        }
    }

    .cross-close-button {
        height: 12px;
        width: 12px;
        opacity: .7;
        position: absolute;
        top: 12px;
        right: 12px;
        padding: 0;
    }

    &.fadeY-enter-active, &.fadeY-leave-active {
        will-change: opacity, transform;
        transition: {
            property: opacity, transform;
            duration: 200ms;
            timing-function: cubic-bezier(0.5, 0, 0.15, 1);
        }
    }

    &.fadeY-enter-active {
        transition-delay: 50ms;
    }

    &.fadeY-leave,
    &.fadeY-enter-to {
        transform: translateY(0);
    }

    &.fadeY-enter {
        opacity: 0;
        transform: translateY(1rem);
    }

    &.fadeY-leave-to {
        opacity: 0;
        transform: translateY(-1rem);
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .address-overview {
        position: relative;
    }

    .actions {
        display: none;
    }

    .actions-mobile {
        display: flex;
        padding: 0;
        margin: 2rem var(--padding) 1rem;

        .search-bar,
        .unclaimed-cashlinks {
            margin: 0 1rem;
        }

        .icon-button {
            padding: 1rem;
            opacity: 0.3;
            font-size: 2.5rem;

            /deep/ svg {
                display: block;
            }
        }
    }

    .active-address {
        padding: 2rem;
        margin: 0 var(--padding);

        .identicon-wrapper {
            margin-right: 1.5rem;

            > svg {
                width: 5.25rem;
                height: 5.25rem;
                color: var(--bitcoin-orange);
                margin: 0 0.25rem;
                display: block;
            }
        }

        .identicon-menu {
            display: none;
        }

        .identicon {
            height: 5.75rem;
            width: 5.75rem;
            margin: -0.25rem 0; // Negative margin above and below to size identicon to be 46x40 px
        }

        .label,
        .copyable {
            margin-right: 1.25rem;
        }

        .label,
        .amount {
            font-size: var(--h2-size);
            margin-bottom: 0;
        }

        .label.bitcoin {
            top: 0.625rem;
        }

        .address,
        .fiat-amount {
            font-size: var(--small-size);
        }
    }

    .mobile-action-bar {
        margin: 0;
        box-shadow:
            0px 0px 4.12454px rgba(31, 35, 72, 0.031357),
            0px 0px 12.5187px rgba(31, 35, 72, 0.045),
            0px 0px 32.0004px rgba(31, 35, 72, 0.058643),
            0px 0px 80px rgba(31, 35, 72, 0.07);
    }

    .promo-box {
        width: 90%;
        bottom: 10rem;
    }
}
</style>
