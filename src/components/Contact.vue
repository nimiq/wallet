
<template>
    <div v-if="addressLabel">{{addressLabel}}</div>
    <input
        v-else
        type="text"
        class="contact-input"
        placeholder="Name this contact"
        :value="contactLabel"
        @change="setContact(address, $event.target.value)"
    />
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api';
import { useAddressStore } from '../stores/Address';
import { useContactsStore } from '../stores/Contacts';

export default createComponent({
    name: 'contact',
    props: {
        address: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const addresses = useAddressStore();
        const { label, setContact } = useContactsStore();

        const addressLabel = computed(
            () => addresses.state.addressInfos[props.address]
                ? addresses.state.addressInfos[props.address].label
                : undefined,
        );
        const contactLabel = computed(() =>
            !addressLabel.value ? label.value(props.address) : undefined,
        );

        return {
            addressLabel,
            contactLabel,
            setContact,
        };
    },
});
</script>

<style lang="scss">
.contact-input {
    border: 0;
    color: var(--nimiq-blue);
    font-size: 2.25rem;

    &::placeholder {
        opacity: .5;
    }

    &:hover,
    &:active,
    &:focus {
        background-color: var(--nimiq-highlight-bg);
        outline: none;
    }
}
</style>
