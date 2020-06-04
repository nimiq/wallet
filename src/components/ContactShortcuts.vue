<template>
    <div class="contact-shortcuts flex-row">
        <button class="reset contact-list-button flex-column" @click="$emit('contact-list-opened')">
            <ContactsIcon/>
            <label>{{ $t('Contacts') }}</label>
        </button>
        <div class="separator"></div>
        <IdenticonButton
            v-for="contact in contacts"
            :key="contact.address"
            @click="$emit('contact-selected', contact)"
            :address="contact.address"
            :label="contact.label"/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { ContactsIcon } from '@nimiq/vue-components';
import IdenticonButton from './IdenticonButton.vue';

export default defineComponent({
    props: {
        contacts: {
            type: Array as () => {address: string, label: string}[],
            required: false,
        },
    },
    components: {
        ContactsIcon,
        IdenticonButton,
    },
});
</script>

<style lang="scss" scoped>
    .contact-shortcuts {
        align-content: flex-start;
        width: calc(100% + 2rem);
    }

    .identicon-button {
        margin-right: 0.25rem;
        width: 0;
        flex-grow: 1;

        &:last-child {
            margin-right: 0;
        }
    }

    .contact-list-button {
        align-items: stretch;
        border-radius: 0.75rem;
        padding: 1rem 0.5rem;
        width: 13rem;
        flex-shrink: 0;
        flex-grow: 0;

        transition: background var(--attr-duration) var(--nimiq-ease);

        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);
        }
    }

    .nq-icon {
        font-size: 6rem;
        opacity: 0.4;
        box-sizing: content-box;
        padding: 0.5rem 1rem;
        margin: 0 auto 1.5rem;
    }

    label {
        text-align: center;
        cursor: pointer;
    }

    .separator {
        content: '';
        display: block;
        width: 0.25rem;
        margin: 0 0.75rem;
        flex-shrink: 0;
        align-self: stretch;
        box-shadow: inset 3px 0 0 -1.5px var(--text-14);
    }
</style>
