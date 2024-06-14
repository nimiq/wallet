<template>
    <button class="prestaking-preview nq-button-pill gold flex-row"
        @click="$router.push('/prestaking')" @mousedown.prevent>
        <PrestakingIcon />
        <Amount
            :amount="activePrestake && activePrestake.balance || 0"
            value-mask
        />

        <div class="flex-grow"></div>

        <LockIcon />
    </button>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import Amount from '../Amount.vue';
import { usePrestakingStore } from '../../stores/Prestaking';
import PrestakingIcon from '../icons/Prestaking/PrestakingIcon.vue';
import LockIcon from '../icons/Prestaking/LockIcon.vue';

export default defineComponent({
    setup() {
        const { activePrestake, activeValidator } = usePrestakingStore();

        return {
            activePrestake,
            activeValidator,
        };
    },
    components: {
        PrestakingIcon,
        Amount,
        LockIcon,
    },
});
</script>

<style lang="scss" scoped>
.prestaking-preview {
    align-items: center;
    padding: 0.75rem;
    --size: var(--large-button-size);
    font-size: var(--size);
    line-height: 1;
    height: 4.25rem;
    border-radius: 5rem;
}

.nq-icon {
    font-size: 3.25rem;
}

.prestaking-icon {
    margin: -0.25rem 0.5rem -0.25rem 0;

    ::v-deep path {
        stroke-width: 1px;
    }
}

.lock-icon {
    margin-left: 1rem;
    font-size: 2.75rem;
}
</style>
