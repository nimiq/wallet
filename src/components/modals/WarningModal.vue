<template>
    <Modal ref="modal$" class="warning-modal" :class="color" :closeButtonInverse="!!color">
        <PageHeader :backArrow="backArrow !== undefined ? backArrow : !!$route.params.canUserGoBack" @back="back">
            {{ title }}
            <template v-if="subtitle" #more>
                <div class="subtitle">{{ subtitle }}</div>
            </template>
        </PageHeader>
        <PageBody class="flex-column">
            <div v-if="$slots.icon || icon !== 'none'" class="icon">
                <slot name="icon">
                    <MaintenanceIcon v-if="icon === 'maintenance'"/>
                    <AlertTriangleIcon v-else-if="icon === 'warning'"/>
                </slot>
            </div>
            <slot>
                <p v-if="message" class="nq-text">{{ message }}</p>
            </slot>
            <a v-if="link" class="nq-link" :href="link" target="_blank" rel="noopener">
                {{ linkLabel || $t('See latest updates') }}
            </a>
        </PageBody>
        <PageFooter>
            <button class="nq-button" :class="buttonClasses" @click="close" @mousedown.prevent>
                {{ closeLabel || $t('Ok') }}
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { CreateElement } from 'vue';
import { computed, defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter, AlertTriangleIcon } from '@nimiq/vue-components';
import { useRouter } from '@/router';
import Modal, { disableNextModalTransition } from './Modal.vue';
import MaintenanceIcon from '../icons/MaintenanceIcon.vue';

/** Colors which have a nq-<color>-bg background class and a matching nq-button.<color> modifier. */
export const WarningModalColors = ['orange', 'red', 'gold', 'green', 'light-blue'] as const;
export type WarningModalColor = typeof WarningModalColors[number];
export const WarningModalIcons = ['maintenance', 'warning', 'none'] as const;
export type WarningModalIcon = typeof WarningModalIcons[number];

export interface WarningModalProps {
    title: string;
    /** Additional, smaller text below the title. */
    subtitle?: string;
    /** The message to display. Ignored if the default slot is overwritten. */
    message?: string;
    /** Url to open for more information, for example a post on X announcing a maintenance. */
    link?: string;
    linkLabel?: string;
    closeLabel?: string;
    /** Background color. Defaults to a regular white modal. */
    color?: WarningModalColor;
    icon?: WarningModalIcon;
    /** Force back arrow on or off. By default, it's shown if the user can go back, see canUserGoBack route param. */
    backArrow?: boolean;
}

const WarningModal = defineComponent({
    name: 'warning-modal',
    props: {
        title: {
            type: String,
            required: true,
        },
        subtitle: String,
        message: String,
        link: String,
        linkLabel: String,
        closeLabel: String,
        color: {
            type: String,
            validator: (color: unknown) => (WarningModalColors as readonly unknown[]).includes(color),
        },
        icon: {
            type: String,
            default: 'maintenance' as WarningModalIcon,
            validator: (icon: unknown) => (WarningModalIcons as readonly unknown[]).includes(icon),
        },
        backArrow: {
            type: Boolean,
            default: undefined, // such that we can fall back to the canUserGoBack route param if it's not set
        },
    },
    setup(props) {
        const router = useRouter();
        const modal$ = ref<Modal>(null);

        // On a colored background, the button is inverted, i.e. white with colored text, as in FlaggedAddressWarning.
        const buttonClasses = computed(() => (props.color ? [props.color, 'inverse'] : ['light-blue']));

        function back() {
            disableNextModalTransition();
            router.back();
        }

        function close() {
            modal$.value!.forceClose();
        }

        return {
            modal$,
            buttonClasses,
            back,
            close,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        AlertTriangleIcon,
        MaintenanceIcon,
    },
});
export default WarningModal;

/**
 * Create a lazily loaded modal displaying a warning or maintenance message, to be used in route definitions in place
 * of the modal for the feature which is currently unavailable, for example:
 *
 * const SwapModal = () => areSwapsUnderMaintenance()
 *     ? import(/* webpackChunkName: "warning-modal" *\/ './components/modals/WarningModal.vue')
 *         .then(({ createWarningModal }) => createWarningModal(() => ({ title: i18n.t('...') as string })))
 *     : import(/* webpackChunkName: "swap-modal" *\/ './components/swap/SwapModal.vue');
 *
 * Only ever import this via a dynamic import as in the example; a static import would pull the modal into the main
 * bundle. The props are passed as a factory, such that translations are only evaluated at render time, and re-evaluated
 * when the language changes.
 */
export function createWarningModal(props: () => WarningModalProps) {
    return {
        name: 'bound-warning-modal', // name matching /modal/i, see Modal's forceClose
        inheritAttrs: false, // route props like requestUri are not props of the WarningModal and must not be rendered
        render: (createElement: CreateElement) => createElement(WarningModal, { props: { ...props() } }),
    };
}
</script>

<style lang="scss" scoped>
.modal ::v-deep .small-page {
    height: auto;
    min-height: unset;
}

// The close button in the header is redundant with the close button in the footer.
.modal ::v-deep .close-button {
    display: none;
}

.subtitle {
    font-size: var(--body-size);
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1.5rem;
    opacity: .6;
}

.page-body {
    align-items: center;
    justify-content: center;
    padding: 1rem 4rem 2rem;
}

.icon {
    flex-shrink: 0;
    margin-bottom: 3rem;
    color: var(--text-30);

    ::v-deep svg {
        display: block;
        width: 16rem;
        height: 16rem;
        fill: currentColor;
    }
}

.nq-text {
    margin: 0;
    text-align: center;
    text-wrap: balance;
    color: inherit;
}

.nq-link {
    margin-top: 2rem;
    text-align: center;
    font-weight: 600;
    font-size: var(--link-size);
}

@each $color in ('orange', 'red', 'gold', 'green', 'light-blue') {
    .warning-modal.#{$color} {
        ::v-deep .small-page {
            background: var(--nimiq-#{$color});
            background-image: var(--nimiq-#{$color}-bg);
            color: white;
        }

        ::v-deep .nq-h1 {
            color: inherit;
        }

        .icon {
            color: rgba(255, 255, 255, .7);
        }

        .nq-link {
            color: inherit;
            opacity: .6;
            transition: opacity .3s var(--nimiq-ease);

            &:hover,
            &:focus {
                opacity: 1;
            }
        }
    }
}
</style>
