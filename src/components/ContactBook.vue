<template>
    <div class="contact-book flex-column">
        <div class="list">
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
import { defineComponent } from '@vue/composition-api';
import { Identicon } from '@nimiq/vue-components';
import ShortAddress from './ShortAddress.vue';
import { RecipientType } from './modals/SendModal.vue';
import { useContactsStore } from '../stores/Contacts';

export default defineComponent({
    setup() {
        const { contactsArray: contacts, setContact } = useContactsStore();

        return {
            contacts,
            RecipientType,
        };
    },
    components: {
        Identicon,
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

.contact-button {
    align-items: center;
    width: 100%;
    padding: 2rem;
    border-radius: 0.75rem;

    transition: background 0.2s var(--nimiq-ease);

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

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);
    }
}

.edit-button {
    align-self: center;
    margin-right: 2rem;
}
</style>
