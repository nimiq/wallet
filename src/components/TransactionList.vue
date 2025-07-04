<template>
    <div class="transaction-list flex-row" ref="root">
        <RecycleScroller
            v-if="isFetchingTxHistory || transactions.length"
            :items="transactions"
            :item-size="itemSize"
            key-field="transactionHash"
            :buffer="scrollerBuffer"
            ref="scroller"
        >
            <template v-if="showUnclaimedCashlinkList" v-slot:before>
                <div class="unclaimed-cashlink-list">
                    <div class="month-label nq-blue opacity-40"><label>{{ $t('Pending Cashlinks') }}</label></div>
                    <CrossCloseButton
                        class="top-right nq-blue opacity-50"
                        @click="$emit('close-unclaimed-cashlink-list')"
                    />
                    <TransactionListItem
                        v-for="tx in unclaimedCashlinkTxs"
                        :transaction="tx"
                        :key="tx.transactionHash"
                    />
                </div>
            </template>

            <template v-slot:default="{ item, index }">
                <LoadingList v-if="item.loading" :delay="index * 100" :type="LoadingListType.TRANSACTION" />
                <div v-else class="list-element" :data-id="index" :data-hash="item.transactionHash">
                    <div v-if="!item.sender && !item.isMonthlyReward" class="month-label flex-row">
                        <label>{{ item.transactionHash }}</label>
                        <div v-if="item.isLatestMonth && isFetchingTxHistory" class="fetching flex-row">
                            <CircleSpinner/>
                            <span>{{ $t('Fetching') }}</span>
                        </div>
                        <div v-else-if="item.isLatestMonth && !hasFetchedAddress"
                            class="failed-to-fetch flex-row nq-orange"
                        >
                            <AlertTriangleIcon/>
                            <span>{{ $t('Failed to fetch transactions') }}</span>
                        </div>
                    </div>
                    <StakingRewardsListItem
                        v-else-if="item.isMonthlyReward"
                        :monthly-reward="item.monthlyReward"
                        :transaction-count="item.transactionCount"
                        :month="getMonthFromReward(item)"
                    />
                    <TransactionListItem v-else :transaction="item"/>
                </div>
            </template>

            <template v-if="txCount === 1" v-slot:after>
                <div class="after-first-tx">
                    <h1 class="nq-h1">{{ $t('Congrats') }} 🎉</h1>
                    <h1 class="nq-h1">{{ $t('You now own crypto!') }}</h1>
                    <i18n path="Invite a friend with a {cashlink} or buy more here in the wallet."
                        tag="p" class="nq-text"
                    >
                        <a slot="cashlink" href="#cashlink" @click.prevent="onCreateCashlink">{{ $t('Cashlink') }}</a>
                    </i18n>
                    <router-link to="buy" class="nq-button light-blue">
                        {{ $t('Buy NIM') }}
                    </router-link>
                </div>
            </template>
        </RecycleScroller>

        <div v-else-if="!searchString" class="empty-state flex-column">
            <h2 class="nq-h1">{{ $t('Your transactions will appear here') }}</h2>

            <router-link v-if="isMainnet" to="buy" class="nq-button light-blue">
                {{ $t('Buy NIM') }}
            </router-link>
            <TestnetFaucet v-else-if="activeAddress" :address="activeAddress"/>
        </div>
        <div v-else class="empty-state flex-column">
            <h2 class="nq-h1 no-search-results">{{ $t('No transactions found') }}</h2>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, Ref, watch, onMounted, onUnmounted } from 'vue';
import { CircleSpinner, AlertTriangleIcon } from '@nimiq/vue-components';
import TransactionListItem from '@/components/TransactionListItem.vue';
import TestnetFaucet from './TestnetFaucet.vue';
import CrossCloseButton from './CrossCloseButton.vue';
import { useAddressStore } from '../stores/Address';
import { useNetworkStore } from '../stores/Network';
import { ENV_MAIN } from '../lib/Constants';
import { isProxyData, ProxyType, ProxyTransactionDirection } from '../lib/ProxyDetection';
import { createCashlink } from '../hub';
import { useConfig } from '../composables/useConfig';
import LoadingList, { LoadingListType } from './LoadingList.vue';
import StakingRewardsListItem from './StakingRewardsListItem.vue';
import { useTransactionList } from '../composables/useTransactionList';

