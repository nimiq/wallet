<template>
    <div class="line-chart flex-column" :style="containerStyle">
        <svg ref="svg$" xmlns="http://www.w3.org/2000/svg" :viewBox="viewBox" :preserveAspectRatio="preserveAspectRatio"
            :style="{ opacity: points.length >= 2 ? 1 : 0 }">
            <path ref="path$"
                :d="path"
                fill="none"
                :stroke="stroke"
                :opacity="strokeOpacity"
                :stroke-width="strokeWidth"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
        <slot></slot>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onMounted, onUnmounted } from 'vue';

interface Point {
    x: number;
    y: number;
}

interface ChartDimensions {
    width: number;
    height: number;
    strokeWidth: number;
    padding: number;
}

// Chart utility functions
const calculateViewBox = (dimensions: ChartDimensions) => (
    `-${dimensions.strokeWidth / 2} -${dimensions.padding} `
    + `${dimensions.width + dimensions.strokeWidth} ${dimensions.height + 2 * dimensions.padding}`
);

const calculatePath = (points: Point[], dimensions: ChartDimensions, smoothingFactor: number): string => {
    if (points.length < 2) return '';

    const { width, height } = dimensions;

    // Normalize data points to the SVG's X and Y axis
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const xScaleFactor = width / (maxX - minX || 1);

    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));
    const yScaleFactor = height / (maxY - minY || 1);

    const normalizedPoints = points.map((point) => ({
        x: (point.x - minX) * xScaleFactor,
        y: height - (point.y - minY) * yScaleFactor, // subtract from height as in SVG y-axis 0 is on top
    }));

    // Helper functions for curve calculations
    const lineFromPointToPoint = (start: Point, end: Point) => {
        const x = start.x - end.x;
        const y = start.y - end.y;
        return {
            length: Math.sqrt(x ** 2 + y ** 2),
            angle: Math.atan2(y, x),
        };
    };

    const controlPoint = (
        current: Point,
        previous: Point | null,
        next: Point | null,
        isEnd = false,
    ): Point => {
        const p = previous || current;
        const n = next || current;

        const line = lineFromPointToPoint(p, n);

        return {
            x: current.x - Math.cos(line.angle + (isEnd ? Math.PI : 0)) * line.length * smoothingFactor,
            y: current.y - Math.sin(line.angle + (isEnd ? Math.PI : 0)) * line.length * smoothingFactor,
        };
    };

    // Generate SVG path
    return normalizedPoints.map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;

        const prev = index > 0 ? normalizedPoints[index - 1] : null;
        const next = index < normalizedPoints.length - 1 ? normalizedPoints[index + 1] : null;

        const cp1 = controlPoint(prev!, normalizedPoints[index - 2] || null, point);
        const cp2 = controlPoint(point, prev, next, true);

        return `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${point.x} ${point.y}`;
    }).join(' ');
};

const animatePath = async (pathElement: SVGPathElement): Promise<void> => {
    // Reset strokeDashArray
    pathElement.style.strokeDasharray = '';
    // Wait for strokeDasharray reset to be applied
    await new Promise((resolve) => { requestAnimationFrame(resolve); });

    const pathLength = pathElement.getTotalLength();
    pathElement.style.strokeDasharray = `0 ${pathLength}`;
    // Wait for initial strokeDasharray to be applied
    await new Promise((resolve) => { requestAnimationFrame(resolve); });
    // Wait one more frame to be ready for the animation
    await new Promise((resolve) => { requestAnimationFrame(resolve); });

    pathElement.style.strokeDasharray = `${pathLength} 0`;
};

export default defineComponent({
    name: 'LineChartComponent',
    props: {
        points: {
            type: Array as () => Point[],
            required: true,
            validator: (points: Point[]) => points.every((p) =>
                typeof p.x === 'number' && typeof p.y === 'number'),
        },
        width: {
            type: [Number, String],
            default: '100%',
        },
        height: {
            type: [Number, String],
            default: '100%',
        },
        stroke: {
            type: String,
            default: 'currentColor',
        },
        strokeWidth: {
            type: Number,
            default: 2.5,
        },
        strokeOpacity: {
            type: Number,
            default: 0.5,
        },
        padding: {
            type: Number,
            default: 5,
        },
        preserveAspectRatio: {
            type: String,
            default: 'none',
        },
        smoothingFactor: {
            type: Number,
            default: 0.2,
        },
        animate: {
            type: Boolean,
            default: true,
        },
    },
    setup(props) {
        const svg$ = ref<SVGElement | null>(null);
        const path$ = ref<SVGPathElement | null>(null);

        // Calculate SVG size
        const dimensions = ref<ChartDimensions>({
            width: 120,
            height: 52,
            strokeWidth: props.strokeWidth,
            padding: props.padding,
        });

        const containerStyle = computed(() => ({
            width: typeof props.width === 'number' ? `${props.width}px` : props.width,
            height: typeof props.height === 'number' ? `${props.height}px` : props.height,
        }));

        const viewBox = computed(() => calculateViewBox(dimensions.value));

        const path = computed(() => calculatePath(
            props.points,
            dimensions.value,
            props.smoothingFactor,
        ));

        const onResize = () => requestAnimationFrame(() => {
            if (!svg$.value) return;
            const svgBoundingBox = svg$.value.getBoundingClientRect();
            dimensions.value = {
                ...dimensions.value,
                width: svgBoundingBox.width,
                height: svgBoundingBox.height,
            };
        });

        onMounted(() => {
            window.addEventListener('resize', onResize);
            onResize();
        });

        onUnmounted(() => window.removeEventListener('resize', onResize));

        // Handle animation
        let shouldAnimate = props.animate;

        watch(() => props.points, async () => {
            if (!path$.value || !shouldAnimate) return;
            if (props.points.length >= 2) {
                await animatePath(path$.value);
                shouldAnimate = false;
            } else {
                path$.value.style.strokeDasharray = '';
            }
        });

        return {
            svg$,
            path$,
            viewBox,
            path,
            containerStyle,
        };
    },
});
</script>

<style lang="scss" scoped>
.line-chart {
    position: relative;
}

svg {
    flex-grow: 1;
    transition: opacity .3s var(--nimiq-ease);

    path {
        transition: stroke-dasharray 1.2s linear;
    }
}
</style>
