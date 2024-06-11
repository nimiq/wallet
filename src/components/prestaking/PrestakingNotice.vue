<template>
    <div :class="`prestaking-notice ${theme === 'warning' ? 'nq-orange' : ''}`">
        {{ $t('Prestaked funds are locked until launch') }}
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api';

export default defineComponent({
    props: {
        theme: {
            type: String as PropType<'normal' | 'warning'>,
            default: 'normal',
        },
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/mixins.scss';

.prestaking-notice {
    font-size: var(--small-size);
    font-weight: 600;
    margin-top: 3rem;
    line-height: 1;
    color: var(--text-50);
}
</style>