export default defineComponent({
    props: {
        searchString: {
            type: String,
            default: '',
        },
        showUnclaimedCashlinkList: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, context) {
        const { activeAddress, activeAddressInfo, transactionsForActiveAddress } = useAddressStore();
        const { isFetchingTxHistory, fetchedAddresses } = useNetworkStore();
        const { config } = useConfig();

        // Amount of pixel to add to edges of the scrolling visible area to start rendering items further away
        const scrollerBuffer = 300;

        const txCount = computed(() => transactionsForActiveAddress.value.length);

        const unclaimedCashlinkTxs = computed(() => transactionsForActiveAddress.value.filter(
            (tx) => tx.sender === activeAddress.value && !tx.relatedTransactionHash
                && isProxyData(tx.data.raw, ProxyType.CASHLINK, ProxyTransactionDirection.FUND),
        ));

        // Count unclaimed cashlinks
        watch(unclaimedCashlinkTxs, () => {
            const count = unclaimedCashlinkTxs.value.length;
            context.emit('unclaimed-cashlink-count', count);
        });

        const { transactions, itemSize } = useTransactionList({
            searchString: computed(() => props.searchString),
            scrollerBuffer,
        });

        const root: Ref<null | HTMLElement> = ref(null);

        // Does not need to be reactive, as the environment doesn't change during runtime.
        const isMainnet = config.environment === ENV_MAIN;

        function onCreateCashlink() {
            createCashlink(activeAddress.value!, activeAddressInfo.value!.balance || undefined);
        }

        // Scroll to top when
        // - Active address changes
        // - Unclaimed Cashlinks list is opened
        const scroller = ref<{
            scrollToPosition(position: number, smooth?: boolean): void,
            $el: HTMLDivElement,
                } | null>(null);

        watch(activeAddress, () => {
            if (scroller.value) {
                scroller.value.scrollToPosition(0, false); // No smooth scrolling on address change
            }
        });

        watch(() => props.showUnclaimedCashlinkList, (show) => {
            if (show && scroller.value) {
                scroller.value.scrollToPosition(0, true);
            }
        });

        function onScroll() {
            context.emit('scroll');
        }

        // @scroll / @scroll.native doesn't seem to work, so using standard event system
        onMounted(() => {
            if (!scroller.value) return;
            scroller.value.$el.addEventListener('scroll', onScroll);
        });

        onUnmounted(() => {
            if (!scroller.value) return;
            scroller.value.$el.removeEventListener('scroll', onScroll);
        });

        const hasFetchedAddress = computed(
            () => !!activeAddress.value && fetchedAddresses.value.includes(activeAddress.value),
        );

        function getMonthFromReward(item: any) {
            if (typeof item.transactionHash === 'string' && item.transactionHash.startsWith('monthly-reward-')) {
                const parts = item.transactionHash.split('-');
                return `${parts[2]}-${parts[3]}`;
            }
            return '';
        }

        return {
            LoadingListType,
            activeAddress,
            scrollerBuffer,
            itemSize,
            txCount,
            transactions,
            root,
            isFetchingTxHistory,
            hasFetchedAddress,
            isMainnet,
            unclaimedCashlinkTxs,
            onCreateCashlink,
            scroller,
            getMonthFromReward,
        };
    },
    components: {
        TransactionListItem,
        TestnetFaucet,
        CrossCloseButton,
        CircleSpinner,
        AlertTriangleIcon,
        LoadingList,
        StakingRewardsListItem,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.transaction-list {
    position: relative;
}

.month-label {
    padding: 5rem 2rem 2rem;
    justify-content: space-between;
    align-items: center;

    label {
        letter-spacing: 1.5px;
        font-size: var(--label-size);
        line-height: 2rem;
        text-transform: uppercase;
        font-weight: bold;
        opacity: 0.4;
    }
}

.vue-recycle-scroller {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    padding-right: calc(2rem + var(--padding) - 6px);
    padding-left: calc(2rem + var(--padding));
    padding-bottom: var(--padding, 4rem);

    touch-action: pan-y;

    @extend %custom-scrollbar;
}

.unclaimed-cashlink-list {
    border-radius: 0.75rem;
    padding: 2rem;
    position: relative;
    margin: 4rem -2rem 0;
    box-shadow: inset 0 0 0 0.1875rem rgba(31, 35, 72, 0.16);

    .cross-close-button {
        top: 1.5rem;
        right: 1.5rem;

        ::v-deep svg {
            opacity: 0.5;
        }
    }

    .month-label {
        padding-top: 1rem;

        label {
            opacity: 1;
        }
    }
}

.list-element {
    position: relative;

    &.fadein {
        animation-name: fadein;
        animation-duration: 250ms;
        animation-iteration-count: 1;

        @keyframes fadein {
            0% { opacity: 0 }
            100% { opacity: 1 }
        }
    }

    &.loading {
        cursor: progress;
        height: 10rem;
        padding: 2rem 1rem;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;

        .placeholder,
        .identicon {
            animation-name: loading;
            animation-duration: 1s;
            animation-iteration-count: infinite;
            animation-delay: inherit;

            @keyframes loading {
                0% { opacity: 1 }
                50% { opacity: .5 }
                100% { opacity: 1 }
            }
        }

        .placeholder {
            background-color: var(--text-6);
            border-radius: 0.5rem;
        }

        .date,
        .data,
        .amounts {
            justify-content: space-between;
            height: 4.25rem;
            animation-delay: inherit;

            .placeholder {
                width: 100%;
                height: 1.875rem;
                max-width: 51rem;

                &:last-child {
                    height: 1rem;
                }
            }
        }

        .date {
            align-items: center;
            margin-left: 1rem;
            margin-right: 1.25rem;

            .placeholder {
                width: 2.25rem;

                &:last-child {
                    width: 3rem;
                }
            }
        }
        .identicon {
            margin: 0 1rem;
            height: 6rem;
            width: 6rem;
            color: var(--text-6);
        }
        .data {
            flex-grow: 1;
            margin: 0 5vw 0 1.5rem;

            .placeholder {
                &:last-child {
                    width: 30%;
                    min-width: 5rem;
                    max-width: 20rem;
                }
            }
        }
        .amounts {
            width: 8%;
            min-width: 8rem;
            align-items: flex-end;

            .placeholder {
                &:last-child {
                    width: 55%;
                }
            }
        }
    }
}

.after-first-tx {
    width: 37rem;
    max-width: 100%;
    margin: 16rem auto 0;
    text-align: center;

    .nq-h1:nth-child(2) {
        margin-top: -2.5rem;
        margin-bottom: 2rem;
    }

    .nq-text {
        color: var(--text-60);
        font-weight: 600;
        margin-bottom: 1rem;

        a {
            color: inherit;
            text-decoration: underline;
        }
    }
}

.empty-state {
    width: 100%;
    justify-content: center;
    align-items: center;

    .nq-h1 {
        margin-top: 0;
        margin-bottom: 1.5rem;
        text-align: center;
    }

    .testnet-faucet,
    > .nq-button {
        margin-top: 4.5rem;
    }

    .no-search-results {
        opacity: 0.4;
    }
}

.fetching span {
    font-size: var(--small-size);
    opacity: 0.5;
    margin-left: 1rem;
    font-weight: 600;
}

.failed-to-fetch span {
    font-size: var(--small-size);
    margin-left: 1rem;
    font-weight: 600;
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .month-label {
        padding-top: 4rem;
    }

    .vue-recycle-scroller {
        padding-right: calc(0.25rem + var(--padding));
        padding-left: calc(0.25rem + var(--padding));
    }

    .after-first-tx {
        margin-top: 6rem;
    }

    .unclaimed-cashlink-list {
        padding: 0.5rem;
        padding-bottom: 1.5rem;
        margin: 0;
        margin-top: 2rem;

        .top-right {
            top: 1rem;
            right: 1rem;
        }
    }

    .empty-state {
        margin: 0 2rem;

        .nq-h1 {
            font-size: 2.5rem;
            text-align: center;
        }

        .testnet-faucet,
        > .nq-button {
            margin-top: 2.5rem;
        }
    }
}

.opacity-50 {
    opacity: 0.5;
}

.opacity-40 {
    opacity: 0.4;
}
</style>
