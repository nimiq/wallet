const drawRoundedRectBox = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => {
    const width = text.length * 7;
    const height = 10;
    const r = 10;
    const x0 = x - (width / 2.0) - r;
    const y0 = y - (height / 2.0) - r;
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';

    ctx.beginPath();
    ctx.moveTo(x0 + r, y0);
    ctx.lineTo(x0 + r + width, y0);
    ctx.quadraticCurveTo(x0 + (r * 2) + width, y0, x0 + (2 * r) + width, y0 + r);
    ctx.lineTo(x0 + (2 * r) + width, y0 + height);
    ctx.quadraticCurveTo(x0 + (r * 2) + width, y0 + r + height, x0 + width + r, y0 + r + height);
    ctx.lineTo(x0 + r, y0 + r + height);
    ctx.quadraticCurveTo(x0, y0 + r + height, x0, y0 + height);
    ctx.lineTo(x0, y0 + r);
    ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    ctx.fill();
    ctx.closePath();
    ctx.fillStyle = 'rgba(33, 188, 165, 1.0)';
    ctx.fillText(text, x0 + r, y0 + (1.5 * r));
};

const points = [
    { x: 195, y: 110 },
    { x: 370, y: 81 },
    { x: 545, y: 52 },
];

const plugin = {
    id: 'staking-points',
    afterDatasetDraw: (chart: any, args: any) => {
        if (args.index !== 0) return;
        const ctx = chart.canvas.getContext('2d');
        ctx.save();
        ctx.font = 'bold 14px Muli';
        ctx.lineWidth = 3;

        ctx.strokeStyle = 'rgba(33, 188, 165, 1.0)';

        const yRange = args.meta._scaleRanges.ymax - args.meta._scaleRanges.ymin;

        for (let i = 0; i < args.meta._dataset.data.length; i++) {
            const point = args.meta._dataset.data[i];
            if (point) {
                const y = (152 - 16) - ((point.y - args.meta._scaleRanges.ymin) / yRange) * 152;
                const x = (point.y === 0) ? 0 : points[i - 1].x;

                const label = args.meta.data[i].$context.element.options.pointStyle;
                if (label.length > 0) {
                    drawRoundedRectBox(ctx, label, x, y);
                }
            }
        }
        ctx.restore();
    },
};

export default plugin;
