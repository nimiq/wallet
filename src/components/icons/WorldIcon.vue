<template functional>
    <div class="world-icon"></div>
</template>

<style lang="scss" scoped>
.world-icon,
.world-icon::before,
.world-icon::after {
    width: 22px;
    height: 22px;
    background-image: url('../../assets/consensus-sprite.svg');
    background-repeat: repeat-x;
    background-size: 220px 66px;
}

.world-icon::before,
.world-icon::after {
    content: '';
    display: block;
    position: absolute;
    left: 0;
    top: 0;
}

.world-icon::before {
    background-position: 0 0;
    animation: top 4.6s steps(10) infinite;
}

.world-icon {
    position: relative;
    background-position: 0 -22px;
    animation: center 4.6s steps(10) infinite;
}

.world-icon::after {
    background-position: 0 -44px;
    animation: bottom 4.6s steps(10) infinite -0.4s;
}

/**
 * The CSS steps() function does NOT generate *time steps*. Instead, it
 * generates *distance steps*. This means that a step is not based on time,
 * but on the distance that the animated property is transitioned.
 *
 * 1 frame = 100% / 115 frames = 0.869565217%
 *
 * | Frame | Animation Progress |
 * |-------|--------------------|
 * |     0 | 0                  |
 * |     5 | 4.347826087        |
 * |    10 | 8.695652174        |
 * |    15 | 13.04347826        |
 * |    20 | 17.39130435        |
 * |    25 | 21.73913043        |
 * |    30 | 26.08695652        |
 * |    35 | 30.43478261        |
 * |    40 | 34.7826087         |
 * |    45 | 39.13043478        |
 * |    50 | 43.47826087        |
 * |    55 | 47.82608696        |
 * |    60 | 52.17391304        |
 * |    65 | 56.52173913        |
 * |    70 | 60.86956522        |
 * |    75 | 65.2173913         |
 * |    80 | 69.56521739        |
 * |    85 | 73.91304348        |
 * |    90 | 78.26086957        |
 * |    95 | 82.60869565        |
 * |   100 | 86.95652174        |
 * |   105 | 91.30434783        |
 * |   110 | 95.65217391        |
 * |   115 | 100                |
 * |-------|--------------------|
 */

@keyframes top {
    0%           { background-position: 0 0; }
    /* +10 frames still = 10th frame */
    8.69565217%  { background-position: 0 0; }
    /* +4 x rightround = +40 frames = 50th frame */
    17.39130435% { background-position: calc(-10 * 22px) 0; }
    26.08695652% { background-position: calc(-20 * 22px) 0; }
    34.7826087%  { background-position: calc(-30 * 22px) 0; }
    43.47826087% { background-position: calc(-40 * 22px) 0; }
    /* +5 frames still = 55th frame */
    47.82608696% { background-position: calc(-40 * 22px) 0; }
    /* +6 x leftround = +60 frames = 115th frame */
    56.52173913% { background-position: calc(-30 * 22px) 0; }
    65.2173913%  { background-position: calc(-20 * 22px) 0; }
    73.91304348% { background-position: calc(-10 * 22px) 0; }
    82.60869565% { background-position: 0 0; }
    91.30434783% { background-position: calc( 10 * 22px) 0; }
    100%         { background-position: calc( 20 * 22px) 0; }
}

@keyframes center {
    0% { background-position: 0 -22px; }
    /* +1 x leftround = +10 frames = 10th frame */
    8.695652174% { background-position: calc( 10 * 22px) -22px; }
    /* +15 frames still = 25th frame */
    21.73913043% { background-position: calc( 10 * 22px) -22px; }
    /* +5 x rightround = +50 frames = 75th frame */
    30.43478261% { background-position: 0 -22px; }
    39.13043478% { background-position: calc(-10 * 22px) -22px; }
    47.82608696% { background-position: calc(-20 * 22px) -22px; }
    56.52173913% { background-position: calc(-30 * 22px) -22px; }
    65.2173913%  { background-position: calc(-40 * 22px) -22px; }
    /* +10 frames still = 85th frame */
    73.91304348% { background-position: calc(-40 * 22px) -22px; }
    /* +3 x leftround = +30 frames = 115th frame */
    82.60869565% { background-position: calc(-30 * 22px) -22px; }
    91.30434783% { background-position: calc(-20 * 22px) -22px; }
    100%         { background-position: calc(-10 * 22px) -22px; }
}

/* Same as top, but left and right switched, and started 10 frames early (-0.4s animation delay) */
@keyframes bottom {
    0%           { background-position: 0 -44px; }
    /* +10 frames still = 10th frame */
    8.69565217%  { background-position: 0 -44px; }
    /* +4 x leftround = +40 frames = 50th frame */
    17.39130435% { background-position: calc( 10 * 22px) -44px; }
    26.08695652% { background-position: calc( 20 * 22px) -44px; }
    34.7826087%  { background-position: calc( 30 * 22px) -44px; }
    43.47826087% { background-position: calc( 40 * 22px) -44px; }
    /* +5 frames still = 55th frame */
    47.82608696% { background-position: calc( 40 * 22px) -44px; }
    /* +6 x rightround = +60 frames = 115th frame */
    56.52173913% { background-position: calc( 30 * 22px) -44px; }
    65.2173913%  { background-position: calc( 20 * 22px) -44px; }
    73.91304348% { background-position: calc( 10 * 22px) -44px; }
    82.60869565% { background-position: 0 -44px; }
    91.30434783% { background-position: calc(-10 * 22px) -44px; }
    100%         { background-position: calc(-20 * 22px) -44px; }
}
</style>
