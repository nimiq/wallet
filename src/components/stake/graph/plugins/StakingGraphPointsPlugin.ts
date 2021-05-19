const drawRoundedRectBox = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => {
    const width = text.length * 9;
    const height = 14;
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
    ctx.fillText(text, x - ((width - r) / 2.0), y - ((height - r) / 2.0) + 2.0);
};

const getPosInInterval = (n = 1, min = 1, max = 1, mag = 518) =>
    ((n - min) / Math.max(1, (max - min))) * mag;

const plugin = {
    id: 'staking-points',
    afterDatasetDraw: (chart: any, args: any) => {
        // console.info("atChartStakingPointsPlugin", { chart, args });

        if (args.index !== 0) return;
        const ctx = chart.canvas.getContext('2d');
        ctx.save();
        ctx.font = 'bold 14px Muli';
        ctx.lineWidth = 3;

        ctx.strokeStyle = 'rgba(33, 188, 165, 1.0)';

        for (let i = 0; i < args.meta._dataset.data.length; i++) {
            const point = args.meta._dataset.data[i];
            if (point) {
                const x = getPosInInterval(point.x, args.meta._scaleRanges.xmin, args.meta._scaleRanges.xmax);
                const y = Math.min(
                    110,
                    140 - getPosInInterval(point.y, args.meta._scaleRanges.ymin, args.meta._scaleRanges.ymax, 165),
                );
                const label = args.meta.data[i].$context.element.options.pointStyle;
                if (label.length > 0) {
                    drawRoundedRectBox(ctx, label, x, y);
                }
            }
        }
        // ctx.scale(0.5, 0.5);
        ctx.restore();
    },
};

export default plugin;
