<template functional>
    <svg
        class="nq-icon"
        :class="[data.class, data.staticClass]"
        :style="[data.style, data.staticStyle]"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
        v-bind="data.attrs"
        v-on="listeners"
    >
        <line
            x1="8"
            y1="7.83301"
            x2="8"
            y2="11.333"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-width="1.5"
        />
        <circle cx="8" cy="4.75" r="0.5" fill="currentColor" stroke="currentColor" stroke-width="1" />
        <circle cx="8" cy="8" r="7.25" stroke="currentColor" stroke-width="1.5" fill="none" />
    </svg>
</template>
