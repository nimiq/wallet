<template>
    <div class="unstaking row flex-row">
        <template v-if="hasUnstakableStake">
            <span class="nq-button-pill payout-amount">
                <Amount :amount="amount" value-mask/>
            </span>
            <button class="nq-button-pill light-blue" @click="$emit('unstake', retired)" :disabled="disabled">
                Pay out <ArrowRightSmallIcon />
            </button>
            <div class="flex-grow"></div>
        </template>
        <template v-else-if="releaseTime">
            <span class="nq-button-s unstaking-amount">
                <ArrowDownIcon />
                <Amount :amount="amount" value-mask/>
            </span>
            <button class="nq-button-s unstaking-progress">
                {{ releaseTime }}
            </button>
            <div class="flex-grow"></div>
        </template>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { ArrowRightSmallIcon } from '@nimiq/vue-components';
import Amount from '../Amount.vue';
import ArrowDownIcon from '../icons/ArrowDownIcon.vue';

export default defineComponent({
    name: 'UnstakingPill',
    props: {
        amount: {
            type: Number,
            required: true,
        },
        hasUnstakableStake: {
            type: Boolean,
            default: false,
        },
        releaseTime: {
            type: String,
            default: '',
        },
        retired: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    components: {
        Amount,
        ArrowDownIcon,
        ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.unstaking {
    flex-wrap: wrap;
    align-items: center;
    --size: var(--body-size);
    font-size: var(--size);
    font-weight: 600;
    margin-top: 2rem;

    .nq-button-s,
    .nq-button-pill {
        display: flex;
        flex-direction: row;
        align-items: center;
        color: white;

        &:first-child {
            z-index: 2;
            box-shadow: 0px 0px 0px 3px white;
            cursor: default;

            .nq-icon {
                margin-right: 0.75rem;
            }
        }

        &:nth-child(2) {
            padding-left: 2rem;
            margin-left: -0.4rem;

            --left-radius: 0px;
            border-top-left-radius: var(--left-radius);
            border-bottom-left-radius: var(--left-radius);

            .nq-icon {
                margin-left: 0.75rem;
            }
        }

        &.unstaking-amount { background-color: #797B91 }

        &.payout-amount .amount::after {
            top: 0.09em;
        }

        &.unstaking-progress {
            color: var(--nimiq-blue-60);
            pointer-events: none;
            cursor: default;

            span {
                color: var(--nimiq-blue);
                margin-left: 1rem;
            }
        }
    }
}
</style>
