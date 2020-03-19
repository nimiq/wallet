import bitmap from '../data/NetworkBitMap';
// import GeoIp from '../lib/GeoIp';
import RobinsonProjection from './RobinsonProjection';

// factor of distance between the 2 points
const CURVINESS_LENGTH = .33;
// offset on a circle
const CURVINESS_ANGLE = Math.PI / 6;

const NETWORK_MAP_WIDTH = 129;
const NETWORK_MAP_HEIGHT = 52;
const VERTICAL_HEXAGON_DISTANCE = 1.142;
const HORIZONTAL_HEXAGON_OVERLAP = .98;
const WIDTH = 1082;
const HEIGHT = 502;

class Hexagon {
    public static scale = (2 * WIDTH) / (NETWORK_MAP_WIDTH * HORIZONTAL_HEXAGON_OVERLAP);

    public position: {x: number, y: number} = {
        x: 0,
        y: 0,
    }

    protected animationState = 0;

    public constructor(x: number, y: number) {
        this.position.x = x;
        this.position.y = y;
    }

    /**
     * x coordinate of top left border of the bounding box
     */
    public get x() {
        return this.position.x * Hexagon.scale * HORIZONTAL_HEXAGON_OVERLAP;
    }

    /**
     * y coordinate of top left border of the bounding box
     */
    public get y() {
        const off = this.position.x % 2 === 0 ? .5 : 0;
        return (this.position.y + off) * Hexagon.scale * VERTICAL_HEXAGON_DISTANCE - .5 * Hexagon.scale;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public draw(dc: CanvasRenderingContext2D, frameTime: number): boolean {
        dc.lineWidth = 1;
        dc.beginPath();
        dc.moveTo(this.x + .22 * Hexagon.scale, this.y + .04 * Hexagon.scale);
        dc.arc(
            this.x + .298 * Hexagon.scale,
            this.y + .0825 * Hexagon.scale,
            .0825 * Hexagon.scale,
            (7 / 6) * Math.PI,
            1.5 * Math.PI,
        );
        dc.lineTo(this.x + .71 * Hexagon.scale, this.y);
        dc.arc(
            this.x + .71 * Hexagon.scale,
            this.y + .0825 * Hexagon.scale,
            .0825 * Hexagon.scale,
            1.5 * Math.PI,
            (11 / 6) * Math.PI,
        );
        dc.lineTo(this.x + .9875 * Hexagon.scale, this.y + .4 * Hexagon.scale);
        dc.arc(
            this.x + .9175 * Hexagon.scale,
            this.y + .445 * Hexagon.scale,
            .0825 * Hexagon.scale,
            (11 / 6) * Math.PI,
            (1 / 6) * Math.PI,
        );
        dc.lineTo(this.x + .78 * Hexagon.scale, this.y + .85 * Hexagon.scale);
        dc.arc(
            this.x + .71 * Hexagon.scale,
            this.y + .8075 * Hexagon.scale,
            .0825 * Hexagon.scale,
            (1 / 6) * Math.PI,
            .5 * Math.PI,
        );
        dc.lineTo(this.x + .29 * Hexagon.scale, this.y + .89 * Hexagon.scale);
        dc.arc(
            this.x + .2980 * Hexagon.scale,
            this.y + .8075 * Hexagon.scale,
            .0825 * Hexagon.scale,
            .5 * Math.PI,
            (5 / 6) * Math.PI,
        );
        dc.lineTo(this.x + .0125 * Hexagon.scale, this.y + .49 * Hexagon.scale);
        dc.arc(
            this.x + .0825 * Hexagon.scale,
            this.y + .445 * Hexagon.scale,
            .0825 * Hexagon.scale,
            (5 / 6) * Math.PI,
            (7 / 6) * Math.PI,
        );
        dc.closePath();
        dc.fill();
        return false;
    }
}

class SelfHexagon extends Hexagon {
    private static ANIMATION_TIME = 5000;
    public draw(dc: CanvasRenderingContext2D, frameTime: number): boolean {
        this.animationState = Math.min(this.animationState + frameTime / SelfHexagon.ANIMATION_TIME, 1);
        dc.fillStyle! = `rgba(255, 0, 0, ${this.animationState}`;
        dc.strokeStyle = `rgba(255, 0, 0, ${this.animationState}`;

        super.draw(dc, frameTime);

        return this.animationState !== 1;
    }
}

class ConnectedPeerHexagon extends Hexagon {
    private static ANIMATION_TIME = 1000;

    public constructor(x: number, y: number, private self: SelfHexagon) {
        super(x, y);
    }

