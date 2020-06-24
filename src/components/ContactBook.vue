<template>
    <div class="contact-book flex-column" :class="{ editing }">
        <div class="list flex-column">
            <AddressListItem
                v-for="addressInfo in (showAllOwnAddresses ? ownAddressInfos : ownAddressInfos.slice(0, 2))"
                :key="addressInfo.address"
                :addressInfo="addressInfo"
                @click="$emit('contact-selected', addressInfo, RecipientType.OWN_ADDRESS)"
            />
            <button v-if="ownAddressInfos.length > 2 && !showAllOwnAddresses"
                class="nq-button-s show-own-addresses-button"
                @click="showAllOwnAddresses = true">
                {{ $t('Show all my addresses') }}
            </button>
            <div v-if="ownAddressInfos.length" class="separator"></div>
            <button
                v-for="contact in contacts"
                :key="contact.address"
                class="reset contact-button flex-row"
                @click="!editing && $emit('contact-selected', contact, RecipientType.CONTACT)"
                :tabindex="editing ? -1 : 0"
            >
                <Identicon :address="contact.address"/>
                <label v-if="!editing">{{ contact.label }}</label>
                <LabelInput v-else
                    :value="contact.label"
                    :placeholder="$t('Name your contact')"
                    @input="onInput(contact.address, $event)"/>
                <div class="flex-grow"></div>
                <ShortAddress :address="contact.address"/>
                <button v-if="editing" class="reset delete-button" @click="setContact(contact.address, '')">
                    <TrashIcon/>
                </button>
            </button>
        </div>
        <button v-if="!editing" class="nq-button-s edit-button" @click="editing = true" key="edit">
            {{ $t('Edit contacts') }}
        </button>
        <button v-else class="nq-button-pill light-blue edit-button" @click="editing = false" key="done">
            {{ $t('Done') }}
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from '@vue/composition-api';
import { Identicon, LabelInput } from '@nimiq/vue-components';
import AddressListItem from './AddressListItem.vue';
import ShortAddress from './ShortAddress.vue';
import TrashIcon from './icons/TrashIcon.vue';
import { RecipientType } from './modals/SendModal.vue';
import { useContactsStore } from '../stores/Contacts';
import { useAddressStore, AddressType } from '../stores/Address';

export default defineComponent({
    setup() {
        const { contactsArray: contacts, setContact } = useContactsStore();

        const { addressInfos, activeAddress } = useAddressStore();

        const ownAddressInfos = computed(() => addressInfos.value.filter(
            (addressInfo) => addressInfo.address !== activeAddress.value && addressInfo.type === AddressType.BASIC,
        ));

        const showAllOwnAddresses = ref(false);

        const editing = ref(false);

        function onInput(address: string, label: string) {
            // Don't delete contacts when label is cleared, as that would remove it from the list
            if (!label) return;

            setContact(address, label);
        }

        return {
            contacts,
            ownAddressInfos,
            showAllOwnAddresses,
            RecipientType,
            editing,
            onInput,
            setContact,
        };
    },
    components: {
        Identicon,
        AddressListItem,
        ShortAddress,
        LabelInput,
        TrashIcon,
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
    flex-grow: 1;
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
}

.address-button:hover,
.address-button:focus,
.contact-book:not(.editing) .contact-button:hover,
.contact-book:not(.editing) .contact-button:focus {
    background: var(--nimiq-highlight-bg);
}

.contact-book.editing .contact-button {
    cursor: auto;
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

    label,
    .label-input {
        margin: 0 2rem;
        font-weight: 600;
    }

    .label-input {
        margin-left: 1.25rem;

        /deep/ .width-finder {
            padding: 0 0.75rem;
        }

        /deep/ input {
            padding: 0.625rem 0.75rem;
            padding-right: 0;
        }
    }

    .short-address {
        opacity: 0.5;
        flex-shrink: 0;
    }

    .delete-button {
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0 -1rem 0 1rem;
        flex-shrink: 0;

        transition:
            background 0.2s var(--nimiq-ease),
            color 0.2s var(--nimiq-ease);

        svg {
            opacity: 0.4;
            display: block;

            transition: opacity 0.2s var(--nimiq-ease);
        }

        &:hover,
        &:focus {
            background: rgba(216, 65, 51, 0.12); // Based on Nimiq Red
            color: var(--nimiq-red);

            svg {
                opacity: 1;
            }
        }
    }
}

.edit-button {
    align-self: center;
}

@media (max-width: 700px) { // Full mobile breakpoint
    .contact-button {
        background: none !important;

        label,
        .label-input {
            margin: 0 1.5rem;
        }

        .label-input {
            margin-left: 0.75rem;
        }
    }
}
</style>
