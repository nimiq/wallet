<template>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 69" class="usdt">
        <path v-if="!hole" fill="#fff" d="M 19.596219,7.6270475 H 66.430976 V 44.958728 c -15.933124,8.870098 -31.518243,8.139987 -46.834757,0 z" />
        <path fill-rule="evenodd" clip-rule="evenodd" d="M18.97.1h49.25c1.17 0 2.26.61 2.85 1.6L85.4 25.88a3.11 3.11 0 0 1-.53 3.86l-39.5 37.85a3.36 3.36 0 0 1-4.62 0L1.32 29.79a3.11 3.11 0 0 1-.49-3.93L16.17 1.62A3.3 3.3 0 0 1 18.97.1Zm42.89 10.8v6.79H47.83v4.7c9.85.5 17.25 2.57 17.3 5.04v5.17c-.05 2.47-7.45 4.54-17.3 5.04v11.55h-9.32V37.64c-9.85-.5-17.24-2.57-17.3-5.04v-5.17c.06-2.47 7.45-4.54 17.3-5.04v-4.7H24.5v-6.8h37.37ZM43.17 34.1c10.52 0 19.3-1.75 21.46-4.09-1.83-1.97-8.42-3.53-16.8-3.96v4.93a91.59 91.59 0 0 1-9.32 0v-4.93c-8.37.43-14.97 1.99-16.8 3.96 2.16 2.34 10.95 4.08 21.46 4.08Z" fill="currentColor"/>
    </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        hole: {
            type: Boolean,
            default: false,
        },
    },
});
</script>
