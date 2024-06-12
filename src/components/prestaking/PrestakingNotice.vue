<template>
    <div :class="`prestaking-notice ${theme === 'warning' ? 'nq-orange' : ''}`">
        {{ $t('Prestaked funds are locked until launch') }}
        <Tooltip preferredPosition="top">
            <InfoCircleSmallIcon slot="trigger"/>
            <template>
                <p>{{ $t('Prestaked funds remain locked until the Proof of Stake network goes live.') }}</p>
                <BlueLink href="https://www.nimiq.com/blog/migration-process-to-nimiq-proof-of-stake/">
                    <!-- TODO: Change to the correct link -->
                    {{ $t('Learn more') }}
                </BlueLink>
            </template>
        </Tooltip>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api';
import { Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
import BlueLink from '../BlueLink.vue';

export default defineComponent({
    props: {
        theme: {
            type: String as PropType<'normal' | 'warning'>,
            default: 'normal',
        },
    },
    components: {
        Tooltip,
        InfoCircleSmallIcon,
        BlueLink,
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

.tooltip {
    margin-left: 0.5rem;
}

.tooltip ::v-deep .tooltip-box {
    width: 28rem;
}

.tooltip ::v-deep .trigger {
    cursor: help;
}

p {
    margin-bottom: 1rem;
    text-align: left;
}

.blue-link {
    color: #0CA6FE; // $nimiq-blue on dark
}
</style>
