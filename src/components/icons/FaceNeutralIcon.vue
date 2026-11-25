<template functional>
    <svg
        class="nq-icon"
        :class="[data.class, data.staticClass]"
        :style="[data.style, data.staticStyle]"
        width="102"
        height="102"
        viewBox="0 0 102 102"
        xmlns="http://www.w3.org/2000/svg"
        v-bind="data.attrs"
        v-on="listeners"
    >
        <circle cx="51" cy="51" r="48" stroke="currentColor" fill="none" stroke-width="6" />
        <circle cx="35.1485" cy="40.6627" r="4.82432" fill="currentColor" />
        <circle cx="66.8514" cy="40.6622" r="4.82432" fill="currentColor" />
        <path
            d="M39 68.9863C39 68.9863 44.8244 68.9863 51.0271 68.9863C57.2298 68.9863 63.0541 68.9863 63.0541 68.9863"
            stroke="currentColor"
            fill="none"
            stroke-width="6"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </svg>
</template>
