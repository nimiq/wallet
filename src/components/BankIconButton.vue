<template>
    <button class="reset bank-icon-button flex-column" v-on="$listeners">
        <BankIcon/>
        <label>{{ bankName || '' }}</label>
    </button>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import BankIcon from './icons/BankIcon.vue';

export default defineComponent({
    props: {
        bankName: String,
    },
    components: {
        BankIcon,
    },
});
</script>

<style lang="scss" scoped>
.bank-icon-button {
    align-items: center;
    width: 18rem;
    border-radius: 0.75rem;
    padding: 1rem;

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);
    }

    svg {
        height: 9rem;
        width: auto;
        margin-top: -.5rem;
    }

    label {
        margin-top: 1.875rem;
        text-align: center;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        width: 100%;
        cursor: inherit;
        mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
    }
}
</style>
