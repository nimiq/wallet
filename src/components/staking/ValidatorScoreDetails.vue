<template>
    <div class="validator-score-details">
        <div class="score"
            :class="{ expanded: isAvailabilityExpanded }"
            @click="isAvailabilityExpanded = !isAvailabilityExpanded"
        >
            <div class="score-header">
                <CaretRightIcon />
                <h2>{{ $t('Availability') }}</h2>
                <ValidatorTrustScore :score="score.availability" borderless/>
            </div>
            <div class="score-content">
                <p class="description">
                    {{ $t("Rates the pool's availability to be selected for block production, which earns rewards.") }}
                </p>
                <p class="status" :class="getStatusClass(availabilityScore)">
                    {{ availabilityStatus }}
                </p>
            </div>
        </div>

        <div class="score"
            :class="{ expanded: isReliabilityExpanded }"
            @click="isReliabilityExpanded = !isReliabilityExpanded"
        >
            <div class="score-header">
                <CaretRightIcon />
                <h2>{{ $t('Reliability') }}</h2>
                <ValidatorTrustScore :score="score.reliability" borderless/>
            </div>
            <div class="score-content">
                <p class="description">
                    {{ $t("Rates the pool's ability to correctly produce blocks and earn rewards when selected.") }}
                </p>
                <p class="status" :class="getStatusClass(reliabilityScore)">
                    {{ reliabilityStatus }}
                </p>
            </div>
        </div>

        <div class="score"
            :class="{ expanded: isDominanceExpanded }"
            @click="isDominanceExpanded = !isDominanceExpanded"
        >
            <div class="score-header">
                <CaretRightIcon />
                <h2>{{ $t('Dominance') }}</h2>
                <ValidatorTrustScore :score="score.dominance" borderless/>
            </div>
            <div class="score-content">
                <p class="description">
                    {{ $t("Rates the pool's potential to harm the network, based on its size.") }}
                </p>
                <p class="status" :class="getStatusClass(dominanceScore)">
                    {{ dominanceStatus }}
                </p>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { RegisteredValidator } from '@/stores/Staking';
import { defineComponent, ref, computed } from 'vue';
import CaretRightIcon from '../icons/CaretRightIcon.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import { i18n } from '../../i18n/i18n-setup';

const ScoreThresholds = {
    EXCELLENT: 4.5,
    GOOD: 3.5,
    FAIR: 2.5,
};

export default defineComponent({
    props: {
        score: {
            type: Object as () => RegisteredValidator['score'],
            required: true,
        },
    },
    setup(props) {
        // State for expanded scores
        const isAvailabilityExpanded = ref(false);
        const isReliabilityExpanded = ref(false);
        const isDominanceExpanded = ref(false);

        // Computed properties for each score type
        const availabilityScore = computed(() =>
            props.score.availability
                ? props.score.availability * 5
                : null,
        );
        const reliabilityScore = computed(() =>
            props.score.reliability
                ? props.score.reliability * 5
                : null,
        );
        const dominanceScore = computed(() =>
            props.score.dominance
                ? props.score.dominance * 5
                : null,
        );

        // Function for status classes
        const getStatusClass = (score: number | null) => {
            if (score === null) return 'disabled';
            if (score > ScoreThresholds.EXCELLENT) return 'high-score';
            if (score > ScoreThresholds.GOOD) return '';
            if (score > ScoreThresholds.FAIR) return 'low-score';
            return 'very-low-score';
        };

        // Computed properties for status messages
        const availabilityStatus = computed(() => {
            const score = availabilityScore.value;

            if (!score) return i18n.t('No availability data available yet.');

            if (score > ScoreThresholds.EXCELLENT) {
                return i18n.t('This pool is reliably available for block production.');
            }
            if (score > ScoreThresholds.GOOD) {
                return i18n.t('This pool is usually available for block production.');
            }
            if (score > ScoreThresholds.FAIR) {
                return i18n.t('The pool sometimes fails to be available for block production.');
            }
            return i18n.t('This pool regularly fails to be available for block production.');
        });

        const reliabilityStatus = computed(() => {
            const score = reliabilityScore.value;

            if (!score) return i18n.t('No reliability data available yet.');

            if (score > ScoreThresholds.EXCELLENT) {
                return i18n.t('This pool reliably produces blocks.');
            }
            if (score > ScoreThresholds.GOOD) {
                return i18n.t('This pool usually produces blocks.');
            }
            if (score > ScoreThresholds.FAIR) {
                return i18n.t('This pool sometimes fails to produce blocks.');
            }
            return i18n.t('This pool regularly fails to produce blocks.');
        });

        const dominanceStatus = computed(() => {
            const score = dominanceScore.value;

            if (!score) return i18n.t('No dominance data available yet.');

            if (score > ScoreThresholds.EXCELLENT) {
                return i18n.t('This pool is safe to stake with.');
            }
            if (score > ScoreThresholds.GOOD) {
                return i18n.t(
                    // eslint-disable-next-line max-len
                    'This pool controls a large share of the total stake.\nSupport the network by staking with a smaller pool.',
                );
            }
            if (score > ScoreThresholds.FAIR) {
                return i18n.t(
                    // eslint-disable-next-line max-len
                    'This pool controls an almost critical share of the total stake.\nChoose a smaller pool to improve the network’s security.',
                );
            }
            return i18n.t(
                // eslint-disable-next-line max-len
                'Do not stake with this pool!\nIt controls a critical share of the total stake, making it a potential threat to the network.',
            );
        });

        return {
            isAvailabilityExpanded,
            isReliabilityExpanded,
            isDominanceExpanded,

            getStatusClass,

            availabilityScore,
            reliabilityScore,
            dominanceScore,

            availabilityStatus,
            reliabilityStatus,
            dominanceStatus,
        };
    },
    components: {
        CaretRightIcon,
        ValidatorTrustScore,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';

.validator-score-details {
    --border-color: #{nimiq-blue(0.1)};
    --transition-duration: 400ms;

    border: 1px solid var(--border-color);
    border-radius: 1rem;
}

.score {
    cursor: pointer;

    border-bottom: 1px solid var(--border-color);

    padding: 1.5rem;
    padding-bottom: 0;

    &:last-child {
        border-bottom: none;
    }
}

.score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    position: relative;

    margin-left: 2.25rem;
    padding-bottom: 1rem;

    user-select: none;

    .caret-right-icon {
        position: absolute;
        left: -2rem;

        height: 1.25rem;
        width: auto;

        color: nimiq-blue(.4);

        transition: transform var(--transition-duration) var(--nimiq-ease);

        .expanded & {
            transform: rotate(90deg);
        }
    }

    h2 {
        font-size: 2rem;
        font-weight: 600;
        color: nimiq-blue(1);
        margin: 0;
    }
}

.score-content {
    overflow: hidden;

    opacity: 0;
    max-height: 0;
    font-weight: 600;
    transition:
        opacity var(--transition-duration) var(--nimiq-ease),
        max-height var(--transition-duration) var(--nimiq-ease);

    .expanded & {
        opacity: 1;
        max-height: 20rem;
    }
}

.description {
    color: var(--text-60);
    font-size: 1.75rem;

    margin: 0;
    padding-bottom: 1rem;
}

.status {
    font-size: 1.75rem;
    padding-bottom: 2rem;
    margin: 0;
    color: var(--text-50);

    &.high-score { color: var(--nimiq-green); }
    &.low-score { color: var(--nimiq-orange); }
    &.very-low-score { color: var(--nimiq-red); }
    &.disabled {
        color: var(--text-40);
        font-style: italic;
    }
}
</style>
