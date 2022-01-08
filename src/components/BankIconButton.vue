<template>
    <button class="reset bank-icon-button flex-column" v-on="$listeners">
        <BankIcon/>
        <TriangleDownIcon class="triangle"/>
        <label>{{ bankName || '' }}</label>
    </button>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import BankIcon from './icons/BankIcon.vue';
import TriangleDownIcon from './icons/TriangleDownIcon.vue';

export default defineComponent({
    props: {
        bankName: String,
    },
    components: {
        BankIcon,
        TriangleDownIcon,
    },
});
</script>

<style lang="scss" scoped>
.bank-icon-button {
    position: relative;
    align-items: center;
    width: 18rem;
    border-radius: 0.75rem;
    padding: 1rem;

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);
    }

    svg {
        height: 8.25rem;
        width: auto;
    }

    .triangle {
        position: absolute;
        right: 4rem;
        top: 8rem;
        width: 1.25rem;
        height: 1rem;
        opacity: 0.25;
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
