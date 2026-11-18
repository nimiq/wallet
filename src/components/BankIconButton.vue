<template>
    <button class="reset bank-icon-button flex-column" v-on="$listeners">
        <BankIcon/>
        <TriangleDownIcon/>
        <label>{{ bankName || '' }}</label>
    </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
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
    transition: background var(--attr-duration) var(--nimiq-ease);

    ::v-deep svg.triangle-down-icon {
        position: absolute;
        right: 4rem;
        top: 8rem;
        opacity: 0.25;
        transition: opacity var(--attr-duration) var(--nimiq-ease);
    }

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);

        ::v-deep svg.triangle-down-icon {
            opacity: 0.4;
        }
    }

    svg.bank-icon {
        height: 8.25rem;
        width: auto;
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
