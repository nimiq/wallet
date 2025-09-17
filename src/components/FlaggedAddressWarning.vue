<template>
    <div class="flagged-address-warning flex-column">
        <PageBody class="flex-column nq-orange-bg">
            <AlertTriangleIcon class="alert-triangle-icon"/>
            <label>{{ $t('Flagged Address') }}</label>

            <AddressDisplay v-if="addressFormat !== 'plain'" :address="info.address" :format="addressFormat" copyable/>
            <InteractiveShortAddress v-else
                :address="info.address"
                :displayedCharacters="20"
                tooltipPosition="bottom"
                :offsetTooltipPosition="false"
                tooltipTheme="inverse"
                copyable
            />

            <p class="info nq-text nq-notice">
                {{ $t('It\'s recommendable to abort the transaction.') }}
                {{
                    info.type === 'malicious'
                        ? $t('Your {currency} would most likely be stolen.', { currency: currency.toUpperCase() })
                        : ''
                }}
                <Tooltip :container="this" theme="inverse" autoWidth :margin="{
                    left: Math.min(40, .1 * windowWidth),
                    right: Math.min(40, .1 * windowWidth),
                }">
                    <template #trigger><InfoCircleSmallIcon/></template>
                    <p>{{ $t('Flagged as: {type}', { type: translatedType }) }}</p>
                    <p>{{ $t('Dataset: {name}', { name: info.dataset }) }}</p>
                    <p class="privacy-note">{{
                        $t('Addresses are checked locally on your device and are not sent to an external service.')
                    }}</p>
                </Tooltip>
            </p>

            <button class="nq-button orange inverse" @click="emitAbort" @mousedown.prevent>{{ $t('Abort') }}</button>
            <a class="nq-link" @click="emitContinue">{{ $t('Continue anyway') }}</a>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { PageBody, AddressDisplay, Tooltip, AlertTriangleIcon, InfoCircleSmallIcon } from '@nimiq/vue-components';
import { CryptoCurrency } from '@nimiq/utils';
import { i18n } from '../i18n/i18n-setup';
import { useWindowSize } from '../composables/useWindowSize';
import type { FlaggedAddressInfo } from '../composables/useFlaggedAddressCheck';
import InteractiveShortAddress from './InteractiveShortAddress.vue';

export enum Events {
    ABORT = 'abort',
    CONTINUE = 'continue',
}

export default defineComponent({
    props: {
        info: {
            type: Object as () => FlaggedAddressInfo,
            required: true,
            validator: (info: unknown) => typeof info === 'object' && !!info && 'address' in info && 'type' in info
                && 'dataset' in info && 'chain' in info,
        },
        currency: {
            type: String as () => CryptoCurrency,
            required: true,
        },
    },
    setup(props, { emit }) {
        const { width: windowWidth } = useWindowSize();
        const addressFormat = computed(() => {
            switch (props.info.chain) {
                case CryptoCurrency.NIM: return 'nimiq';
                case 'evm': return 'ethereum';
                default: return 'plain';
            }
        });
        const translatedType = computed(() => ({
            malicious: i18n.t('malicious'),
        }[props.info.type]));

        function emitAbort() {
            emit(Events.ABORT);
        }

        function emitContinue() {
            emit(Events.CONTINUE);
        }

        return {
            windowWidth,
            addressFormat,
            translatedType,
            emitAbort,
            emitContinue,
        };
    },
    components: {
        PageBody,
        AddressDisplay,
        InteractiveShortAddress,
        Tooltip,
        AlertTriangleIcon,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
@import "../scss/variables.scss";

.flagged-address-warning {
    contain: size layout style paint;
    font-size: var(--body-size);
}

.page-body {
    margin: .75rem;
    padding-top: 7rem;
    padding-bottom: 2rem;
    border-radius: .5rem;
    flex-grow: 1;
    justify-content: flex-start;
    align-items: center;
}

.alert-triangle-icon {
    width: 16rem;
    height: 16rem;
    margin-top: auto;
}

label {
    font-size: var(--h1-size);
    font-weight: 600;
    margin: 3rem 0 2.5rem;
    flex-shrink: 0;
    line-height: 6.25rem; // Same height as the LabelInput on recipient-overlay
}

.address-display,
.interactive-short-address {
    contain: layout style; // not paint because Copied tooltip overflows
    padding: 0.5rem;
    margin-bottom: 3.5rem;
    color: rgba(255, 255, 255, .6);

    &:hover,
    &:focus,
    &.copied {
        color: rgba(255, 255, 255, .8) !important;
    }

    ::v-deep .copyable {
        color: inherit !important;
    }

    ::v-deep .background {
        border-radius: 0.625rem;
        background: white;
    }

    ::v-deep .chunk {
        margin: .75rem 0;
    }

    ::v-deep .short-address {
        font-size: 2.5rem;
    }

    ::v-deep .tooltip {
        color: var(--nimiq-orange);

        &,
        &::after {
            background: white;
        }
    }
}

.info {
    contain: layout style; // not paint because tooltip box overflows
    margin-top: 0;
    text-align: center;
    text-wrap: balance;

    .tooltip {
        contain: size layout style; // not paint because tooltip box overflows
        contain-intrinsic-size: 1em;
        margin-left: .25rem;
        margin-bottom: -.25rem;
        text-align: left;

        p {
            text-wrap: pretty;
        }

        .privacy-note {
            color: var(--text-40);
        }
    }
}

.nq-button {
    margin-top: auto;
    flex-shrink: 0;
}

.nq-link {
    font-weight: 600;
    font-size: var(--link-size);
    color: white;
    transition: opacity .3s var(--nimiq-ease);
    opacity: .4;

    &:hover {
        opacity: .8;
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .page-body {
        padding-top: 5rem;
    }

    label {
        margin-top: 1.75rem;
        margin-bottom: 1.5rem;
    }

    .address-display {
        margin-bottom: 2.5rem;
    }
}
</style>
