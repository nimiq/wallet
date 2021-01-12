<template>
    <div class="country-flag">
        <img :src="path" v-if="imageIsVisible"/>
        <span class="placeholder" v-else>{{ code }}</span>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api';
import Avatar from './Avatar.vue';

export default defineComponent({
    props: {
        code: String,
    },
    setup(props) {
        const imageIsVisible = ref(false);
        const path = ref<string>('');

        watch(() => props.code, (newCode, oldCode) => {
            if (oldCode === newCode) return;

            import(
                /* webpackChunkName: "square-flag-[request]" */
                `../assets/flags/square/${props.code}.svg`)
                .then((data) => {
                    path.value = data.default;
                    imageIsVisible.value = true;
                })
                .catch(() => {
                    imageIsVisible.value = false;
                });
        });

        return {
            path,
            imageIsVisible,
        };
    },
    components: {
        Avatar,
    },
});
</script>

<style lang="scss" scoped>
.country-flag {
    --size: 2.625rem;
    width: var(--size);
    height: var(--size);

    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: calc(var(--size) / 2);

    img {
        height: 100%;
        width: auto;
    }

    .placeholder {
        font-size: var(--small-size);
        background: var(--nimiq-blue-bg);
        color: white;
        width: 100%;
        line-height: var(--size);
    }
}
</style>
