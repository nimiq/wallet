<template>
    <Modal class="moonpay-modal">
        <header class="flex-row">
            <Tooltip preferredPosition="bottom right">
                <InfoCircleSmallIcon slot="trigger"/>
                <i18n path="This service is operated by {link}" tag="span">
                    <a slot="link" href="https://moonpay.com" target="_blank" rel="noopener">moonpay.com</a>
                </i18n>
            </Tooltip>
            <img src="../../assets/exchanges/moonpay-full.svg" alt="Moonpay Logo">
            <div class="flex-spacer"></div>
        </header>
        <div class="separator"></div>
        <div class="widget-container flex-column flex-grow" id="moonpay-widget-container">
            <span v-if="!widgetReady" class="placeholder">{{ $t('Loading Moonpay...') }}</span>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
import { SignBtcTransactionRequest } from '@nimiq/hub-api';
import Modal from './Modal.vue';
import { useSettingsStore } from '../../stores/Settings';
import { useFiatStore } from '../../stores/Fiat';
import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useBtcLabelsStore } from '../../stores/BtcLabels';
import { usePolygonAddressStore } from '../../stores/PolygonAddress';
import { useUsdcContactsStore } from '../../stores/UsdcContacts';
import { useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import { useUsdtContactsStore } from '../../stores/UsdtContacts';
import { useUsdtTransactionsStore } from '../../stores/UsdtTransactions';
import { useConfig } from '../../composables/useConfig';
import { loadScript } from '../../lib/ScriptLoader';
import { CryptoCurrency, ENV_MAIN, FiatCurrency } from '../../lib/Constants';

import { getElectrumClient } from '../../electrum';
import {
    estimateFees as estimateBitcoinFees,
    selectOutputs as selectBitcoinOutputs,
    normalizeAddress as normalizeBitcoinAddress,
} from '../../lib/BitcoinTransactionUtils';

import { loadEthersLibrary } from '../../ethers';

import { sendBtcTransaction, sendPolygonTransaction } from '../../hub';
import { useAccountSettingsStore } from '../../stores/AccountSettings';

declare global {
    interface Window {
        MoonPayWebSdk: any;
    }
}

type InitiateDepositProperties = {
    transactionId: string,
    cryptoCurrency: {
        id: string,
        name: string,
        code: CryptoCurrency | 'usdc_polygon' | 'usdt_polygon',
        contractAddress: string | null,
        chainId: string | null,
        coinType: string,
        networkCode: string,
    },
    fiatCurrency: {
        id: string,
        name: string,
        code: FiatCurrency,
    },
    cryptoCurrencyAmount: string,
    cryptoCurrencyAmountSmallestDenomination: string,
    fiatCurrencyAmount: string | null,
    depositWalletAddress: string,
};

export default defineComponent({
    props: {
        flow: {
            type: String as () => 'buy' | 'sell',
            default: 'buy' as const,
            // validator: val => ['buy', 'sell'].includes(val), // Adding this breaks type-inference for props
        },
    },
    setup(props) {
        const { config } = useConfig();
        const { language } = useSettingsStore().state;
        const baseCurrencyCode = useFiatStore().state.currency;
        type MoonpayCurrencyCode = CryptoCurrency | 'usdc_polygon' | 'usdt_polygon';
        let defaultCurrencyCode: MoonpayCurrencyCode = useAccountStore().state.activeCurrency;
        if (defaultCurrencyCode === CryptoCurrency.NIM && config.disableNetworkInteraction) {
            defaultCurrencyCode = CryptoCurrency.BTC;
        }
        if (defaultCurrencyCode === CryptoCurrency.USDC) defaultCurrencyCode = 'usdc_polygon';
        if (defaultCurrencyCode === CryptoCurrency.USDT) defaultCurrencyCode = 'usdt_polygon';

        const nimAddress = !config.disableNetworkInteraction
            // Remove spaces in NIM address, as spaces are invalid URI components
            ? useAddressStore().state.activeAddress?.replace(/\s/g, '')
            : undefined;

        // Having a BTC address must be optional, so that the widget also works
        // for legacy or non-bitcoin-activated accounts.
        const btcAddress = useBtcAddressStore().availableExternalAddresses.value[0] as string | undefined;

        const { stablecoin } = useAccountSettingsStore();

        // Having a USDC address must be optional, so that the widget also works
        // for legacy or non-polygon-activated accounts.
        const usdcAddress = stablecoin.value === CryptoCurrency.USDC
            ? usePolygonAddressStore().activeAddress.value
            : undefined;

        // Having a USDT address must be optional, so that the widget also works
        // for legacy or non-polygon-activated accounts.
        const usdtAddress = stablecoin.value === CryptoCurrency.USDT
            ? usePolygonAddressStore().activeAddress.value
            : undefined;

        const walletAddresses = {
            ...(nimAddress ? { nim: nimAddress } : {}),
            ...(btcAddress ? { btc: btcAddress } : {}),
            ...(usdcAddress ? { usdc_polygon: usdcAddress } : {}),
            ...(usdtAddress ? { usdt_polygon: usdtAddress } : {}),
        };

        const widgetReady = ref(false);

        let widget: any;

        onMounted(async () => {
            await loadScript('MoonPayWebSdk', 'https://static.moonpay.com/web-sdk/v1/moonpay-web-sdk.min.js');

            widget = window.MoonPayWebSdk.init({
                debug: config.environment !== ENV_MAIN,
                flow: props.flow,
                environment: config.environment === ENV_MAIN ? 'production' : 'sandbox',
                variant: 'embedded',
                containerNodeSelector: '#moonpay-widget-container',
                params: {
                    apiKey: config.moonpay.clientApiKey,
                    colorCode: '#0582CA',
                    language,
                    ...(props.flow === 'buy' ? {
                        baseCurrencyCode,
                        defaultCurrencyCode,
                        walletAddresses: JSON.stringify(walletAddresses),
                    } : {}),
                    ...(props.flow === 'sell' ? {
                        defaultBaseCurrencyCode: defaultCurrencyCode,
                        quoteCurrencyCode: baseCurrencyCode,
                        refundWalletAddresses: JSON.stringify(walletAddresses),
                    } : {}),
                },
                ...(props.flow === 'sell' ? {
                    handlers: {
                        async onInitiateDeposit(properties: InitiateDepositProperties) {
                            console.debug({ properties }); // eslint-disable-line no-console

                            if (properties.cryptoCurrency.code === CryptoCurrency.BTC) {
                                useAccountStore().setActiveCurrency(CryptoCurrency.BTC);
                                sendBitcoin(properties);
                            } else if (properties.cryptoCurrency.code === 'usdc_polygon') {
                                useAccountStore().setActiveCurrency(CryptoCurrency.USDC);
                                sendUsdc(properties);
                            } else if (properties.cryptoCurrency.code === 'usdt_polygon') {
                                useAccountStore().setActiveCurrency(CryptoCurrency.USDT);
                                sendUsdt(properties);
                            }
                        },
                    },
                } : {}),
            });

            const widgetUrl = widget.generateUrlForSigning();

            const signature = await fetch(config.moonpay.signatureEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: widgetUrl,
                }),
            }).then((response) => response.text());

            widget.updateSignature(signature);

            widget.show();
            widgetReady.value = true;
        });

        onBeforeUnmount(() => widget && widget.close());

        async function sendBitcoin(properties: InitiateDepositProperties) {
            try {
                // eslint-disable-next-line no-async-promise-executor
                const request = new Promise<Omit<SignBtcTransactionRequest, 'appName'>>(async (resolve) => {
                    const { accountUtxos, accountBalance } = useBtcAddressStore();

                    const client = await getElectrumClient();
                    await client.waitForConsensusEstablished();

                    const value = parseInt(properties.cryptoCurrencyAmountSmallestDenomination, 10);

                    const fees = await client.estimateFees([1]);
                    const feePerByte = fees[1] || 3;
                    const requiredInputs = selectBitcoinOutputs(accountUtxos.value, value, feePerByte);

                    const fee = estimateBitcoinFees(
                        requiredInputs.utxos.length,
                        requiredInputs.changeAmount > 0 ? 2 : 1,
                        feePerByte,
                    );

                    if (accountBalance.value < value + fee) {
                        throw new Error('Insufficient BTC balance to send the amount plus fees');
                    }

                    let changeAddress: string | undefined;
                    if (requiredInputs.changeAmount > 0) {
                        const { nextChangeAddress } = useBtcAddressStore();
                        if (!nextChangeAddress.value) {
                            // FIXME: If no unused change address is found,
                            //        need to request new ones from Hub!
                            throw new Error('No more unused change addresses)');
                        }
                        changeAddress = nextChangeAddress.value;
                    }

                    resolve({
                        accountId: useAccountStore().state.activeAccountId!,
                        inputs: requiredInputs.utxos.map((utxo) => ({
                            address: utxo.address,
                            transactionHash: utxo.transactionHash,
                            outputIndex: utxo.index,
                            outputScript: utxo.witness.script,
                            value: utxo.witness.value,
                        })),
                        output: {
                            address: normalizeBitcoinAddress(properties.depositWalletAddress),
                            label: 'Moonpay',
                            value,
                        },
                        ...(requiredInputs.changeAmount > 0 ? {
                            changeOutput: {
                                address: changeAddress!,
                                value: requiredInputs.changeAmount,
                            },
                        } : {}),
                    });
                });

                const plainTx = await sendBtcTransaction(request);

                if (!plainTx) {
                    throw new Error('Failed to sign and/or send BTC transaction');
                }

                useBtcLabelsStore().setRecipientLabel(plainTx.outputs[0].address!, 'Moonpay');
            } catch (error) {
                console.error(error); // eslint-disable-line no-console
                alert(`Something went wrong: ${(error as Error).message}`); // eslint-disable-line no-alert
            }
        }

        async function sendUsdc(properties: InitiateDepositProperties) {
            try {
                const ethers = await loadEthersLibrary();
                const normalizedDepositAddress = ethers.utils.getAddress(properties.depositWalletAddress);
                const value = parseInt(properties.cryptoCurrencyAmountSmallestDenomination, 10);

                // Validate that we are talking about the same USDC
                if (
                    !properties.cryptoCurrency.chainId
                    || parseInt(properties.cryptoCurrency.chainId, 10) !== config.polygon.networkId
                ) {
                    throw new Error('Invalid network ID given by Moonpay');
                }

                const { tokenContract } = config.polygon.usdt_bridged;

                if (properties.cryptoCurrency.contractAddress !== tokenContract.toLowerCase()) {
                    throw new Error('Invalid USDC contract address given by Moonpay');
                }

                const { accountUsdcBalance } = usePolygonAddressStore();
                // TODO: Preselect a relay to be able to check balance against the fee as well
                if (accountUsdcBalance.value < value) {
                    throw new Error('Insufficient USDC balance');
                }

                const tx = await sendPolygonTransaction(
                    tokenContract,
                    normalizedDepositAddress,
                    value,
                    'Moonpay',
                    // relay,
                );

                if (!tx) {
                    throw new Error('Failed to sign and/or send USDC transaction');
                }

                useUsdcContactsStore().setContact(normalizedDepositAddress, 'Moonpay');

                useUsdcTransactionsStore().addTransactions([tx]);
            } catch (error) {
                console.error(error); // eslint-disable-line no-console
                // eslint-disable-next-line no-alert
                alert(`Something went wrong: ${(error as Error).message.split(' req={')[0]}`);
            }
        }

        async function sendUsdt(properties: InitiateDepositProperties) {
            try {
                const ethers = await loadEthersLibrary();
                const normalizedDepositAddress = ethers.utils.getAddress(properties.depositWalletAddress);
                const value = parseInt(properties.cryptoCurrencyAmountSmallestDenomination, 10);

                // Validate that we are talking about the same USDT
                if (
                    !properties.cryptoCurrency.chainId
                    || parseInt(properties.cryptoCurrency.chainId, 10) !== config.polygon.networkId
                ) {
                    throw new Error('Invalid network ID given by Moonpay');
                }

                const { tokenContract } = config.polygon.usdt_bridged;

                if (properties.cryptoCurrency.contractAddress !== tokenContract.toLowerCase()) {
                    throw new Error('Invalid USDT contract address given by Moonpay');
                }

                const { accountUsdtBridgedBalance } = usePolygonAddressStore();
                // TODO: Preselect a relay to be able to check balance against the fee as well
                if (accountUsdtBridgedBalance.value < value) {
                    throw new Error('Insufficient USDT balance');
                }

                const tx = await sendPolygonTransaction(
                    tokenContract,
                    normalizedDepositAddress,
                    value,
                    'Moonpay',
                    // relay,
                );

                if (!tx) {
                    throw new Error('Failed to sign and/or send USDT transaction');
                }

                useUsdtContactsStore().setContact(normalizedDepositAddress, 'Moonpay');

                useUsdtTransactionsStore().addTransactions([tx]);
            } catch (error) {
                console.error(error); // eslint-disable-line no-console
                // eslint-disable-next-line no-alert
                alert(`Something went wrong: ${(error as Error).message.split(' req={')[0]}`);
            }
        }

        return {
            widgetReady,
        };
    },
    components: {
        Modal,
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.modal ::v-deep .small-page {
    height: 83.25rem; /* Height to fit Moonpay confirmation page without iframe scrollbar, with two-line disclaimer */
}

header {
    justify-content: space-between;
    align-items: center;
    padding: 2rem 3rem;

    .tooltip ::v-deep {
        .trigger {
            color: var(--text-30);
        }

        .tooltip-box {
            font-size: var(--small-size);
            width: 23.5rem;

            a {
                color: inherit;
            }
        }
    }

    img {
        width: 18rem;
    }

    .flex-spacer {
        width: 2.25rem;
    }
}

.separator {
    height: 2px;
    margin: -2px 2rem 2px;
    box-shadow: 0 1.5px 0 0 var(--text-14);
}

.widget-container {
    justify-content: center;
    align-items: center;

    .placeholder {
        font-weight: bold;
        font-size: var(--small-size);
        opacity: 0.5;
    }

    ::v-deep iframe {
        border: none;
        border-bottom-left-radius: 1.25rem;
        border-bottom-right-radius: 1.25rem;
    }
}
</style>
