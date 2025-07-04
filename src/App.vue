<template>
    <div id="app" :class="{'consensus-stalled': consensus === 'stalled'}">
        <div v-if="consensus === 'stalled'" class="red-notice">
            <i18n v-if="isMainnet" path="A network issue occurred, please stand by. Click {link} for updates."
                :tag="false">
                <template #link>
                    <a href="https://x.com/nimiq/status/1860886491292913679" target="_blank">{{ $t('here') }}</a>
                </template>
            </i18n>
            <template v-else>{{
                $t('The network is temporarily not processing transactions or staking rewards, thank you for your '
                + 'patience.')
            }}</template>
        </div>
        <main :class="activeMobileColumn" ref="$main">
            <Sidebar/>

            <transition name="delay">
                <router-view name="basement"/>
            </transition>

            <transition name="slide-right">
                <keep-alive>
                    <router-view name="groundfloor"/>
                </keep-alive>
            </transition>
        </main>

        <SwapNotification/>

        <UpdateNotification/>

        <transition name="fade">
            <div v-if="$config.showHelpButton && $route.name !== 'network' && $route.name !== 'settings'">
                <WalletStatusButton/>
            </div>
        </transition>

        <div v-if="!hasAccounts" class="loader flex-row">
            <LoadingSpinner/>
        </div>
    </div><!-- #app -->
</template>

<script lang="ts">
import Vue, { defineComponent, ref, watch, computed, onMounted, Ref, nextTick, getCurrentInstance } from 'vue';
import { LoadingSpinner } from '@nimiq/vue-components';
import { provideI18n } from '@/lib/useI18n';
import Sidebar from './components/layouts/Sidebar.vue';
import SwapNotification from './components/swap/SwapNotification.vue';
import UpdateNotification from './components/UpdateNotification.vue';
import router, { provideRouter } from './router';
import { useAccountStore } from './stores/Account';
import { useSettingsStore } from './stores/Settings';
import { useWindowSize } from './composables/useWindowSize';
import { useActiveMobileColumn } from './composables/useActiveMobileColumn';
import { useSwipes } from './composables/useSwipes';
import { useNetworkStore } from './stores/Network';
import { useConfig } from './composables/useConfig';
import { ENV_MAIN } from './lib/Constants';
import WalletStatusButton from './components/WalletStatusButton.vue';

