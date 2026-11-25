<template>
    <canvas v-if="!!data" class="qr-code" ref="canvas$"></canvas>
</template>

<script lang="ts">
import QrCreator from 'qr-creator';
import { defineComponent, PropType, ref, watch } from 'vue';
import { nextTick } from '@/lib/nextTick';

const COLOR_REGEX = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;

function isValidColor(color: unknown) {
    return typeof color === 'string' && COLOR_REGEX.test(color);
}

/**
 * Nimiq QR Code Component
 */
const QrCode = defineComponent({
    props: {
        // The data to render
        data: String,
        // Error correction level according to QR specs
        errorCorrection: {
            type: String as () => QrCreator.ErrorCorrectionLevel,
            default: 'M',
            validator: (errorCorrectionLevel: string) => ['L', 'M', 'H', 'Q'].indexOf(errorCorrectionLevel) !== -1,
        },
        // Roundness of QR code modules. Recommended value: .5
        radius: {
            type: Number,
            default: 0.5,
            validator: (radius: number) => radius >= 0 && radius <= 0.5,
        },
        // Fill of QR code
        fill: {
            type: null as unknown as PropType<string | QrCreator.LinearGradient | QrCreator.RadialGradient>,
            // default equivalent to nimiq-light-blue-bg
            default: () => ({
                type: 'radial-gradient',
                // circle centered in bottom right corner with radius of the size of qr code diagonal
                position: [1, 1, 0, 1, 1, Math.sqrt(2)],
                colorStops: [
                    [0, '#265DD7'],
                    [1, '#0582CA'], // nimiq-light-blue
                ],
            }),
            validator: (fill: string | QrCreator.LinearGradient | QrCreator.RadialGradient) => {
                if (isValidColor(fill)) return true;
                if (typeof fill === 'string') return false;
                const isValidGradient =
                    ((fill.type === 'linear-gradient' && fill.position.length === 4)
                        || (fill.type === 'radial-gradient' && fill.position.length === 6))
                    && fill.position.every((coordinate) => typeof coordinate === 'number');
                if (!isValidGradient) return false;
                const hasValidGradientStops =
                    fill.colorStops.length >= 2
                    && fill.colorStops.every(([offset, color]) => typeof offset === 'number' && isValidColor(color));
                return hasValidGradientStops;
            },
        },
        // Background color of QR code. null means transparent.
        background: {
            type: null as unknown as PropType<string | null>,
            default: null,
            validator: (background: string | null) => background === null || COLOR_REGEX.test(background),
        },
        // Width and height of QR code
        size: {
            type: Number,
            default: 240,
            validator: (size: number) => size > 0,
        },
    },
    setup(props) {
        const canvas$ = ref<HTMLCanvasElement | null>(null);

        async function toDataUrl(type = 'image/png') {
            if (!props.data) return 'data:,';
            await nextTick(); // Make sure the canvas is in the DOM (it depends on !!data)
            return canvas$.value!.toDataURL(type);
        }

        async function updateQrCode() {
            if (!props.data) return;
            await nextTick(); // Make sure the canvas is in the DOM (it depends on !!data)
            QrCreator.render(
                {
                    text: props.data,
                    radius: props.radius,
                    ecLevel: props.errorCorrection,
                    fill: props.fill,
                    background: props.background,
                    size: props.size,
                },
                canvas$.value!,
            );
        }

        watch(() => props.data, updateQrCode, { immediate: true });
        watch(
            [
                () => props.errorCorrection,
                () => props.radius,
                () => props.fill,
                () => props.background,
                () => props.size,
            ],
            updateQrCode,
        );

        return {
            canvas$,
            toDataUrl,
        };
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type QrCode = InstanceType<typeof QrCode>;
export default QrCode;
</script>
