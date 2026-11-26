<template functional>
    <svg
        class="nq-icon"
        :class="[data.class, data.staticClass]"
        :style="[data.style, data.staticStyle]"
        width="74"
        height="74"
        viewBox="0 0 74 74"
        xmlns="http://www.w3.org/2000/svg"
        v-bind="data.attrs"
        v-on="listeners"
    >
        <path
            d="M71.12 1.84a4.5 4.5 0 0 0-6.28 1.04l-42.1 58.74L8.68 47.54a4.5 4.5 0 1 0-6.36 6.37l17.8 17.81a4.57 4.57 0 0 0 6.84-.56l45.2-63.03a4.5 4.5 0 0 0-1.04-6.29z"
            fill="currentColor"
            stroke="currentColor"
            stroke-width=".8"
        />
    </svg>
</template>
