 <template>
    <div class="validator-trust-score flex-row"
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
        dry: {
            type: Boolean,
            required: false,
            default: false,
        },
        borderless: {
            type: Boolean,
            required: false,
            default: true,
        },
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
    white-space: nowrap;
    align-items: center;

    --color: var(--text-50);
    color: var(--color);

    &.high-score { --color: var(--nimiq-green) }
    &.low-score { --color: var(--nimiq-orange) }
    &.very-low-score { --color: var(--nimiq-red) }
    &.disabled {
        --color: var(--text-40);
        font-style: italic;
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