export default defineComponent({
    name: 'app',
    setup() {
        const instance = getCurrentInstance();

        provideRouter(router);
        provideI18n(instance?.proxy as Vue);

        const { config } = useConfig();
        const isMainnet = config.environment === ENV_MAIN;

        const { activeMobileColumn } = useActiveMobileColumn();

        const { accountInfos } = useAccountStore();
        // Convert result of computation to boolean, to not trigger rerender when number of accounts changes above 0.
        const hasAccounts = computed(() => Boolean(Object.keys(accountInfos.value).length));

        const { amountsHidden, swipingEnabled } = useSettingsStore();

        watch(amountsHidden, (hidden) => {
            if (hidden) document.body.classList.add('value-masked');
            else document.body.classList.remove('value-masked');
        });

        // Swiping
        const main$ = ref<HTMLDivElement>();
        let mobileTapArea$: HTMLDivElement | null = null;
        const { width, isMobile } = useWindowSize();

        async function updateSwipeRestPosition(
            velocityDistance: number,
            velocityTime: number,
            initialXPosition: number,
            currentXPosition: number,
        ) {
            if (velocityDistance && velocityTime) {
                const swipeFactor = 10;
                const velocity = (velocityDistance / velocityTime) * 1000 * swipeFactor; // px/s
                const remainingXDistance = Math.sqrt(Math.abs(velocity)) * (velocity / Math.abs(velocity));
                // console.log(`Travelled ${velocity}px/s, will travel ${remainingXDistance}px more`);
                currentXPosition += remainingXDistance;
            }

            const sidebarBarrier = -192 / 2;
            const transactionsBarrier = -(window.innerWidth / 2 + 192);

            if (currentXPosition >= sidebarBarrier && (initialXPosition) < sidebarBarrier) {
                // Go to sidebar
                await router.push({ name: router.currentRoute.name!, query: { sidebar: 'true' } });
            } else if (currentXPosition <= transactionsBarrier && (initialXPosition) > transactionsBarrier) {
                // Go to transactions
                if (router.currentRoute.name === 'root') {
                    await router.push('/transactions');
                }
            } else if (
                (currentXPosition <= sidebarBarrier && currentXPosition >= transactionsBarrier)
                && (initialXPosition > sidebarBarrier || initialXPosition < transactionsBarrier)
            ) {
                // Go back to root (addresses)
                router.back();
                await nextTick();
            }
        }

        function onSwipeFrame(position: number) {
            if (position <= -192) return;
            if (!mobileTapArea$) {
                mobileTapArea$ = document.querySelector('.mobile-tap-area') as HTMLDivElement;
            }
            mobileTapArea$.style.transition = 'initial';
            mobileTapArea$.style.opacity = `${1 - (position / -192)}`;
        }

        function resetStyles() {
            if (!mobileTapArea$) return;
            mobileTapArea$.style.transition = '';
            mobileTapArea$.style.opacity = '';
            mobileTapArea$ = null;
        }

        const { attachSwipe, detachSwipe } = useSwipes(main$ as Ref<HTMLDivElement>, {
            onSwipeEnded: updateSwipeRestPosition,
            // TODO: clamp movement to smaller area on settings and network view
            clampMovement: computed<[number, number]>(() => {
                if (router.currentRoute.path === '/transactions') {
                    // Allow swiping back from transactions to address list, but not all the way to sidebar
                    return [-width.value - 192, -192];
                }
                // Otherwise only allow swiping between main column and sidebar
                return [-192, 0];
            }),
            onFrame: onSwipeFrame,
            reset: resetStyles,
            excludeSelector: '.scroller, .scroller *',
        });

        watch([isMobile, swipingEnabled], ([isMobileNow, newSwiping], [wasMobile, oldSwiping]) => {
            if (!main$.value) return;

            if ((isMobileNow && !wasMobile) || (newSwiping.value === 1 && oldSwiping.value !== 1)) {
                attachSwipe();
            } else if (!isMobileNow || newSwiping.value !== 1) {
                detachSwipe();
            }
        });

        onMounted(() => {
            if (isMobile.value && swipingEnabled.value === 1) attachSwipe();
        });

        const { consensus } = useNetworkStore();

        return {
            isMainnet,
            activeMobileColumn,
            hasAccounts,
            main$,
            consensus,
        };
    },
    components: {
        Sidebar,
        SwapNotification,
        UpdateNotification,
        LoadingSpinner,
        WalletStatusButton,
    },
});
</script>

<style scoped lang="scss">
@import './scss/mixins.scss';

