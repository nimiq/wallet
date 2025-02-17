<template>
    <div class="address-overview"
        :class="{ 'no-accounts flex-column': activeCurrency === CryptoCurrency.NIM && !activeAddressInfo }">
        <StakingIcon class="svg-id-fix" />
        <template
            v-if="activeAddressInfo
                || activeCurrency === CryptoCurrency.BTC
                || activeCurrency === CryptoCurrency.USDC
                || activeCurrency === CryptoCurrency.USDT"
        >
            <div class="actions-mobile flex-row" v-if="isMobile">
                <button class="reset icon-button" @click="$router.back()"><ArrowLeftIcon/></button>
                <div class="flex-row justify-between w-full">
                    <SearchBar v-model="searchString"/>

                    <CashlinkButton
                        v-if="activeCurrency === CryptoCurrency.NIM && unclaimedCashlinkCount"
                        :showUnclaimedCashlinkList="showUnclaimedCashlinkList"
                        :unclaimedCashlinkCount="unclaimedCashlinkCount"
                        @toggle-unclaimed-cashlink-list="toggleUnclaimedCashlinkList"
                    />

                    <StakingButton v-if="showStakingButton" />
                    <button
                        class="reset icon-button"
                        @click="$event.currentTarget.focus() /* Required for MacOS Safari & Firefox */"
                    >
                        <MenuDotsIcon/>
                        <div class="popup-menu nq-blue-bg">
                            <button v-if="activeCurrency === CryptoCurrency.NIM"
                                class="reset flex-row"
                                @pointerdown="rename(activeAccountId, activeAddressInfo.address)"
                            >
                                <RenameIcon/>{{ $t('Rename') }}
                            </button>
                            <button v-if="activeCurrency === CryptoCurrency.NIM"
                                class="reset flex-row"
                                @mousedown="$router.push({ name: RouteName.Staking })"
                            >
                                <TwoLeafStakingIcon/>{{ $t('Staking') }}
                            </button>
                            <button v-if="activeCurrency === CryptoCurrency.BTC"
                                class="reset flex-row"
                                @pointerdown="rescan"
                            >
                                <RefreshIcon/>{{ $t('Rescan') }}
                            </button>
                            <button
                                class="reset flex-row"
                                @pointerdown="$router.push({
                                    name: RouteName.ExportHistory, params: { type: address } }
                                )"
                            >
                                <BoxedArrowUpIcon />{{ $t('Export History') }}
                            </button>
                            <button v-if="activeCurrency === CryptoCurrency.USDC"
                                class="reset flex-row"
                                @pointerdown="switchStablecoin($event, CryptoCurrency.USDT)"
                            >
                                <UsdtIcon/>{{ $t('Switch to USDT') }}
                            </button>
                            <button v-if="activeCurrency === CryptoCurrency.USDT"
                                class="reset flex-row"
                                @pointerdown="switchStablecoin($event, CryptoCurrency.USDC)"
                            >
                                <UsdcIcon/>{{ $t('Switch to USDC') }}
                            </button>
                        </div>
                    </button>
                </div>
            </div>

            <div class="active-address flex-row">
                <div class="identicon-wrapper">
                    <Identicon v-if="activeCurrency === CryptoCurrency.NIM" :address="activeAddressInfo.address" />
                    <BitcoinIcon v-if="activeCurrency === CryptoCurrency.BTC"/>
                    <UsdcIcon v-if="activeCurrency === CryptoCurrency.USDC"/>
                    <UsdtIcon v-if="activeCurrency === CryptoCurrency.USDT"/>
                    <button class="reset identicon-menu flex-row"
                        @click="$event.currentTarget.focus() /* Required for MacOS Safari & Firefox */"
                    >
                        <GearIcon/>
                        <div class="popup-menu nq-blue-bg">
                            <button v-if="activeCurrency === CryptoCurrency.NIM"
                                class="reset flex-row"
                                @pointerdown="rename(activeAccountId, activeAddressInfo.address)"
                            >
                                <RenameIcon/>{{ $t('Rename') }}
                            </button>
                            <button v-if="activeCurrency === CryptoCurrency.BTC"
                                class="reset flex-row"
                                @pointerdown="rescan"
                            >
                                <RefreshIcon/>{{ $t('Rescan') }}
                            </button>
                            <button
                                class="reset flex-row"
                                @pointerdown="$router.push(
                                    { name: RouteName.ExportHistory, params: { type: 'address'}}
                                )"
                            >
                                <BoxedArrowUpIcon />{{ $t('Export History') }}
                            </button>
                            <button v-if="activeCurrency === CryptoCurrency.USDC"
                                class="reset flex-row"
                                @pointerdown="switchStablecoin($event, CryptoCurrency.USDT)"
                            >
                                <UsdtIcon/>{{ $t('Switch to USDT') }}
                            </button>
                            <button v-if="activeCurrency === CryptoCurrency.USDT"
                                class="reset flex-row"
                                @pointerdown="switchStablecoin($event, CryptoCurrency.USDC)"
                            >
                                <UsdcIcon/>{{ $t('Switch to USDC') }}
                            </button>
                        </div>
                    </button>
                </div>
                <div class="meta">
                    <div class="flex-row">
                        <div v-if="activeCurrency === CryptoCurrency.NIM" class="label">
                            {{ activeAddressInfo.label }}
                        </div>
                        <div v-if="activeCurrency === CryptoCurrency.BTC" class="label bitcoin">
                            {{ $t('Bitcoin') }}
                        </div>
                        <div v-if="activeCurrency === CryptoCurrency.USDC" class="label usdc">
                            {{ $t('USD Coin') }}
                        </div>
                        <div v-if="activeCurrency === CryptoCurrency.USDT" class="label usdt">
                            {{ $t('Tether USD') }}
                        </div>
                        <Amount v-if="activeCurrency === CryptoCurrency.NIM" :amount="activeAddressInfo.balance"
                            value-mask/>
                        <Amount v-if="activeCurrency === CryptoCurrency.BTC" :amount="btcAccountBalance" currency="btc"
                            value-mask/>
                        <Amount v-if="activeCurrency === CryptoCurrency.USDC"
                            :amount="accountUsdcBridgedBalance + accountUsdcBalance" currency="usdc" value-mask/>
                        <Amount v-if="activeCurrency === CryptoCurrency.USDT"
                            :amount="accountUsdtBridgedBalance" :currency="CryptoCurrency.USDT" value-mask/>
                    </div>
                    <div class="flex-row">
                        <!-- We need to key the Copyable component, so that the tooltip disappears when
                             switching addresses while the tooltip is showing -->
                        <Copyable v-if="activeCurrency === CryptoCurrency.NIM"
                            :text="activeAddressInfo.address" :key="activeAddressInfo.address"
                        >
                            <div class="address" ref="address$" :class="{ 'masked': addressMasked  }">
                                {{activeAddressInfo.address}}
                            </div>
                        </Copyable>
                        <!--
                        Don't show Polygon address. User can see the polygon address in the send/receive flows, so
                        we can show also the warnings.
                        <Copyable v-if="activeCurrency === CryptoCurrency.USDC"
                            :text="usdcAddressInfo.address" :key="usdcAddressInfo.address"
                        >
                            <div class="address" ref="address$" :class="{ 'masked': addressMasked  }">
                                {{usdcAddressInfo.address}}
                            </div>
                        </Copyable>
                        -->

                        <FiatConvertedAmount
                            v-if="activeCurrency === CryptoCurrency.NIM && activeAddressInfo.balance !== null"
                            :amount="activeAddressInfo.balance" currency="nim" value-mask/>
                        <span v-else-if="activeCurrency === CryptoCurrency.NIM" class="fiat-amount"></span>

                        <FiatConvertedAmount v-if="activeCurrency === CryptoCurrency.BTC"
                            :amount="btcAccountBalance" currency="btc" value-mask/>

                        <FiatConvertedAmount v-if="activeCurrency === CryptoCurrency.USDC"
                            :amount="accountUsdcBridgedBalance + accountUsdcBalance  " currency="usdc" value-mask/>
                        <FiatConvertedAmount v-if="activeCurrency === CryptoCurrency.USDT"
                            :amount="accountUsdtBridgedBalance  " currency="usdt" value-mask/>
                    </div>
                </div>
            </div>

            <StakingOverview v-if="activeCurrency === CryptoCurrency.NIM && activeStake" />

            <div class="actions flex-row" v-if="!isMobile">
                <SearchBar v-model="searchString"/>

                <div class="flex-row ml-auto">
                    <CashlinkButton
                        v-if="activeCurrency === CryptoCurrency.NIM && unclaimedCashlinkCount"
                        :showUnclaimedCashlinkList="showUnclaimedCashlinkList"
                        :unclaimedCashlinkCount="unclaimedCashlinkCount"
                        @toggle-unclaimed-cashlink-list="toggleUnclaimedCashlinkList"
                    />

                    <template v-if="activeCurrency === CryptoCurrency.NIM">
                        <StakingButton v-if="!activeStake && showStakingButton" :showText="windowWidth > 860" />
                        <div class="vertical-separator"></div>
                    </template>

                    <button class="send nq-button-pill light-blue flex-row"
                        @click="$router.push(`/send/${activeCurrency}`)" @mousedown.prevent
                        :disabled="
                            (activeCurrency === CryptoCurrency.NIM
                                && ($config.disableNetworkInteraction
                                    || !activeAddressInfo || !activeAddressInfo.balance))
                            || (activeCurrency === CryptoCurrency.BTC && !btcAccountBalance)
                            || (activeCurrency === CryptoCurrency.USDC
                                && !accountUsdcBalance /* can only send native usdc */)
                            || (activeCurrency === CryptoCurrency.USDT && !accountUsdtBridgedBalance)"
                    >
                        <ArrowRightSmallIcon />{{ $t('Send') }}
                    </button>
                    <button class="receive nq-button-s flex-row"
                        @click="$router.push(`/receive/${activeCurrency}`)" @mousedown.prevent
                    >
                        <ArrowRightSmallIcon />{{ $t('Receive') }}
                    </button>
                </div>
            </div>
            <!-- <StakingPreview v-if="activeStake && isMobile" class="staking-preview-mobile" /> -->
            <div
                v-if="activeCurrency === CryptoCurrency.USDC && accountUsdcBridgedBalance >= 0.1e6"
                class="bridged-usdc-notice"
            >
                <div class="flex-row">
                    <UsdcIcon />
                    {{ $t('Legacy USDC (USDC.e)') }}
                    <div class="flex-grow"></div>
                    <Amount :amount="accountUsdcBridgedBalance" currency="usdc.e" value-mask/>
                </div>
                <div class="flex-row">
                    <span class="description">
                        <InfoCircleSmallIcon />
                        {{ $t('Convert your USDC.e to the new standard.') }}
                        <!-- eslint-disable-next-line max-len -->
                        <a href="https://www.circle.com/blog/what-you-need-to-know-native-usdc-on-polygon-pos"
                            target="_blank" rel="noopener" class="nq-link">{{ $t('Learn more') }}</a>
                    </span>
                    <button
                        @click="convertBridgedUsdcToNative"
                        class="nq-button-pill light-blue"
                    >{{ $t('Convert to USDC') }}</button>
                </div>
            </div>
            <div class="scroll-mask top"></div>
            <TransactionList
                v-if="activeCurrency === CryptoCurrency.NIM"
                :searchString="searchString"
                :showUnclaimedCashlinkList="showUnclaimedCashlinkList"
                @unclaimed-cashlink-count="setUnclaimedCashlinkCount"
                @close-unclaimed-cashlink-list="hideUnclaimedCashlinkList"
                @scroll="onTransactionListScroll"
            />
            <BtcTransactionList
                v-if="activeCurrency === CryptoCurrency.BTC"
                :searchString="searchString"
            />
            <UsdcTransactionList
                v-if="activeCurrency === CryptoCurrency.USDC"
                :searchString="searchString"
            />
            <UsdtTransactionList
                v-if="activeCurrency === CryptoCurrency.USDT"
                :searchString="searchString"
            />
        </template>
        <template v-else>
            <span class="opacity-75">{{ $t('Let\'s get started! Create your Nimiq account:') }}</span>
            <button class="nq-button" @click="onboard(false)" @mousedown.prevent>{{ $t('Signup') }}</button>
        </template>

        <transition name="fadeY">
            <div class="promo-box flex-column" v-if="promoBoxVisible && !showUnclaimedCashlinkList && !searchString">
                <div class="flex-row">
                    <h2 class="nq-h2">
                        <!-- <CrossCloseButton @click="setPromoBoxVisible(false)"/> -->
                        {{ $t('Your swap was successful!') }}
                    </h2>
                    <HighFiveIcon />
                </div>
                <p>{{ $t('All swaps are part of your transaction history and feature a small swap icon.') }}</p>
                <a class="nq-button-s inverse light-blue flex-row" @click="setPromoBoxVisible(false)">
                    {{ $t('Close') }}
                </a>
            </div>
        </transition>

        <MobileActionBar/>

        <Portal>
            <transition name="modal">
                <router-view name="modal"/>
            </transition>
        </Portal>

        <Portal>
            <transition name="modal">
                <keep-alive>
                    <router-view name="persistent-modal"/>
                </keep-alive>
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
    InfoCircleSmallIcon,
} from '@nimiq/vue-components';
import { BigNumber } from 'ethers';
import { SignPolygonTransactionRequest } from '@nimiq/hub-api';
import { RelayRequest } from '@opengsn/common/dist/EIP712/RelayRequest';
import { ForwardRequest } from '@opengsn/common/dist/EIP712/ForwardRequest';
import { RouteName } from '@/router';