    public draw(dc: CanvasRenderingContext2D, frameTime: number): boolean {
        this.animationState = Math.min(this.animationState + frameTime / ConnectedPeerHexagon.ANIMATION_TIME, 1);

        dc.strokeStyle = `rgba(255, 255, 255, ${this.animationState})`;
        dc.fillStyle! = `rgba(0, 255, 0, ${this.animationState})`;

        super.draw(dc, frameTime);
        this!.drawSplineFrom(this.self, dc);

        return this.animationState !== 1;
    }

    private drawSplineFrom(from: Hexagon, dc: CanvasRenderingContext2D) { // TODO elipsis for animation?
        dc.lineWidth = 2;
        // middle points of each hexagon, note that hexagons are .89 the height of their width
        const xPeer = this.x + .5 * Hexagon.scale;
        const yPeer = this.y + .445 * Hexagon.scale;
        const xSelf = from.x + .5 * Hexagon.scale;
        const ySelf = from.y + .445 * Hexagon.scale;

        // TODO figure out something more elegant
        let angle = (Math.atan2(yPeer - ySelf, xPeer - xSelf));
        let counterAngle = 0;
        if (Math.abs(angle) > Math.PI / 2) { // atan2 returns positive and negative numbers between 0 and Math.PI
            counterAngle = angle + Math.PI - CURVINESS_ANGLE;
            angle += CURVINESS_ANGLE;
        } else {
            counterAngle = angle + Math.PI + CURVINESS_ANGLE;
            angle -= CURVINESS_ANGLE;
        }

        const distance = Math.sqrt((xSelf - xPeer) ** 2 + (ySelf - yPeer) ** 2);

        dc.beginPath();
        dc.moveTo(
            xSelf + Math.cos(angle) * Hexagon.scale,
            ySelf + Math.sin(angle) * Hexagon.scale * .89,
        );
        dc.bezierCurveTo(
            xSelf + Math.cos(angle) * CURVINESS_LENGTH * distance,
            ySelf + Math.sin(angle) * .89 * CURVINESS_LENGTH * distance,
            xPeer + Math.cos(counterAngle) * CURVINESS_LENGTH * distance,
            yPeer + Math.sin(counterAngle) * .89 * CURVINESS_LENGTH * distance,
            xPeer + Math.cos(counterAngle) * Hexagon.scale,
            yPeer + Math.sin(counterAngle) * Hexagon.scale * .89,
        );
        dc.stroke();
    }
}

export default class NetworkMap {
    private _hexagons: Hexagon[] = [];
    private _self: SelfHexagon | null = null;
    private _peers: ConnectedPeerHexagon[] = [];
    private _drawTimeout = 0;
    private _lastFrameTime = 0;
    private _mapDc: CanvasRenderingContext2D;
    private _overlayDc: CanvasRenderingContext2D;
    private _container: HTMLElement;