#app {
    @include flex-full-height;
    overflow: hidden; // To prevent horizontal scrollbars during panel sliding
    touch-action: pan-y;

    /* Default: >= 1500px */
    --sidebar-width: 24rem;
    --account-column-width: 70rem;
    --settings-width: 131rem;
    --address-column-width: 150rem;

    @media (max-width: $extraLargeDesktopBreakpoint) {
        --account-column-width: 65rem;
    }

    @media (max-width: $largeDesktopBreakpoint) {
        --account-column-width: 59rem;
    }

    @media (max-width: $mediumDesktopBreakpoint) {
        --account-column-width: 52rem;
    }

    @media (max-width: $smallDesktopBreakpoint) {
        --account-column-width: 47.5rem;
    }

    // Comment the table breakpoint due to requirements of the new address list layout
    // @media (max-width: $tabletBreakpoint) { // Tablet breakpoint
    //     --account-column-width: 35.125rem;
    // }

    @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
        --account-column-width: 100vw;
        --address-column-width: 100vw;
    }

    @media (min-width: $veryLargeDesktopBreakpoint) {
        --account-column-width: 80.75rem;
    }

    @media (min-width: $ultraLargeDesktopBreakpoint) {
        --account-column-width: 85rem;
    }

    main {
        @include flex-full-height;
        flex-direction: row;
        width: 100%;
        position: relative;

        .sidebar {
            width: var(--sidebar-width);
            flex-shrink: 0;
        }

        .groundfloor {
            width: 100%;
            min-width: 0;
            position: relative;
        }

        ::v-deep .account-overview {
            width: var(--account-column-width);
            flex-shrink: 0;
            z-index: 2;
        }

        ::v-deep .address-overview {
            width: clamp(
                        0px,
                        calc(100vw - var(--sidebar-width) - var(--account-column-width)),
                        var(--address-column-width)
                    );
            min-width: 0;
            z-index: 3;
        }

        ::v-deep .mobile-tap-area {
            z-index: 100;
        }

        .network {
            position: absolute;
            top: 0;
            left: var(--sidebar-width);
            width: calc(100% - var(--sidebar-width));
            height: 100%;
            z-index: 0;
        }
    }

    .loader {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        justify-content: center;
        align-items: center;
        background: var(--nimiq-gray);
        z-index: 100;
    }

    @media (max-width: $halfMobileBreakpoint) { // Half mobile breakpoint
        main {
            width: calc(var(--sidebar-width) + 100vw);
            transition: transform var(--transition-time) var(--nimiq-ease);

            .network,
            .groundfloor {
                width: 100vw;
            }

            &.column-sidebar {
                ::v-deep .mobile-tap-area {
                    opacity: 1;
                    pointer-events: all;
                }
            }

            &.column-account,
            &.column-address {
                // Account column
                transform: translateX(calc(-1 * var(--sidebar-width)));
            }

            ::v-deep .address-overview {
                width: clamp(
                        0px,
                        calc(100vw - var(--account-column-width)),
                        var(--address-column-width)
                    );
            }
        }
    }

    @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
        main {
            width: calc(var(--sidebar-width) + 200vw);

            .groundfloor {
                width: 100%;
            }

            ::v-deep .address-overview {
                min-width: unset;
                width: 100vw;
            }

            &.column-address {
                // Address column
                transform: translateX(calc(-1 * var(--sidebar-width) - 100vw));
            }
        }
    }

    @media (min-width: ($ultraLargeDesktopBreakpoint + 70)) {
        ::v-deep .groundfloor {
            display: flex;
            justify-content: center;

            // Size of both columns
            --columns-width: calc(var(--account-column-width) + var(--address-column-width));

            // Margin between columns and edges of the groundfloor
            --columns-lateral-margin: calc((100% - var(--columns-width)) / 2);

            & > div {
                position: relative;

                .account-overview {
                    position: absolute;
                    width: var(--account-column-width);
                    right: calc(var(--columns-lateral-margin) + var(--address-column-width));
                    height: 100%;
                }

                .settings {
                    position: absolute;
                    width: var(--settings-width);
                    height: 100%;
                    margin-left: calc(var(--settings-width) / -2);
                }

                .address-overview {
                    position: absolute;
                    width: var(--address-column-width);
                    left: calc(var(--columns-lateral-margin) + var(--account-column-width));
                    height: 100%;
                }
            }
        }
    }
}

.red-notice {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--nimiq-orange-bg);
    color: white;
    font-size: var(--body-size);
    text-align: center;
    padding: 1rem;

    a {
        font-weight: 600;
        color: white;
    }
}

#app.consensus-stalled {
    padding-top: 4.5rem;
}

