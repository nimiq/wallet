<template>
    <div class="address-overview" :class="{'no-accounts flex-column': !activeAddressInfo}">
        <template v-if="activeAddressInfo">
            <div class="actions-mobile flex-row">
                <button class="reset icon-button" @click="$router.back()"><ArrowLeftIcon/></button>
                <SearchBar v-model="searchString"/>
                <button
                    v-if="unclaimedCashlinkCount"
                    class="nq-button-s orange unclaimed-cashlinks"
                    :class="{'active': showUnclaimedCashlinkList}"
                    @click="showUnclaimedCashlinkList = !showUnclaimedCashlinkList"
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
                        <button class="reset flex-row" @click="rename(activeAccountId, activeAddressInfo.address)">
                            <RenameIcon/>{{ $t('Rename') }}
                        </button>
                    </div>
                </button>
            </div>
            <div class="active-address flex-row">
                <div class="identicon-wrapper">
                    <Identicon :address="activeAddressInfo.address" />
                    <button class="reset identicon-menu flex-row"
                        @click="$event.currentTarget.focus() /* Required for MacOS Safari & Firefox */"
                    >
                        <GearIcon/>
                        <div class="popup-menu nq-blue-bg">
                            <button class="reset flex-row" @click="rename(activeAccountId, activeAddressInfo.address)">
                                <RenameIcon/>{{ $t('Rename') }}
                            </button>
                        </div>
                    </button>
                </div>
                <div class="meta">
                    <div class="flex-row">
                        <div class="label">{{activeAddressInfo.label}}</div>
                        <Amount :amount="activeAddressInfo.balance"/>
                    </div>
                    <div class="flex-row">
                        <!-- We need to key the Copyable component, so that the tooltip disappears when
                             switching addresses while the tooltip is showing -->
                        <Copyable :text="activeAddressInfo.address" :key="activeAddressInfo.address">
                            <div class="address" :class="{'masked': isAddressCutOff}" ref="$address">
                                {{activeAddressInfo.address}}
                            </div>
                        </Copyable>
                        <FiatConvertedAmount :amount="activeAddressInfo.balance"/>
                    </div>
                </div>
            </div>
            <div class="actions flex-row">
                <SearchBar v-model="searchString"/>

                <button
                    v-if="unclaimedCashlinkCount"
                    class="nq-button-s orange unclaimed-cashlinks"
                    :class="{'active': showUnclaimedCashlinkList}"
                    @click="showUnclaimedCashlinkList = !showUnclaimedCashlinkList"
                >
                    {{ $tc(
                        '{count} pending Cashlink | {count} pending Cashlinks',
                        unclaimedCashlinkCount,
                    ) }}
                </button>

                <button class="send nq-button-pill light-blue flex-row" @click="$router.push('/send')">
                    <ArrowRightSmallIcon />{{ $t('Send') }}
                </button>
                <button class="receive nq-button-s flex-row" @click="$router.push('/receive')">
                    <ArrowRightSmallIcon />{{ $t('Receive') }}
                </button>
            </div>
            <TransactionList
                :searchString="searchString"
                :showUnclaimedCashlinkList="showUnclaimedCashlinkList"
                @unclaimed-cashlink-count="setUnclaimedCashlinkCount"
                @close-unclaimed-cashlink-list="hideUnclaimedCashlinkList"
            />
        </template>
        <template v-else>
            <img :src="'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/'
                + 'illustrations/To_the_stars_qhyy.svg'"/>
            <span class="opacity-75">{{ $t('Let\'s get started! Create your Nimiq account:') }}</span>
            <button class="nq-button" @click="onboard">{{ $t('Signup') }}</button>
        </template>

        <MobileActionBar/>

        <Portal>
            <transition name="modal">
                <router-view name="modal"/>
            </transition>
        </Portal>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, onUnmounted } from '@vue/composition-api';
import { Identicon, GearIcon, Copyable, ArrowRightSmallIcon, ArrowLeftIcon, MenuDotsIcon } from '@nimiq/vue-components';
// @ts-ignore missing types for this package
import { Portal } from '@linusborg/vue-simple-portal';

import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SearchBar from '../SearchBar.vue';
import TransactionList from '../TransactionList.vue';
import MobileActionBar from '../MobileActionBar.vue';
import RenameIcon from '../icons/AccountMenu/RenameIcon.vue';

import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { onboard, rename } from '../../hub'; // eslint-disable-line import/no-cycle
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    name: 'address-overview',
    setup() {
        const { activeAccountId } = useAccountStore();
        const { activeAddressInfo, activeAddress } = useAddressStore();

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

        const $address = ref<HTMLDivElement>(null);
        const isAddressCutOff = ref(false);

        const { width: windowWidth } = useWindowSize();

        // FIXME: Remove when Typescript supports ResizeObserver
        type ResizeObserver = any;

        let observer: ResizeObserver;

        onMounted(() => {
            if ('ResizeObserver' in window && $address.value) {
                // @ts-ignore ResizeObserver not supported by Typescript yet
                observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
                    const entry = entries[0];
                    const width = entry.contentBoxSize ? entry.contentBoxSize.inlineSize : entry.contentRect.width;
                    const cutoffWidth = windowWidth.value > 1160
                        ? 396
                        : windowWidth.value > 700
                            ? 372
                            : 322;
                    isAddressCutOff.value = width < cutoffWidth;
                });
                observer.observe($address.value);
            }
        });

        onUnmounted(() => {
            if (observer && $address.value) {
                observer.unobserve($address.value);
            }
        });

        return {
            searchString,
            activeAccountId,
            activeAddressInfo,
            onboard,
            rename,
            unclaimedCashlinkCount,
            setUnclaimedCashlinkCount,
            showUnclaimedCashlinkList,
            hideUnclaimedCashlinkList,
            $address,
            isAddressCutOff,
        };
    },
    components: {
        ArrowRightSmallIcon,
        Identicon,
        GearIcon,
        RenameIcon,
        Copyable,
        Amount,
        FiatConvertedAmount,
        SearchBar,
        TransactionList,
        ArrowLeftIcon,
        MenuDotsIcon,
        MobileActionBar,
        Portal,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
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
        font-size: var(--h1-size);
        margin-top: 0.25rem;
    }

    .address,
    .fiat-amount {
        font-size: var(--body-size);
        opacity: 0.5;
    }

    .label {
        font-weight: 600;
        margin-bottom: 0.75rem;
        margin-right: 3rem;
        mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
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
    margin: 0 1rem;
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
}

.send .nq-icon {
    transform: rotateZ(-90deg);
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
    box-shadow: inset 0 0 0 0.1875rem rgba(252, 135, 2, 0.35); // Based on Nimiq Orange

    transition:
        color .3s var(--nimiq-ease),
        background-color .3s var(--nimiq-ease),
        box-shadow .3s var(--nimiq-ease);

    &:hover,
    &:focus {
        box-shadow: inset 0 0 0 0.1875rem rgba(252, 117, 0, 0.45); // Based on Nimiq Orange Darkened
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
}
</style>