    public constructor(private _mapCanvas: HTMLCanvasElement, private _overlayCanvas: HTMLCanvasElement) {
        if (!_mapCanvas.parentElement
            || !_overlayCanvas.parentElement
            || _overlayCanvas.parentElement !== _mapCanvas.parentElement) {
            throw new Error(
                'NetworkMap.constructor: canvases need to have a parent and it needs tobe the  same for both',
            );
        }
        this._mapDc = _mapCanvas.getContext('2d') as CanvasRenderingContext2D;
        this._overlayDc = _overlayCanvas.getContext('2d') as CanvasRenderingContext2D;
        this._container = _mapCanvas.parentElement;

        _mapCanvas.width = 2 * WIDTH;
        _mapCanvas.height = 2 * HEIGHT;

        _overlayCanvas.width = 2 * WIDTH;
        _overlayCanvas.height = 2 * HEIGHT;

        // build Hexagon Map (TODO: might as well be compile time)
        for (let x = 0; x < NETWORK_MAP_WIDTH; x++) {
            // hexagons[x] = new Array(NETWORK_MAP_HEIGHT);
            for (let y = 0; y < NETWORK_MAP_HEIGHT; y++) {
                if (bitmap[x][y] === 1) this._hexagons.push(new Hexagon(x, y));
            }
        }

        window.onresize = () => {
            if (!this._drawTimeout) {
                this._drawTimeout = window.setTimeout(this.draw.bind(this), 30); // ~ 30 fps
            }
        };

        // set up self location
        // GeoIp.retrieveOwn((response: {location: {longitude: number, latitude: number}}) => {
        //     if (response && response.location && response.location.latitude) {
        //         self = hexagonByCoordinate(response.location.latitude, response.location.longitude);
        //         draw();
        //     }
        // });

        const selfPosition = this.hexagonByCoordinate(49.224205, 6.989839); // Saarbrücken for now
        this._self = new SelfHexagon(selfPosition.x, selfPosition.y);

        this.draw();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public addPeer(host: string) { // TODO
        if (this._self) {
            const index = Math.floor(Math.random() * this._hexagons.length);
            this._peers.push(new ConnectedPeerHexagon(
                this._hexagons[index].position.x,
                this._hexagons[index].position.y, this._self,
            ));
            this.draw();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public removePeer(host: string) { // TODO
        this._peers.splice(0, 1);
        this.draw();
    }

    public get peerCount() {
        return this._peers.length;
    }

    private frameTime(currentTime: number) {
        if (this._lastFrameTime) {
            const frameTime = currentTime - this._lastFrameTime;
            this._lastFrameTime = currentTime;

            return frameTime;
        }
        this._lastFrameTime = currentTime;
        return 0;
    }

    // eslint-disable-next-line class-methods-use-this
    private hexagonByCoordinate(latitude: number, longitude: number): {x: number, y: number} {
        // the map that we have is cropped out from the full robinson projected map. We have to make
        // the computation on the full/original map, so we calculate the full size.
        console.error(latitude, longitude);
        const fullMapWidth = 1.0946808510638297 * 2 * WIDTH;
        const fullMapHeight = fullMapWidth / 1.97165551906973; // RobinsonProjection maps have a fixed aspect ratio
        const point = RobinsonProjection.project(fullMapWidth, latitude, longitude);
        // the origin is centered in the middle of the map, so we translate it
        // to the top left corner
        point.x = fullMapWidth / 2 + point.x;
        point.y = fullMapHeight / 2 - point.y;
        // the map that we have is robinson projected and then cropped out and scaled
        point.x = Math.max(0, point.x - 0.07045675413022352 * fullMapWidth);
        point.y = Math.max(0, point.y - 0.012380952380952381 * fullMapHeight);

        const xHexagon = Math.floor(point.x / (Hexagon.scale * HORIZONTAL_HEXAGON_OVERLAP));
        const off = (xHexagon % 2 === 0 ? .5 : 0);
        return {
            x: xHexagon,
            y: Math.floor(
                (point.y + .5 * Hexagon.scale) / (Hexagon.scale * VERTICAL_HEXAGON_DISTANCE) - off,
            ),
        };
    }

    private drawOverlay(frameTime: number) {
        this._overlayDc.clearRect(0, 0, 2 * WIDTH, 2 * HEIGHT);
        if (this._self) {
            let animating = false;
            animating = this._self.draw(this._overlayDc, frameTime) || animating;
            for (const peer of this._peers) {
                animating = peer.draw(this._overlayDc, frameTime) || animating;
            }
            return animating;
        }
        return false;
    }

    private drawMap(frameTime: number) {
        this._mapDc.clearRect(0, 0, 2 * WIDTH, 2 * HEIGHT);
        this._mapDc.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this._mapDc.fillStyle! = 'rgba(255, 255, 255, 0.2)';
        this._hexagons.forEach((hexagon) => hexagon.draw(this._mapDc, frameTime));
    }

    private setScale() {
        const width = this._container.offsetWidth;
        const height = this._container.offsetHeight;

        if (height * (WIDTH / HEIGHT) > width) {
            const newHeight = width / (WIDTH / HEIGHT);

            this._mapCanvas.style.width = `${width}px`;
            this._mapCanvas.style.height = `${newHeight}px`;
            this._overlayCanvas.style.width = `${width}px`;
            this._overlayCanvas.style.height = `${newHeight}px`;
        } else {
            const newWidth = height * (WIDTH / HEIGHT);

            this._mapCanvas.style.width = `${newWidth}px`;
            this._mapCanvas.style.height = `${height}px`;
            this._overlayCanvas.style.width = `${newWidth}px`;
            this._overlayCanvas.style.height = `${height}px`;
        }
    }

    private draw() {
        // in case there is a timeout, reset it
        if (this._drawTimeout) {
            window.clearTimeout(this._drawTimeout);
            this._drawTimeout = 0;
        }

        const ft = this.frameTime(Date.now());

        this.setScale();
        this.drawMap(ft);
        if (this.drawOverlay(ft)) {
            // only redraw after timeout if there is actual change to be drawn
            this._drawTimeout = window.setTimeout(this.draw.bind(this), 30);
        } else {
            // if there is no change going on reset the lastFrameTime
            this._lastFrameTime = 0;
        }
    }
}