@media (max-width: 751px) { /* When notice text breaks into two lines */
    #app.consensus-stalled {
        padding-top: 6.75rem;
        .red-notice {
            text-align: left;
        }
    }
}

@media (max-width: 418px) { /* When notice text breaks into three lines */
    #app.consensus-stalled {
        padding-top: 9.125rem;
        .red-notice {
            text-align: left;
        }
    }
}
</style>

<style lang="scss">
@import './scss/variables.scss'; // Import the variables

html, body {
    // Disable viewport overscrolling on iOS
    // https://www.bram.us/2016/05/02/prevent-overscroll-bounce-in-ios-mobilesafari-pure-css/
    position: fixed;
    overflow: hidden;
    width: 100vw;
}

body {
    overscroll-behavior: contain; // Disable pull-to-refresh
    font-size: 14px; // Affects the font-size of the testnet branch-selector banner
}

:root {
    --transition-time: 0.75s;
}

@media (max-width: $halfMobileBreakpoint) { /* Half mobile breakpoint */
    :root {
        --transition-time: 0.5s;
    }
}

.identicon img,
.nq-icon {
    display: block;
}

.nq-card {
    padding-bottom: env(safe-area-inset-bottom);
}

.fade-enter-active, .fade-leave-active {
    transition: opacity var(--transition-time) cubic-bezier(0.5, 0, 0.15, 1);

    &.settings {
        // The address-overview is flex-row positioned next to the account-overview.
        // The settings view has a very different width than the account-overview,
        // So to not disturb the relative positioning of the address-overview during
        // the slide-right animation, the settings content must be positioned absolute.
        position: absolute;
        left: 0;
        top: 0;
    }
}

.fade-enter-active.account-overview,
.fade-enter-active.settings {
    transition-delay: calc(var(--transition-time) / 2);
}

.fade-enter,
.fade-leave-to {
    opacity: 0 !important;
}

.network {
    &.delay-leave-active {
        /* the network can only disappear once the other transitions are finished so add a delay */
        transition-delay: var(--transition-time);
    }
}

.groundfloor,
.address-overview {
    transition: transform var(--transition-time) cubic-bezier(0.5, 0, 0.15, 1);
    will-change: transform;
}

.groundfloor {
    &.slide-right-enter,
    &.slide-right-leave-to {
        transform: translate3d(calc(100vw - var(--sidebar-width)), 0, 0);
    }
}

.address-overview {
    &.slide-right-enter,
    &.slide-right-leave-to {
        transform: translate3d(calc(100vw - var(--account-column-width) - var(--sidebar-width)), 0, 0);
    }

    .slide-right-enter &,
    .slide-right-leave-to & {
        transform: translate3d(calc(-1 * var(--account-column-width)), 0, 0);
    }
}

@media (max-width: $halfMobileBreakpoint) { // Half mobile breakpoint
    .groundfloor {
        &.slide-right-enter,
        &.slide-right-leave-to {
            transform: translate3d(100vw, 0, 0);
        }
    }

    .address-overview {
        &.slide-right-enter,
        &.slide-right-leave-to {
            transform: translate3d(calc(100vw - var(--account-column-width)), 0, 0);
        }
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint

    .address-overview {
        &.slide-right-enter,
        &.slide-right-leave-to {
            transform: translate3d(0, 0, 0);
        }
    }
}

.value-masked [value-mask] {
    font-size: 0 !important;
}

.value-masked [value-mask]::after {
    content: '•••••';
    font-size: var(--size);
    font-weight: 900;
    letter-spacing: 0.125em;
    margin-right: -0.125em;

    // Move dots up a little, to be vertically centered
    position: relative;
    top: -0.09em;
}

// Overwrites for AccountBalance
.value-masked .account-balance > .fiat-amount > [value-mask] {
    line-height: 0;
}
.value-masked .account-balance > .fiat-amount > [value-mask]::after {
    letter-spacing: 0.375em;
    margin-right: -0.375em;
}
</style>
