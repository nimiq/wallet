<template>
    <Tooltip class="validator-description-tooltip" :preferredPosition="preferredPosition"
        :container="container && { $el: container }" @click.native.stop>
        <slot slot="trigger" />

        <blockquote>
            <p v-if="'description' in validator" class="description">{{ validator.description }}</p>
            <span v-else class="no-description">{{ $t('No description available') }}</span>
        </blockquote>
        <BlueLink v-if="'website' in validator && 'label' in validator"
            :href="validator.website" target="_blank" rel="noopener">
            {{ hostname }}
        </BlueLink>

        <p>{{ $t('The validator is solely responsible for information provided above.') }}</p>

    </Tooltip>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import { Tooltip } from '@nimiq/vue-components';
import { Validator } from '../../../stores/Prestaking';
import BlueLink from '../../BlueLink.vue';

export default defineComponent({
    props: {
        container: HTMLElement,
        validator: {
            type: Object as () => Validator,
            required: true,
        },
        preferredPosition: {
            type: String,
            default: 'bottom',
        },
    },
    setup(props) {
        const hostname = computed(() => 'website' in props.validator && props.validator.website
            ? new URL(props.validator.website).hostname
            : null);

        return {
            hostname,
        };
    },
    components: {
        Tooltip,
        BlueLink,
    },
});
</script>

<style lang="scss" scoped>
.tooltip {
    margin-left: 0.625rem;

    ::v-deep .tooltip-box {
        width: 31.5rem;
        line-height: 130%;
        cursor: default;
        text-align: left;
        z-index: 2;
    }

    &[class*='position-top'] ::v-deep .tooltip-box { transform: translateY(-1.9rem) }
    &[class*='position-bottom'] ::v-deep .tooltip-box { transform: translateY(1.9rem) }
}

blockquote {
    margin: 0;
    padding-left: 1.25rem;
    border-left: 1.5px solid rgba(white, .4);

    font-size: 2rem;
    line-height: 130%;

    p.description {
        color: white;
        margin: 0;
    }
    span.no-description {
        opacity: .25;
        font-style: italic;
    }
}

p:not(.description) {
    opacity: .6;
    font-size: 1.75rem;
    line-height: 130%;
}

.blue-link {
    color: var(--nimiq-light-blue-on-dark);
    margin-top: 1rem;
}
</style>
