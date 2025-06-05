<template>
    <button @click="$emit('toggle-unclaimed-cashlink-list')" @mousedown.prevent>
        <div class="cashlink-button" :class="showUnclaimedCashlinkList ? 'active' : ''">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="18" viewBox="0 0 12 18" fill="none">
                <path
                    d="M10.5 4.125C10.5 2.375 8.97692 1 7.03846 1H4.96154C3.02308
                    1 1.5 2.375 1.5 4.125V7.875C1.5 9.625 3.02308 11 4.96154 11H5.65385"
                    stroke-width="2" stroke-linecap="round" />
                <path
                    d="M1.5 13.875C1.5 15.625 3.02308 17 4.96154 17L7.03846
                    17C8.97692 17 10.5 15.625 10.5 13.875L10.5 10.125C10.5 8.375 8.97692 7 7.03846 7L6.34615 7"
                    stroke-width="2" stroke-linecap="round" />
            </svg>
        </div>
        <div class="notification-dot">
            <span class="text">{{ unclaimedCashlinkCount }}</span>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    setup() {
        return {
        };
    },
    props: {
        unclaimedCashlinkCount: {
            type: Number,
        },
        showUnclaimedCashlinkList: {
            type: Boolean,
            default: false,
        },
    },
    components: {
    },
});
</script>

<style lang="scss" scoped>
button {
    position: relative;
    background: transparent;
    border-width: 0;
    cursor: pointer;
}

.cashlink-button {
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2rem;
    background: var(--nimiq-blue-bg);

    transition: background var(--attr-duration) var(--nimiq-ease);

    svg {
        stroke: white;
    }
}

.active {
    background: transparent;
    border: 1.5px solid rgba(31, 35, 72, 0.16);

    svg {
        stroke: var(--nimiq-blue);
    }
}

.notification-dot {
    position: absolute;
    bottom: -1rem;
    right: 0;
    padding: 2.5px 5px;
    font-size: 11px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2rem;
    border: 0.375rem solid var(--bg-primary);
    transition: border-color 400ms var(--nimiq-ease);
    color: white;
    font-family: Muli;
    background: var(--light-blue-gradient, radial-gradient(100% 100% at 100% 100.00%, #265DD7 0%, #0582CA 100%));

    .text {
        font-size: 11px;
        font-weight: 600;
        line-height: 100%;
    }
}</style>
