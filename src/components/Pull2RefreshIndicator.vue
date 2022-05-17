<template>
    <div class="pull2refresh"
        :style="{
            transform: `translateY(${(pulledDistance / 4) - 5}px)`,
            opacity: pulledDistance / 200,
        }"
    >
        {{ $t('Pull to refresh') }} <GroundedArrowDownIcon />
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import GroundedArrowDownIcon from './icons/GroundedArrowDownIcon.vue';

export default defineComponent({
    props: {
        pulledDistance: {
            type: Number,
            required: true,
        },
    },
    components: {
        GroundedArrowDownIcon,
    },
});
</script>

<style lang="scss" scoped>
.pull2refresh {
    margin: 0 auto;
    height: fit-content;
    color: var(--text-60);

    svg {
        margin-left: 1rem;
    }
}
</style>
