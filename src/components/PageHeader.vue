<template>
    <div class="page-header nq-card-header" :class="progressIndicator ? 'has-progress-indicator' : ''">
        <div v-if="progressIndicator" class="progress-indicator">
            <div
                v-for="thisStep in progressSteps"
                class="indicator"
                :class="thisStep <= step ? 'active' : ''"
                :key="thisStep"
            ></div>
        </div>
        <a
            v-if="backArrow"
            href="#"
            class="page-header-back-button"
            @click.prevent="$emit('back')"
            :title="$t('Go back')"
        >
            <ArrowLeftIcon />
        </a>
        <h1 class="nq-h1"><slot></slot></h1>
        <slot name="more"></slot>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import ArrowLeftIcon from './icons/ArrowLeftIcon.vue';

export default defineComponent({
    props: {
        backArrow: {
            type: Boolean,
            default: false,
        },
        progressIndicator: {
            type: Boolean,
            default: false,
        },
        numberSteps: {
            type: Number,
            default: 6,
        },
        step: {
            type: Number,
            default: 1,
        },
    },
    emits: ['back'],
    setup(props) {
        const progressSteps = computed(() => {
            const list = [];
            for (let i = 1; i <= props.numberSteps; i++) list.push(i);
            return list;
        });

        return {
            progressSteps,
        };
    },
    components: {
        ArrowLeftIcon,
    },
});
</script>

<style lang="scss" scoped>
.page-header {
    position: relative;
}

.page-header-back-button {
    font-size: 3rem;
    position: absolute;
    left: 4rem;
    padding-top: 0.25rem;
    opacity: 0.4;
    transition:
        opacity 0.3s var(--nimiq-ease),
        transform 0.3s var(--nimiq-ease);
    color: inherit;

    svg {
        display: block;
    }

    &:hover,
    &:focus {
        opacity: 1;
        transform: translate3D(-0.375rem, 0, 0);
        outline: none;
    }

    &::after {
        content: '';
        display: block;
        position: absolute;
        left: -1.5rem;
        top: -1.5rem;
        right: -1.5rem;
        bottom: -1.5rem;
    }
}

@media (max-width: 450px) {
    // Don't move button left on mobile
    .page-header-back-button,
    .page-header-back-button:hover,
    .page-header-back-button:focus {
        left: 3rem;
        transform: none;
    }
}

.progress-indicator {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    padding: 0.5rem;
    position: absolute;
    left: 0;
    top: 0;

    .indicator {
        flex-grow: 1;
        height: 0.5rem;
        border-radius: 0.25rem;
        background: #e5e5e5;
        margin: 0.5rem;

        &.active {
            background: #24bdb6;
        }
    }
}

.page-header.has-progress-indicator h1,
.page-header.has-progress-indicator .page-header-back-button {
    margin-top: 1rem;
}
</style>
