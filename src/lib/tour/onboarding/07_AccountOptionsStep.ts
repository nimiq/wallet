import { searchComponentByName, WalletHTMLElements } from '..';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getAccountOptionsStep(
    { isSmallScreen, isLargeScreen, sleep, root }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    const onClickBackdrop = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
    };
    const toggleBackdropInteractivity = async (allow: boolean) => {
        const backdrop = document.querySelector(WalletHTMLElements.MODAL_CONTAINER) as HTMLDivElement;
        const action = allow ? 'addEventListener' : 'removeEventListener';

        backdrop[action]('click', onClickBackdrop, true);
        await root.$nextTick();
    };

    const ui: TourStep['ui'] = {
        fadedElements: [
            WalletHTMLElements.SIDEBAR_TESTNET,
            WalletHTMLElements.SIDEBAR_LOGO,
            WalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            WalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            WalletHTMLElements.SIDEBAR_NETWORK,
            WalletHTMLElements.SIDEBAR_SETTINGS,
            WalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            WalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
            WalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            WalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            WalletHTMLElements.ADDRESS_OVERVIEW,
        ],
        disabledButtons: [
            WalletHTMLElements.BUTTON_SIDEBAR_BUY,
            WalletHTMLElements.BUTTON_SIDEBAR_SELL,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
    };

    const mountedNotLargeScreens = async () => {
        // TODO check if this is valid
        const sidebar = (document.querySelector('.column-sidebar') as HTMLDivElement);
        sidebar!.removeAttribute('data-non-interactable');
        await root.$nextTick();

        const backdrop = document.querySelector(WalletHTMLElements.MODAL_CONTAINER) as HTMLDivElement;
        backdrop.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        }, { capture: true });

        return async () => {
            const closeBtn = (document.querySelector(WalletHTMLElements.MODAL_CLOSE_BUTTON) as HTMLDivElement);
            closeBtn.click();
            await sleep(200); // TODO Check this random value
        };
    };
    const mountedLargeScreens = async () => {
        await toggleBackdropInteractivity(true);
        return async () => {
            const accountMenu = searchComponentByName(root, 'account-menu') as any;
            if (!accountMenu) return;
            if ('closeMenu' in accountMenu) accountMenu.closeMenu();

            await toggleBackdropInteractivity(false);
            await sleep(400);
        };
    };

    return {
        path: isLargeScreen.value ? '/' : '/?sidebar=true',
        tooltip: {
            target: WalletHTMLElements.MODAL_PAGE,
            content: onboardingTexts[OnboardingTourStep.ACCOUNT_OPTIONS].default,
            params: {
                placement: isSmallScreen.value ? 'top' : 'right',
            },
        },
        ui,
        lifecycle: {
            created: async () => {
                await sleep(isLargeScreen.value ? 300 : 500); // TODO Check this random value
                const account = document.querySelector(WalletHTMLElements.SIDEBAR_ACCOUNT_MENU) as HTMLButtonElement;
                account.click();
                if (!isLargeScreen.value) {
                    await sleep(500); // TODO Check this random value
                }
            },
            mounted: isLargeScreen.value ? mountedLargeScreens : mountedNotLargeScreens,
        },
    } as TourStep;
}
