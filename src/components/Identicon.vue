<template>
    <div class="identicon">
        <img :src="dataUrl" />
    </div>
</template>

<script lang="ts">
// Resolves to @nimiq/iqons/dist/iqons.min.js via the package's browser field.
// @ts-expect-error Could not find a declaration file for module '@nimiq/iqons'.
import Iqons from '@nimiq/iqons';
import iqonsSvgUrl from '@nimiq/iqons/dist/iqons.min.svg?url';
import { ValidationUtils } from '@nimiq/utils';
import { defineComponent, ref, watch } from 'vue';

// The svg assets from which the identicons are composed.
Iqons.svgPath = iqonsSvgUrl;

// oxlint-disable-next-line eslint-js/max-len
const PLACEHOLDER_DATA_URL =
    'data:image/svg+xml,<svg width="64" height="64" viewBox="0 -4 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity=".1" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="url(%23identicon_radial)"/><defs><radialGradient id="identicon_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-63.0033 0 0 -56 63 56)"><stop stop-color="%23260133"/><stop offset="1" stop-color="%231F2348"/></radialGradient></defs></svg>';

function formatAddress(str: string) {
    return str.replace(/[+ ]/g, '').toUpperCase().match(/.{4}/g)!.join(' ');
}

const Identicon = defineComponent({
    props: {
        address: String,
    },
    setup(props) {
        const dataUrl = ref(PLACEHOLDER_DATA_URL);

        watch(
            () => props.address,
            async () => {
                if (props.address && ValidationUtils.isValidAddress(props.address)) {
                    dataUrl.value = await Iqons.toDataUrl(formatAddress(props.address));
                } else {
                    dataUrl.value = PLACEHOLDER_DATA_URL;
                }
            },
            { immediate: true },
        );

        return {
            dataUrl,
        };
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type Identicon = InstanceType<typeof Identicon>;
export default Identicon;
</script>

<style lang="scss" scoped>
.identicon {
    width: 10rem;
}

img {
    width: 100%;
    height: 100%;
}
</style>
