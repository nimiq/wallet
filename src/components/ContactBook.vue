<template>
    <div class="contact-book flex-column">
        <div class="list flex-column">
            <AddressListItem
                v-for="addressInfo in (showAllOwnAddresses ? ownAddressInfos : ownAddressInfos.slice(0, 2))"
                :key="addressInfo.address"
                :addressInfo="addressInfo"
                @click="$emit('contact-selected', addressInfo, RecipientType.OWN_ADDRESS)"
            />
            <button v-if="ownAddressInfos.length > 2"
                class="nq-button-s show-own-addresses-button"
                @click="showAllOwnAddresses = !showAllOwnAddresses">
                {{ $t('Show all my addresses') }}
            </button>
            <div v-if="ownAddressInfos.length" class="separator"></div>
            <button
                v-for="contact in contacts"
                :key="contact.address"
                class="reset contact-button flex-row"
                @click="$emit('contact-selected', contact, RecipientType.CONTACT)"
            >
                <Identicon :address="contact.address"/>
                <label>{{ contact.label }}</label>
                <ShortAddress :address="contact.address"/>
            </button>
        </div>
        <button class="nq-button-s edit-button">{{ $t('Edit contacts') }}</button>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from '@vue/composition-api';
import { Identicon } from '@nimiq/vue-components';
import AddressListItem from './AddressListItem.vue';
import ShortAddress from './ShortAddress.vue';
import { RecipientType } from './modals/SendModal.vue';
import { useContactsStore } from '../stores/Contacts';
import { useAddressStore } from '../stores/Address';

export default defineComponent({
    setup() {
        const { contactsArray: contacts, setContact } = useContactsStore();

        const { state: addresses$, activeAddress } = useAddressStore();

        const ownAddressInfos = computed(() => {
            const addressInfos = { ...addresses$.addressInfos }; // Clone object
            delete addressInfos[activeAddress.value!];
            return Object.values(addressInfos);
        });

        const showAllOwnAddresses = ref(false);

        return {
            contacts,
            ownAddressInfos,
            showAllOwnAddresses,
            RecipientType,
        };
    },
    components: {
        Identicon,
        AddressListItem,
        ShortAddress,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.contact-book {
    max-height: 100%;
}

.list {
    overflow-y: auto;
    padding: 2.5rem 2rem;
    mask: linear-gradient(0deg ,
        rgba(255,255,255, 0),
        white 3rem,
        white calc(100% - 3rem),
        rgba(255,255,255, 0)
    );

    @extend %custom-scrollbar;
}

.address-button,
.contact-button {
    width: 100%;
    transition: background 0.2s var(--nimiq-ease);

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);
    }
}

.show-own-addresses-button {
    margin: 2rem auto 1rem;
}

.separator {
    height: 0.25rem;
    box-shadow: inset 0 1.5px var(--text-14);
    margin: 2rem 0;
    flex-shrink: 0;
}

.contact-button {
    align-items: center;
    padding: 2rem;
    border-radius: 0.75rem;

    .identicon {
        width: 5.75rem;
        margin: -0.3125rem 0; // 0.3125 = 2.5px
        flex-shrink: 0;
    }

    label {
        margin: 0 2rem;
        font-weight: 600;
        cursor: pointer;
        flex-grow: 1;
    }

    .short-address {
        opacity: 0.5;
        flex-shrink: 0;
    }
}

.edit-button {
    align-self: center;
    margin-right: 2rem;
}

@media (max-width: 700px) { // Full mobile breakpoint
    .contact-button {
        background: none !important;

        label {
            margin: 0 1.5rem;
        }
    }
}
</style>
