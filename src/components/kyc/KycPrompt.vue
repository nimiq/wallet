<template>
    <div class="kyc-prompt nq-purple-bg" :class="`layout-${layout}`">
        <div class="flex-row">
            <KycIcon />
            <h3 v-if="layout === 'wide'">{{ $t('Raise your limits') }}</h3>
            <h3 v-else>{{ $t('Get TEN31-verified for higher limits') }}</h3>
        </div>
        <p v-if="!kycLimits" class="explainer">
            {{ $t('Swap more per 30 days.') }}
        </p>
        <i18n v-else tag="p" path="Swap up to {limit} per 30 days." class="explainer">
            <template slot="limit">
                <FiatAmount :amount="kycLimits.monthly / 1e2" :currency="kycLimits.asset" hideDecimals />
            </template>
        </i18n>
        <button
            class="nq-button-pill inverse nq-purple"
            @mousedown.prevent @click="$emit('click')"
        >{{ $t('Get started') }}</button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { getUserLimits } from '@nimiq/fastspot-api';
import { FiatAmount } from '@nimiq/vue-components';
import KycIcon from '../icons/KycIcon.vue';
import { useKycStore } from '../../stores/Kyc';

export default defineComponent({
    props: {
        layout: {
            type: String,
            default: 'normal',
        },
    },
    setup() {
        const { kycLimits, setKycLimits } = useKycStore();

        if (!kycLimits.value) {
            getUserLimits(
                '00000000-0000-0000-0000-000000000000',
                '00000000-0000-0000-0000-000000000000',
            ).then(setKycLimits);
        }

        return {
            kycLimits,
        };
    },
    components: {
        FiatAmount,
        KycIcon,
    },
});
</script>

<style lang="scss" scoped>
.kyc-prompt {
    padding: 2rem;
    border-radius: 0.5rem;
}

.flex-row {
    align-items: center;
}

.nq-icon {
    flex-shrink: 0;
    font-size: 3.625rem;
    margin-right: 1.25rem;
}

h3 {
    font-size: 2rem;
    margin: 0;
    line-height: 1.2;
}

::v-deep .circle-spinner {
    display: block;
    margin: 2rem 0 3rem;

    path {
        stroke: white;
    }
}

.explainer {
    font-weight: 600;
}

.nq-button-pill.nq-purple {
    background: white;

    &:hover,
    &:focus {
        background: var(--nimiq-gray);
    }
}

.layout-wide {
    display: grid;
    color: var(--nimiq-white);
    padding: 3rem;

    .kyc-icon {
        font-size: 2.25rem;
    }

    ::v-deep .circle-spinner {
        margin: 1rem 0 -1px;
    }

    .explainer {
        font-size: var(--small-size);
        opacity: 0.6;
        margin: 0.5em 0 0;
    }

    .nq-button-pill.nq-purple {
        grid-column: 2;
        grid-row: 1 / span 2;
        align-self: center;
        justify-self: end;
        margin-right: 1rem;
    }
}
</style>
