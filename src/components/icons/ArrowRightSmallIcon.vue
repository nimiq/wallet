<template functional>
    <svg
        class="nq-icon"
        :class="[data.class, data.staticClass]"
        :style="[data.style, data.staticStyle]"
        width="16"
        height="12"
        viewBox="0 0 16 12"
        xmlns="http://www.w3.org/2000/svg"
        v-bind="data.attrs"
        v-on="listeners"
    >
        <path
            d="M10,1l5,5l-5,5"
            stroke="currentColor"
            fill="none"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
        <line
            x1="14"
            y1="6"
            x2="1"
            y2="6"
            stroke="currentColor"
            fill="none"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </svg>
</template>
