import VueRouter from 'vue-router';
import { useStakingStore } from '@/stores/Staking';
import { demoNimAddress } from './DemoConstants';
import { createStakeTransaction, transformNimTransaction, insertFakeNimTransactions } from './DemoTransactions';

/**
 * Observes the staking modal and prevents from validating the info and instead fakes the staking process.
 */
export function replaceBuyNimFlow(demoRouter: VueRouter): void {
    let observedTarget: HTMLDivElement | undefined;

    demoRouter.afterEach((to) => {
        if (to.path.startsWith('/')) {
            const targetSelector = '.sidebar .trade-actions';
            const checkForTradeActions = setInterval(() => {
                const target = document.querySelector(targetSelector) as HTMLDivElement;
                if (!target || target === observedTarget) return;
                observedTarget = target;

                target.innerHTML = '';

                const btn1 = document.createElement('button');
                btn1.className = 'nq-button-s inverse';
                btn1.style.flex = '1';
                btn1.addEventListener('click', () => {
                    demoRouter.push({
                        path: '/demo-buy',
                    });
                });
                btn1.innerHTML = 'Buy';

                const btn2 = document.createElement('button');
                btn2.className = 'nq-button-s inverse';
                btn2.style.flex = '1';
                btn2.disabled = true;
                btn2.innerHTML = 'Sell';

                target.appendChild(btn1);
                target.appendChild(btn2);
            }, 500);

            // Clear interval when navigating away
            demoRouter.afterEach((nextTo) => {
                if (!nextTo.path.startsWith('/')) {
                    clearInterval(checkForTradeActions);
                    observedTarget = undefined;
                }
            });
        }
    });
}

/**
 * Replaces the swap button with a demo version that opens the actual swap modal with demo functionality.
 */
export function replaceSwapFlow(demoRouter: VueRouter): void {
    let lastProcessedButton: HTMLButtonElement;

    demoRouter.afterEach(() => {
        const checkForSwapButton = setInterval(() => {
            const target = document.querySelector('.sidebar .swap-tooltip button');
            if (!target || target === lastProcessedButton) return;

            // remove previous listeners by cloning the element and replacing the original
            const newElement = target.cloneNode(true) as HTMLButtonElement;
            target.parentNode!.replaceChild(newElement, target);
            newElement.removeAttribute('disabled');
            lastProcessedButton = newElement;

            newElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                demoRouter.push({
                    path: '/swap/NIM-BTC',
                });
            });
        }, 500);

        // Clear interval when navigating away (though we want this to persist)
        setTimeout(() => clearInterval(checkForSwapButton), 30000); // Stop after 30 seconds to avoid memory leaks
    });
}

/**
 * Observes the staking modal and prevents from validating the info and instead fakes the staking process.
 */
export function replaceStakingFlow(demoRouter: VueRouter): void {
    let lastProcessedButton: HTMLButtonElement;

    demoRouter.afterEach((to) => {
        if (to.path === '/staking') {
            const checkForStakeButton = setInterval(() => {
                const target = document.querySelector('.stake-graph-page .stake-button');
                if (!target || target === lastProcessedButton) return;

                // remove previous listeners by cloning the element and replacing the original
                const newElement = target.cloneNode(true) as HTMLButtonElement;
                target.parentNode!.replaceChild(newElement, target);
                newElement.removeAttribute('disabled');
                lastProcessedButton = newElement;

                newElement.addEventListener('click', async () => {
                    const { setStake } = useStakingStore();
                    const { activeValidator } = useStakingStore();
                    const amountInput = document.querySelector('.nq-input') as HTMLInputElement;
                    const amount = Number.parseFloat(amountInput.value.replaceAll(/[^\d]/g, '')) * 1e5;

                    const { address: validatorAddress } = activeValidator.value!;

                    demoRouter.push({
                        path: '/',
                    });

                    await new Promise<void>((resolve) => { window.setTimeout(resolve, 100); });
                    setStake({
                        activeBalance: 0,
                        inactiveBalance: amount,
                        address: demoNimAddress,
                        retiredBalance: 0,
                        validator: validatorAddress,
                    });

                    const stakeTx = createStakeTransaction(amount, validatorAddress);
                    insertFakeNimTransactions(transformNimTransaction([stakeTx]));
                });
            }, 500);

            // Clear interval when navigating away
            demoRouter.afterEach((nextTo) => {
                if (nextTo.path !== '/staking') {
                    clearInterval(checkForStakeButton);
                }
            });
        }
    });
}
