import { onUnmounted, Ref, watch } from 'vue';
import { getHtlc, SettlementInfo, SettlementStatus } from '@nimiq/oasis-api';
import { SwapAsset } from '@nimiq/fastspot-api';
import { SwapData, SwapEurData, useSwapsStore } from '../stores/Swaps';

// TODO: Remove logging when stable
/* eslint-disable no-console */

export function useOasisPayoutStatusUpdater(swapData: Ref<SwapData | null>) {
    let oasisPayoutCheckTimeout: number | null = null;

    async function checkOasisPayoutStatus() {
        console.log('Running checkOasisPayoutStatus');
        if (oasisPayoutCheckTimeout) {
            console.log('Already running, bailing out');
            return;
        }

        const data = swapData.value as SwapEurData;
        const settlement = data.htlc!.settlement!;

        // Determine check interval
        const checkInterval = !settlement.eta || settlement.eta - Date.now() < 5 * 60 * 1000
            ? 30 * 1000 // If no ETA, or ETA is in less than 5 minutes, check every 30 seconds
            : 30 * 60 * 1000; // Otherwise check every 30 minutes
        console.log('Check interval determined as', checkInterval / 1000, 'seconds');

        // If enough passed since last check, query HTLC status now
        if (Date.now() - settlement.lastUpdated! >= checkInterval) {
            oasisPayoutCheckTimeout = 1; // Ensure no parallel executions
            console.log('Fetching HTLC now');

            const htlc = await getHtlc(data.htlc!.id);
            console.log('Got HTLC:', htlc);

            settlement.status = htlc.settlement.status;
            if (htlc.settlement.status === SettlementStatus.ACCEPTED) {
                const details = (htlc.settlement as SettlementInfo<SettlementStatus.ACCEPTED>).detail;
                if (details && details.eta) {
                    settlement.eta = new Date(details.eta).getTime();
                }
                settlement.lastUpdated = Date.now();
            }
            useSwapsStore().addSettlementData(htlc.hash.value, data);
            console.log('HTLC settlement status is', settlement.status);
            console.log('Updated swap store with', data);
        }

        if (settlement.status !== SettlementStatus.ACCEPTED) {
            // Stop checks
            console.log('Payout', settlement.status, ', stopping checks');
            return;
        }

        // Schedule next check
        oasisPayoutCheckTimeout = window.setTimeout(() => {
            oasisPayoutCheckTimeout = null;
            checkOasisPayoutStatus();
        }, checkInterval - (Date.now() - settlement.lastUpdated!));
        console.log(
            'Scheduled next check in',
            (checkInterval - (Date.now() - settlement.lastUpdated!)) / 1000,
            'seconds',
        );
    }

    function stop() {
        if (oasisPayoutCheckTimeout) {
            console.log('Stopping check');
            window.clearTimeout(oasisPayoutCheckTimeout);
            oasisPayoutCheckTimeout = null;
        }
    }

    watch(swapData, (data, previousData) => { // eslint-disable-line consistent-return
        if (previousData?.asset === SwapAsset.EUR) {
            stop();
        }
        if (data?.asset !== SwapAsset.EUR) return stop();
        if (data.htlc?.settlement?.status !== SettlementStatus.ACCEPTED) return stop();
        if (oasisPayoutCheckTimeout) return; // eslint-disable-line consistent-return
        checkOasisPayoutStatus();
    });

    onUnmounted(() => {
        stop();
    });
}
