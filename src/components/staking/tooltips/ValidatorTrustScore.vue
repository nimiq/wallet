 <template>
    <div class="validator-trust-score"
        :class="{
            'high-score': !dry && !disabled && stars >= 4.5,
            'low-score': !dry && !disabled && stars >= 2.5 && stars < 3.5,
            'very-low-score': !dry && !disabled && stars < 2.5,
            'disabled': disabled,
            dry,
            borderless,
        }"
    >
        <StarIcon />
        {{ displayValue }}
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import StarIcon from '../../icons/Staking/StarIcon.vue';

export default defineComponent({
    props: {
        score: {
            type: Number,
            default: null,
        },
        dry: Boolean,
        borderless: Boolean,
    },
    setup(props) {
        const disabled = computed(() => props.score === null);
        const stars = computed(() => props.score !== null ? props.score * 5 : 0);
        const displayValue = computed(() => disabled.value ? '-' : stars.value.toFixed(2));

        return {
            stars,
            disabled,
            displayValue,
        };
    },
    components: {
        StarIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../../scss/functions.scss';

.validator-trust-score {
    height: 3.125rem;
    line-height: 2.8rem;
    padding: 0 .875rem;
    border-radius: 5rem;
    white-space: nowrap;
    font-size: var(--body-size);
    font-weight: bold;

    --color: var(--text-50);
    --border-color: var(--color);

    color: var(--color);
    border: 1.5px solid var(--border-color);

    &.high-score { --color: var(--nimiq-green) }
    &.low-score { --color: var(--nimiq-orange) }
    &.very-low-score { --color: var(--nimiq-red) }
    &.disabled {
        --color: var(--text-40);
        font-style: italic;
    }

    &.dry {
        --border-color: #{nimiq-blue(0.15)};
        --color: var(--text-60);

        padding: 0 1.375rem;
        height: 3.25rem;
        line-height: 3.125rem;

        font-size: var(--small-size);
        font-weight: 600;
    }

    &.borderless {
        border: none;

        padding: 0;
        font-weight: 600;

        svg {
            margin-right: 0;
        }
    }

    svg {
        width: 1.5rem;
        height: 1.5rem;
        margin-right: 0.25rem;
        margin-top: -0.125rem;
        opacity: var(--disabled, 1);

        .disabled & {
            --disabled: 0.5;
        }
    }
}
</style>
