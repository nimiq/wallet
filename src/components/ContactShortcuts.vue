<template>
    <div class="contact-shortcuts flex-row">
        <button class="reset contact-list-button flex-column" @click="$emit('contact-list-opened')">
            <ContactsIcon/>
            <label>{{ $t('Contacts') }}</label>
        </button>
        <div class="separator"></div>
        <button
            v-for="contact in contacts"
            :key="contact.address"
            class="reset contact-button flex-column"
            @click="$emit('contact-selected', contact)"
        >
            <Identicon :address="contact.address"/>
            <label>{{ contact.label }}</label>
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { ContactsIcon, Identicon } from '@nimiq/vue-components';

export default defineComponent({
    props: {
        contacts: {
            type: Array as () => {address: string, label: string}[],
            required: false,
        },
    },
    components: {
        ContactsIcon,
        Identicon,
    },
});
</script>

<style lang="scss" scoped>
    .contact-shortcuts {
        align-content: flex-start;
        width: calc(100% + 2rem);
    }

    button {
        align-items: stretch;
        border-radius: 0.75rem;
        padding: 1rem;
        margin-right: 0.5rem;
        width: 0;
        flex-grow: 1;

        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);
        }

        &:first-child,
        &:last-child {
            margin-right: 0;
        }
    }

    .contact-list-button {
        padding: 1rem 0.5rem;
        width: 13rem;
        flex-shrink: 0;
        flex-grow: 0;
    }

    .nq-icon {
        display: block;
        font-size: 6rem;
        opacity: 0.4;
        box-sizing: content-box;
        padding: 0.5rem 1rem;
        margin: 0 auto 1.5rem;
    }

    .identicon {
        width: 8rem;
        margin: 0 auto 1.5rem;

        /deep/ img {
            display: block;
            margin: -0.5rem 0;
        }
    }

    label {
        text-align: center;
        cursor: pointer;
    }

    .contact-button label {
        white-space: nowrap;
        overflow: hidden;
        mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
    }

    .separator {
        content: '';
        display: block;
        width: 0.125rem;
        margin: 0 0.5rem;
        flex-shrink: 0;
        align-self: stretch;
        background: var(--text-14);
    }
</style>
