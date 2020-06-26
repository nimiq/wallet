<template>
    <a v-bind="$attrs" v-on="$listeners" class="blue-link nq-link flex-row"><slot></slot><ArrowRightSmallIcon/></a>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { ArrowRightSmallIcon } from '@nimiq/vue-components';

export default defineComponent({
    components: {
        ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
    a {
        align-items: center;
        text-decoration: none !important;
        font-weight: bold;

        .nq-icon {
            font-size: 0.8em;
            margin-left: 0.75rem;

            transition: transform 0.2s var(--nimiq-ease);
        }

        &:hover,
        &:focus {
            .nq-icon {
                transform: translateX(0.25rem);
            }
        }
    }
</style>