import BitcoinIcon from '../icons/BitcoinIcon.vue';
import UsdcIcon from '../icons/UsdcIcon.vue';
import UsdtIcon from '../icons/UsdtIcon.vue';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SearchBar from '../SearchBar.vue';
import TransactionList from '../TransactionList.vue';
import BtcTransactionList from '../BtcTransactionList.vue';
import UsdcTransactionList from '../UsdcTransactionList.vue';
import UsdtTransactionList from '../UsdtTransactionList.vue';
import MobileActionBar from '../MobileActionBar.vue';
import RenameIcon from '../icons/AccountMenu/RenameIcon.vue';
import RefreshIcon from '../icons/RefreshIcon.vue';
import StakingButton from '../staking/StakingButton.vue';
import TwoLeafStakingIcon from '../icons/Staking/TwoLeafStakingIcon.vue';
import CashlinkButton from '../CashlinkButton.vue';

import { useAccountStore, AccountType } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { usePolygonAddressStore } from '../../stores/PolygonAddress';
import { onboard, rename, swapBridgedUsdcToNative } from '../../hub';
import { useElementResize } from '../../composables/useElementResize';
import { useWindowSize } from '../../composables/useWindowSize';
import { BTC_ADDRESS_GAP, CryptoCurrency, ENV_MAIN } from '../../lib/Constants';
import { checkHistory } from '../../electrum';
import HighFiveIcon from '../icons/HighFiveIcon.vue';
import { useSwapsStore } from '../../stores/Swaps';
import BoxedArrowUpIcon from '../icons/BoxedArrowUpIcon.vue';
import { useConfig } from '../../composables/useConfig';
import {
    calculateFee,
    getPolygonBlockNumber,
    getPolygonClient,
    getConversionSwapContract,
    sendTransaction as sendPolygonTransaction,
} from '../../ethers';
import { POLYGON_BLOCKS_PER_MINUTE } from '../../lib/usdc/OpenGSN';
import { i18n } from '../../i18n/i18n-setup';
import { useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import StakingIcon from '../icons/Staking/StakingIcon.vue';
import { useStakingStore } from '../../stores/Staking';
import { Stablecoin, useAccountSettingsStore } from '../../stores/AccountSettings';
import StakingOverview from '../staking/StakingOverview.vue';

export default defineComponent({
    name: 'address-overview',
    props: {},
    setup() {
        const { activeAccountId, activeCurrency, activeAccountInfo } = useAccountStore();
        const { activeAddressInfo, activeAddress } = useAddressStore();
        const { accountBalance: btcAccountBalance } = useBtcAddressStore();
        const {
            accountUsdcBridgedBalance,
            accountUsdcBalance,
            accountUsdtBridgedBalance,
            addressInfo: usdcAddressInfo,
        } = usePolygonAddressStore();
        const { promoBoxVisible, setPromoBoxVisible } = useSwapsStore();
        const { activeStake, totalAccountStake } = useStakingStore();

        const searchString = ref('');

        const unclaimedCashlinkCount = ref(0);
        const showUnclaimedCashlinkList = ref(false);

        const address$ = ref<HTMLDivElement>(null);
        const addressMasked = ref<boolean>(false);

        const { isMobile, isFullDesktop, width: windowWidth } = useWindowSize();

        useElementResize(address$, () => {
            let addressWidth: number;
            if (isMobile.value) {
                addressWidth = 322;
            } else if (isFullDesktop.value) {
                addressWidth = 396;
            } else {
                addressWidth = 372; // Tablet
            }
            addressMasked.value = address$.value!.clientWidth < addressWidth;
        });

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

        watch(activeAddress, (address, oldAddress) => {
            hideUnclaimedCashlinkList();
            clearSearchString();

            if (address !== oldAddress && promoBoxVisible) {
                setPromoBoxVisible(false);
            }
        });

        watch(activeCurrency, (currency, oldCurrency) => {
            if (currency !== oldCurrency && promoBoxVisible) {
                setPromoBoxVisible(false);
            }
        });

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
            checkHistory(
                addressSet.value.internal,
                [],
                0,
                5,
                console.error, // eslint-disable-line no-console
                true,
            );
        }

        function onTransactionListScroll() {
            if (!promoBoxVisible.value) return;
            setPromoBoxVisible(false);
        }

        function toggleUnclaimedCashlinkList() {
            showUnclaimedCashlinkList.value = !showUnclaimedCashlinkList.value;
        }

        const { config } = useConfig();

        async function convertBridgedUsdcToNative() {
            let relayUrl: string;

            // Note that this is an on-chain swap, with no involvement of Fastspot.
            // eslint-disable-next-line no-async-promise-executor
            const request = new Promise<Omit<SignPolygonTransactionRequest, 'appName'>>(async (resolve, reject) => {
                try {
                    const [client, swapContract] = await Promise.all([
                        getPolygonClient(),
                        getConversionSwapContract(),
                    ]);
                    const fromAddress = usdcAddressInfo.value!.address;

                    const [
                        usdcNonce,
                        forwarderNonce,
                        blockHeight,
                    ] = await Promise.all([
                        client.usdcBridgedToken.nonces(fromAddress) as Promise<BigNumber>,
                        swapContract.getNonce(fromAddress) as Promise<BigNumber>,
                        getPolygonBlockNumber(),
                    ]);

                    // eslint-disable-next-line @typescript-eslint/prefer-as-const
                    const method:/* 'swap' | */'swapWithApproval' = 'swapWithApproval';

                    const {
                        fee,
                        gasLimit,
                        gasPrice,
                        relay,
                    } = await calculateFee(config.polygon.usdc_bridged.tokenContract, method, undefined, swapContract);
                    relayUrl = relay.url;

                    if (fee.toNumber() >= usdcAddressInfo.value!.balanceUsdcBridged!) {
                        reject(new Error(i18n.t(
                            'You do not have enough USDC.e to pay conversion fees ({fee})',
                            { fee: `${fee.toNumber() / 1e6} USDC.e` },
                        ) as string));
                        return;
                    }

                    // Limit swap amount to 100k USDC.e, to not unbalance the pool too much
                    const amount = Math.min(100_000e6, usdcAddressInfo.value!.balanceUsdcBridged! - fee.toNumber());

                    // Only allow 0.5% slippage on mainnet, but up to 5% on testnet
                    const minTargetAmountPercentage = config.environment === ENV_MAIN ? 0.995 : 0.95;

                    const data = swapContract.interface.encodeFunctionData(method, [
                        /* address token */ config.polygon.usdc_bridged.tokenContract,
                        /* uint256 amount */ amount,
                        /* address pool */ config.polygon.usdcConversion.swapPoolContract,
                        /* uint256 targetAmount */ Math.floor(amount * minTargetAmountPercentage),
                        /* uint256 fee */ fee,
                        ...(method === 'swapWithApproval' ? [
                            // // Approve the maximum possible amount so afterwards we can use the `swap` method for
                            // // lower fees
                            // /* uint256 approval */ client.ethers
                            //    .BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
                            /* uint256 approval */ amount + fee.toNumber(),

                            /* bytes32 sigR */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            /* bytes32 sigS */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            /* uint8 sigV */ 0,
                        ] : []),
                    ]);

                    const relayRequest: RelayRequest = {
                        request: {
                            from: fromAddress,
                            to: config.polygon.usdcConversion.swapContract,
                            data,
                            value: '0',
                            nonce: forwarderNonce.toString(),
                            gas: gasLimit.toString(),
                            validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                                .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                        },
                        relayData: {
                            gasPrice: gasPrice.toString(),
                            pctRelayFee: relay.pctRelayFee.toString(),
                            baseRelayFee: relay.baseRelayFee.toString(),
                            relayWorker: relay.relayWorkerAddress,
                            paymaster: config.polygon.usdcConversion.swapContract,
                            paymasterData: '0x',
                            clientId: Math.floor(Math.random() * 1e6).toString(10),
                            forwarder: config.polygon.usdcConversion.swapContract,
                        },
                    };

                    resolve({
                        ...relayRequest,
                        ...(method === 'swapWithApproval' ? {
                            approval: {
                                tokenNonce: usdcNonce.toNumber(),
                            },
                        } : null),
                    });
                } catch (e) {
                    reject(e);
                }
            }).catch((error) => {
                // Trigger alert only after popup closed, as otherwise the popup is visually blocking the alert
                // and the UI seems frozen
                window.setTimeout(() => {
                    alert(error.message); // eslint-disable-line no-alert
                }, 200);
                throw error;
            });

            const signedTransaction = await swapBridgedUsdcToNative(request).catch((error) => {
                // Trigger alert only after popup closed, as otherwise the popup is visually blocking the alert
                // and the UI seems frozen
                window.setTimeout(() => {
                    alert(error.message); // eslint-disable-line no-alert
                }, 200);
                throw error;
            });
            if (!signedTransaction) return false;

            const { relayData, ...relayRequest } = signedTransaction.message;
            const tx = await sendPolygonTransaction(
                config.polygon.usdc_bridged.tokenContract,
                { request: relayRequest as ForwardRequest, relayData },
                signedTransaction.signature,
                relayUrl!,
            ).catch((error) => {
                alert(error.message); // eslint-disable-line no-alert
            });

            if (tx) {
                useUsdcTransactionsStore().addTransactions([tx]);
            }

            return tx;
        }

        function switchStablecoin(event: PointerEvent, stablecoin: Stablecoin) {
            useAccountSettingsStore().setStablecoin(stablecoin);
            useAccountStore().setActiveCurrency(stablecoin);
        }

        const showStakingButton = computed(() => {
            // Hide button for legacy accounts except if they're already staking
            if (activeCurrency.value !== CryptoCurrency.NIM) return false;
            if (!activeAccountInfo.value) return false;
            if (activeAccountInfo.value.type !== AccountType.LEGACY) return true;
            return totalAccountStake.value > 0;
        });

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
            btcAccountBalance,
            accountUsdcBridgedBalance,
            accountUsdcBalance,
            accountUsdtBridgedBalance,
            usdcAddressInfo,
            CryptoCurrency,
            promoBoxVisible,
            setPromoBoxVisible,
            onTransactionListScroll,
            address$,
            addressMasked,
            toggleUnclaimedCashlinkList,
            config,
            convertBridgedUsdcToNative,
            switchStablecoin,
            activeStake,
            windowWidth,
            showStakingButton,
            isMobile,
            RouteName,
        };
    },
    components: {
        ArrowRightSmallIcon,
        InfoCircleSmallIcon,
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
        UsdcTransactionList,
        UsdtTransactionList,
        ArrowLeftIcon,
        MenuDotsIcon,
        MobileActionBar,
        HighFiveIcon,
        BoxedArrowUpIcon,
        UsdcIcon,
        UsdtIcon,
        CashlinkButton,
        StakingButton,
        StakingIcon,
        TwoLeafStakingIcon,
        StakingOverview,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

.address-overview > svg:first-child {
    width: 0px;
    height: 0px;
    position: absolute;
    top: -9999px;
}

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
    position: relative;

    /* Default: 1440px */
    --padding: 4rem;
    --padding-bottom: 6rem;

    @media (max-width: $mediumDesktopBreakpoint) {
        --padding: 3rem;
        --padding-bottom: 5rem;
    }

    @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
        --padding: 1rem;
        --padding-bottom: 2rem;
    }

    @media (min-width: $veryLargeDesktopBreakpoint) {
        --padding: 7rem;
        --padding-bottom: 6rem;
    }

    @media (min-width: $ultraLargeDesktopBreakpoint) {
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
                0px 0.337011px 2px nimiq-blue(0.08),
                0px 1.5px 3px nimiq-blue(0.08),
                0px 4px 16px nimiq-blue(0.11);

            opacity: 0;
            transition: opacity 0.3s var(--nimiq-ease);

            .nq-icon {
                opacity: 0.5;
                transition: opacity 0.3s var(--nimiq-ease);
            }
        }

        > svg {
            width: 10rem;
            height: 10rem;
            margin: 0 0.625rem;
            display: block;

            &.bitcoin {
                color: var(--bitcoin-orange);
            }

            &.usdc {
                color: var(--usdc-blue);
            }

            &.usdt {
                color: var(--usdt-green);
                width: 10.75rem;
                margin: 0 0.25rem;
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

        &.bitcoin, &.usdc, &.usdt {
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

        &::after {
            /* Preload the 500 weight by using it, hidden */
            content: "preload";
            font-weight: 500;
            position: absolute;
            left: -9999px;
            top: -9999px;
            opacity: 0;
            pointer-events: none;
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
    position: relative;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    align-items: center;
    margin: 0 var(--padding) 2rem;
    padding: 0 3rem 0 2rem;

    button { flex-shrink: 0 }

    .vertical-separator {
        background: rgba(31, 35, 72, 0.15);
        border-radius: 2rem;
        width: 1.5px;

        height: 3rem;
        margin-top: 0.625rem;
        margin-bottom: 0.625rem;

        margin-left: 2rem;
        margin-right: .5rem;
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
            margin: 0; // Safari adds margin by default to all buttons
            border-radius: 0.25rem;
            transition: background-color .3s var(--nimiq-ease);
            white-space: nowrap;
            width: 100%;

            svg {
                width: 2.75rem;
                height: 3rem;
                margin: -0.125rem 1rem -0.125rem 0;
                opacity: 0.8;

                &.usdc {
                    color: var(--usdc-blue);
                    opacity: 1;
                }

                &.usdt {
                    color: var(--usdt-green);
                    opacity: 1;
                }
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

.bridged-usdc-notice {
    background: var(--nimiq-highlight-bg);
    border-radius: 1.25rem;
    padding: 2rem;
    margin: 2rem calc(var(--padding) + 3rem) 0 calc(var(--padding) + 2rem);
    font-size: var(--body-size);
    font-weight: 600;

    .flex-row {
        gap: 1rem;
        align-items: center;

        + .flex-row {
            margin-top: 1.5rem;
            justify-content: space-between;
        }
    }

    svg.usdc {
        width: 3rem;
        height: 3rem;
    }

    .amount {
        font-weight: bold;
    }

    .description {
        font-size: var(--small-size);
        opacity: 0.6;

        svg {
            display: inline;
            width: 2rem;
            height: 2rem;
            vertical-align: text-top;
            margin-top: 0.125rem;
            margin-right: 0.5rem;
        }

        .nq-link {
            color: inherit;
            text-decoration: underline;
        }
    }

    .nq-button-pill {
        white-space: nowrap;
    }
}

.staking-button {
    margin-left: 1rem;
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

.staking-preview {
    margin-left: 1.5rem;
}

.send {
    margin-left: 1.5rem;

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

.transaction-list {
    flex-grow: 1;
}

.promo-box {
    @include blue-tooltip(bottom);
    @include blue-tooltip_open(bottom);
    --blueTooltipPadding: 2rem;

    align-items: flex-start;
    position: absolute;
    width: 25.625rem;
    border-radius: 0.75rem;
    padding-top: 1.5rem;

    --promoBoxTop: 37rem;
    --promoBoxLeft: 14.5rem;

    top: calc(var(--promoBoxTop) + var(--padding) + var(--padding-bottom));
    left: calc(var(--promoBoxLeft) + var(--padding));

    div.flex-row {
        align-items: center;
        justify-content: flex-start;

        .nq-h2 {
            font-size: 16px;
            margin: 0;
            line-height: 130%;
        }

        svg {
            width: auto;
            height: 35px;
            flex-shrink: 0;
        }
    }

    // ul {
        // padding-left: 2.25rem;
        // margin: 0;

        // li {
        //     padding-top: 1.5rem;

        //     svg.nq-icon {
        //         margin-right: 1rem;
        //     }

        //     &.flex-row {
        //         margin-left: -2.25rem;
        //         list-style-type: none;
        //         position: relative;
        //         align-items: flex-start;

        //         .nq-icon {
        //             opacity: .7;
        //             width: 12px;
        //             height: auto;
        //             padding-top: 6px;
        //         }

        //         .nq-button-s {
        //             font-size: 14px;
        //             line-height: 18px;
        //             margin-left: 2rem;

        //             &:hover,
        //             &:focus,
        //             &:active {
        //                 color: white;
        //             }

        //             svg {
        //                 width: 15px;
        //                 height: auto;
        //             }
        //         }
        //     }

        //     &::marker {
        //         color: rgba(white, .7);
        //         transform: translateX(2px);
        //         font-size: 12px;
        //     }
        // }
    // }

    p, li {
        font-size: 14px;
        color: rgba(white, 0.8);
        font-weight: 600;
    }

    // .cross-close-button {
        // position: absolute;
        // top: 1rem;
        // right: 1rem;
        // opacity: .7;
    // }

    a.nq-button-s {
        flex-grow: 0;
        align-items: center;
        svg {
            margin-right: 1rem;
        }
    }

    &.fadeY-enter-active, &.fadeY-leave-active {
        will-change: opacity, transform;
        transition: {
            property: opacity, transform;
            duration: 200ms;
            timing-function: cubic-bezier(0.5, 0, 0.15, 1);
        }
    }

    &.fadeY-leave,
    &.fadeY-enter-to {
        transform: translateY(0) translateX(-50%);
    }

    &.fadeY-enter,
    &.fadeY-leave-to {
        opacity: 0;
        transform: translateY(1rem) translateX(-50%);
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .address-overview {
        position: relative;
    }

    .staking-preview-mobile {
        display: flex;
        margin: 1rem 2rem -0.5rem 2rem;
        position: relative;
        z-index: 1000;
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

            ::v-deep svg {
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

                &.usdt {
                    width: 5.25rem;
                    margin: 0 0.25rem;
                }
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

        .label {
            &.bitcoin, &.usdc, &.usdt {
                top: 0.625rem;
            }
        }

        .address,
        .fiat-amount {
            font-size: var(--small-size);
        }
    }

    .native-usdc-notice {
        margin: 0 calc(var(--padding) + 1rem);
    }

    .mobile-action-bar {
        margin: 0;
        box-shadow:
            0px 0px 4.12454px nimiq-blue(0.031357),
            0px 0px 12.5187px nimiq-blue(0.045),
            0px 0px 32.0004px nimiq-blue(0.058643),
            0px 0px 80px nimiq-blue(0.07);
    }

    .promo-box {
        top: 35rem;
        left: 15rem;

        &::after {
            left: 40%;
        }
    }
}
.justify-between {
    justify-content: space-between;
}
.w-full {
    width: 100%;
}
.ml-auto {
    margin-left: auto;
}
</style>
