<template>
    <div class="contact-shortcuts flex-row">
        <button
            class="reset contact-list-button flex-column"
            @click="$emit('contact-list-opened')"
            :disabled="!contacts.length && !hasAddresses"
        >
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
        <IdenticonButton
            v-for="i in Math.max(0, 3 - contacts.length)"
            :key="`placeholder-${i}`"
            address="placeholder"/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ContactsIcon } from '@nimiq/vue-components';
import IdenticonButton from './IdenticonButton.vue';

export default defineComponent({
    props: {
        contacts: {
            type: Array as () => Readonly<{address: string, label: string}[]>,
            required: false,
        },
        hasAddresses: {
            type: Boolean,
            required: true,
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
        width: 100%;
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

        &:not(:disabled):hover,
        &:not(:disabled):focus {
            background: var(--nimiq-highlight-bg);
        }

        &:disabled {
            .nq-icon {
                opacity: 0.2;
            }

            label {
                opacity: 0.3;
                cursor: auto;
            }
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
        width: 0.25rem;
        margin: 0 0.75rem;
        flex-shrink: 0;
        box-shadow: inset 1.5px 0 0 var(--text-14);
    }
</style>
