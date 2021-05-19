import { PointElement } from 'chart.js';

const getElevationAtPoint = (x: number, list: Array<PointElement>) => {
    let pos = -1;
    for (let i = 0; i < list.length; i++) {
        if (x <= list[i].x) {
            pos = i;
            break;
        }
    }
    if (pos < 0) return false;
    if (pos > 0) {
        const sX = list[pos].x - list[pos - 1].x;
        const sY = list[pos - 1].y;
        const dSx = (x - list[pos - 1].x) / sX;
        const dSy = list[pos].y - list[pos - 1].y;
        return sY + (dSy * dSx);
    }
    return list[pos].y;
};

const getCutoutAtPoint = (y: number, list: Array<PointElement>) => {
    let pos = -1;
    for (let i = 0; i < list.length; i++) {
        if (y <= list[i].y) {
            pos = i;
            break;
        }
    }
    if (pos < 0) return false;
    if (pos > 0) {
        const sY = list[pos].y - list[pos - 1].y;
        const sX = list[pos - 1].x;
        const dSy = (y - list[pos - 1].y) / sY;
        const dSx = list[pos].x - list[pos - 1].x;
        return sX + (dSy * dSx);
    }
    return list[pos].x;
};

const plugin = {
    id: 'staking-grid',
    afterDatasetDraw: (chart: any, args: any) => {
        if (args.index === 0) return;
        const ctx = chart.canvas.getContext('2d');

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(166, 167, 182, 0.4)';

        const width = 518;
        const height = 103;

        const offset = [0, -1];
        const gaps = [18 / 2.0, 18];

        for (let x = 5; x <= width; x += gaps[0]) {
            const elevation = getElevationAtPoint(x + offset[0], args.meta.data);
            if (elevation !== false) {
                ctx.beginPath();
                ctx.moveTo(x + offset[0], elevation);
                ctx.lineTo(x + offset[0], height + (gaps[1] - 7) + offset[1]);
                ctx.stroke();
                ctx.closePath();
            }
            offset[0] += 0.075;
        }
        offset[0] = 0;

        for (let y = 0; y <= height + gaps[1]; y += gaps[1]) {
            let cutoff = null;
            if (args.index === 1) {
                cutoff = getCutoutAtPoint(y + 5 + offset[1], args.meta.data);
                if (cutoff === false) {
                    continue;
                }
            }
            ctx.beginPath();

            ctx.moveTo(
                (args.index === 1) ? cutoff : offset[0],
                y + 5 + offset[1],
            );
            ctx.lineTo(width + offset[0], y + 5 + offset[1]);
            ctx.stroke();
            ctx.closePath();
        }

        if (args.index === 2) {
            // ctx.scale(.5, .5);
        }

        ctx.restore();
    },
};

export default plugin;
