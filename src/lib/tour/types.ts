import { useWindowSize } from '@/composables/useWindowSize';
import { SetupContext } from '@vue/composition-api';

export type TourName = 'onboarding' | 'network'

export enum OnboardingTourStep {
    FIRST_ADDRESS,
    TRANSACTIONS_LIST,
    FIRST_TRANSACTION,
    BITCOIN_ADDRESS,
    WALLET_BALANCE,
    BACKUP_ALERT,
    MENU_ICON,
    ACCOUNT_OPTIONS,
    ONBOARDING_COMPLETED,
    BI
}

export enum NetworkTourStep {
    TODO,
}

export type TourStepIndex = OnboardingTourStep | NetworkTourStep;

// eslint-disable-next-line max-len
// https://github.com/floating-ui/floating-ui/blob/59d15d4f81a2d71d9b42d836e47d7114bc32f7f2/packages/core/src/types.ts#L4
type Alignment = 'start' | 'end';
type BasePlacement = 'top' | 'right' | 'bottom' | 'left';
type AlignedPlacement = `${BasePlacement}-${Alignment}`;
export type Placement = BasePlacement | AlignedPlacement;

export interface LifecycleArgs {
    goToNextStep: () => void;
    goingForward: boolean;
}

export type MountedReturnFn = ((args?: { goingForward: boolean, ending?: boolean }) => Promise<void> | void);

export interface TourStep {
    path: '/' | '/transactions' | '/?sidebar=true' | '/network';

    // data for the steps of v-tour
    tooltip: {
        target: string,
        content: string[],
        params: {
            placement: BasePlacement | AlignedPlacement,
        },
        button?: {
            text: string,
            fn: () => void,
        },
    };

    lifecycle?: {
        created?: (args: LifecycleArgs) => Promise<void> | void,
        mounted?: (args: LifecycleArgs) => MountedReturnFn | Promise<MountedReturnFn | void> | void,
    };

    ui: {
        // Elements that must have opacity to focus attention in other elements in screen
        fadedElements?: string[], // array of selectors

        // Elements that shouldn't allow interactivity
        disabledElements?: string[], // array of selectors

        isNextStepDisabled?: boolean,
    };
}

export type TourSteps<T extends number> = {
    [x in T]?: TourStep;
};

export type GetStepFnArgs<T extends number> =
    Pick<ReturnType<typeof useWindowSize>, 'isMobile' | 'isTablet' | 'isFullDesktop'> &
    {
        root: SetupContext['root'],
        steps: TourSteps<T>,
        toggleDisabledAttribute: (selector: string, disabled: boolean) => Promise<void>,
        sleep: (ms: number) => Promise<unknown>,
    };
