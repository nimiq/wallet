<template>
    <div class="loading-list">
        <template v-if="type === LoadingListType.TRANSACTION">
            <div
                v-for="(item, index) in list"
                class="list-item loading transaction"
                :class="{ animating }"
                :style="{ '--delay': delay ? `${delay}ms` : `${index * 100}ms` }"
                :key="index"
            >
                <div class="date flex-column">
                    <div class="placeholder"></div>
                    <div class="placeholder"></div>
                </div>
                <HexagonIcon class="identicon"/>
                <div class="data flex-column">
                    <div class="placeholder"></div>
                    <div class="placeholder"></div>
                </div>
                <div class="amounts flex-column">
                    <div class="placeholder"></div>
                    <div class="placeholder"></div>
                </div>
            </div>
        </template>
        <template v-else-if="LoadingListType.VALIDATOR">
            <div
                v-for="(item, index) in list"
                class="list-item loading validator"
                :class="{ animating }"
                :style="{ '--delay': delay ? `${delay}ms` : `${index * 100}ms` }"
                :key="index"
            >
                <HexagonIcon class="identicon"/>
                <div class="data flex-column">
                    <div class="placeholder"></div>
                    <div class="placeholder"></div>
                </div>
                <div class="amounts flex-column">
                    <div class="placeholder"></div>
                </div>
            </div>
        </template>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { HexagonIcon } from '@nimiq/vue-components';

export enum LoadingListType {
    TRANSACTION,
    VALIDATOR,
}

export default defineComponent({
    props: {
        delay: Number, // in milliseconds
        length: {
            type: Number,
            default: 1,
        },
        type: {
            type: Number as () => LoadingListType,
            default: LoadingListType.TRANSACTION,
        },
    },
    setup(props) {
        const list = computed(() => Array.from({ length: props.length }));
        const animating = ref(false);

        onMounted(() => {
            setTimeout(() => {
                animating.value = true;
            });
        });

        onUnmounted(() => {
            animating.value = false;
        });

        return {
            LoadingListType,
            list,
            animating,
        };
    },
    components: {
        HexagonIcon,
    },
});
</script>

<style lang="scss" scoped>

.list-item {
    --delay: 0ms;
    --color: var(--text-6);

    position: relative;
}

.loading {
    cursor: progress;
    height: 10rem;
    padding: 2rem 1rem;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
}

.placeholder,
.identicon {
    animation-name: breathing;
    animation-duration: 1s;
    animation-iteration-count: infinite;
    animation-delay: calc(1s + var(--delay));

    opacity: 0;
    transform: translateY(2px);
    transition: {
        property: opacity, transform;
        duration: 1s;
        delay: var(--delay);
    }

    .list-item.animating.loading & {
        opacity: 1;
        transform: translateY(0);
    }

    @keyframes breathing {
        50% {
            opacity: .5;
            transform: translateY(2px);
        }
    }
}

.placeholder {
    background-color: var(--color);
    border-radius: 0.5rem;
}

.date,
.data,
.amounts {
    justify-content: space-between;
    height: 4.25rem;
    animation-delay: calc(1s + var(--delay));

    .placeholder {
        width: 100%;
        height: 1rem;
        max-width: 51rem;

        &:first-child {
            height: 1.875rem;
        }
    }
}

.date {
    align-items: center;
    margin-left: 1rem;
    margin-right: 1.25rem;

    .placeholder {
        width: 2.25rem;

        &:last-child {
            width: 3rem;
        }
    }
}
.identicon {
    height: 6rem;
    width: 6rem;
    color: var(--color);

    .transaction & {
        margin: 0 1rem;
    }
}
.data {
    flex-grow: 1;
    margin: 0 5vw 0 1.5rem;

    .placeholder {
        &:last-child {
            width: 30%;
            min-width: 5rem;
            max-width: 20rem;
        }
    }
}
.amounts {
    width: 8%;
    min-width: 8rem;
    align-items: flex-end;

    .placeholder {
        &:last-child {
            width: 55%;
        }
    }
}

</style>
