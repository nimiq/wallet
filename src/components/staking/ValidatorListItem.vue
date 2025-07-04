<template>
    <button class="validator-list-item reset flex-row">
        <div class="validator-item-wrapper flex-row">
            <ValidatorIcon :validator="validator" />
            <div class="validator-item-mid flex-column">
                <div class="validator-item-inner-row flex-row">
                    <template v-if="'name' in validator">
                        <span class="validator-label">{{ validator.name }}</span>
                    </template>
                    <ShortAddress v-else :address="validator.address"/>
                </div>
                <div class="validator-item-inner-row flex-row validator-subline">
                    <ValidatorReward v-if="'annualReward' in validator" :reward="validator.annualReward" />
                    <!-- <strong class="dot">&middot;</strong>-->
                </div>
            </div>
            <ValidatorTrustScore v-if="'score' in validator && typeof validator.score.total === 'number'"
                :score="validator.score.total"
            />
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Validator } from '../../stores/Staking';

import ValidatorReward from './tooltips/ValidatorReward.vue';
import ShortAddress from '../ShortAddress.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorIcon from './ValidatorIcon.vue';

export default defineComponent({
    props: {
        container: HTMLElement,
        validator: {
            type: Object as () => Validator,
            required: true,
        },
    },
    components: {
        ValidatorIcon,
        ValidatorTrustScore,
        ValidatorReward,
        ShortAddress,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';

.validator-list-item {
    box-sizing: border-box;
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;

    width: calc(100% - 4rem);
    height: 9.25rem;
    background-color: transparent;

    border: 0;
    border-radius: 0.75rem;
    outline: none;

    flex-shrink: 0;

    transition: background-color 400ms var(--nimiq-ease);

    &:hover, &:focus { background-color: #f2f2f4 }
}

.validator-item-wrapper {
    width: 100%;
    height: 100%;
    align-items: center;
    padding: 0 2.25rem;

    .validator-item-mid {
        flex-grow: 1;
        flex-shrink: 1;
        padding-left: 2.25rem;
        min-width: 0;
    }

    .validator-item-inner-row {
        line-height: 3rem;
        align-items: center;
        padding-right: 2rem;
        font-size: var(--body-size);

        .validator-label { font-weight: 600 }
        .short-address { font-weight: 500 }

        .trigger {
            color: nimiq-blue(0.4);

            transition: color 400ms var(--nimiq-ease);

            &:hover, &:focus { color: nimiq-blue(.6) }
        }
    }

    .validator-subline {
        color: var(--text-50);
        font-size: var(--small-size);
    }

    .dot { margin: 0 0.675rem }
}
</style>
