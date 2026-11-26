<template functional>
    <svg
        class="nq-icon"
        :class="[data.class, data.staticClass]"
        :style="[data.style, data.staticStyle]"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        v-bind="data.attrs"
        v-on="listeners"
    >
        <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M12 4.6c4.4-.06 8.79 3.01 11.43 5.92.75.84.75 2.11 0 2.95-2.61 2.88-6.94 5.93-11.28 5.93h-.31c-4.33 0-8.66-3.05-11.27-5.93a2.21 2.21 0 0 1 0-2.95C3.2 7.62 7.6 4.54 12 4.6zm0 2.8a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2z"
            fill="currentColor"
        />
        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor" />
    </svg>
</template>
