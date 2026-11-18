<template>
    <a v-bind="$attrs" v-on="$listeners" class="blue-link nq-link"><slot></slot><ArrowRightSmallIcon/></a>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ArrowRightSmallIcon } from '@nimiq/vue-components';

export default defineComponent({
    components: {
        ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
    a {
        display: flex;
        flex-direction: row;
        align-items: center;
        text-decoration: none !important;
        font-weight: bold;

        .nq-icon {
            display: inline;
            font-size: 0.8em;
            margin-left: 0.75rem;
            vertical-align: middle;

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
