<template>
    <Tooltip class="validator-label-tip"
        preferredPosition="bottom right"
        :styles="{width: 'description' in validator ? '40rem' : '55.25rem', 'text-align': 'left'}"
    >
        <div slot="trigger" class="validator-label-trigger flex-row">
            <img v-if="'icon' in validator" :src="`/img/staking/providers/${validator.icon}`" :alt="validator.label" />
            <Identicon v-else :address="validator.address"/>

            <span v-if="'label' in validator" class="validator-label">{{ validator.label }}</span>
            <ShortAddress v-else :address="validator.address"/>
        </div>

        <template v-if="'description' in validator">
            <p class="validator-description">
                {{ validator.description }}
            </p>
            <p class="validator-disclaimer">
                {{ $t('The validator is solely responsible for information provided above.') }}
            </p>
            <br />
            <BlueLink v-if="validator.link" :href="validator.link" target="_blank" rel="noopener">
                {{ $t('{poolName} Website', { poolName: validator.label }) }}
            </BlueLink>
        </template>
        <p v-else>{{ validator.address }}</p>
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Tooltip, Identicon } from '@nimiq/vue-components';
import BlueLink from '../../BlueLink.vue';
import { Validator } from '../../../stores/Staking';
import ShortAddress from '../../ShortAddress.vue';

export default defineComponent({
    props: {
        validator: {
            type: Object as () => Validator,
            required: true,
        },
    },
    components: {
        Tooltip,
        Identicon,
        BlueLink,
        ShortAddress,
    },
});
</script>

<style lang="scss" scoped>
.validator-label-tip {
    z-index: 2;
}

.validator-label-trigger {
    align-items: center;
    box-shadow: inset 0 0 0 1.5px rgba(31, 35, 72, 0.15);
    padding: 0 1.375rem 0 0.25rem;
    border-radius: 5rem;
    white-space: nowrap;
    height: 3.25rem;
    line-height: 3.25rem;

    font-size: var(--small-size);
    color: var(--text-60);

    img, .identicon {
        width: 2.75rem;
        height: 2.75rem;
        margin-right: 0.75rem;
    }

    .validator-label {
        font-weight: 600;
    }

    .short-address {
        font-weight: 500;
    }
}
.validator-description {
    margin-left: .75rem;
    padding-left: 1.25rem;

    font-weight: 600;
    font-size: 2rem;
    line-height: 130%;

    color: white;
    border-left: .1875rem solid rgba(255, 255, 255, 0.4);
}

.validator-disclaimer {
    margin-bottom: -1rem;
    font-weight: 600;
    font-size: 1.75rem;
    line-height: 130%;

    opacity: 0.6;
    width: 31.5rem;
}

.blue-link {
    color: var(--nimiq-light-blue-on-dark);
}
</style>
