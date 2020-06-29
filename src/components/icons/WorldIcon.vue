<template functional>
    <div class="world-icon"></div>
</template>

<style lang="scss" scoped>
.world-icon,
.world-icon::before,
.world-icon::after {
    width: 100%;
    height: 100%;
    background-image: url('../../assets/consensus-sprite.svg');
    background-repeat: repeat-x;
    background-size: 1000% 300%;
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
    background-position: 0 50%;
    animation: center 4.6s steps(10) infinite;
}

.world-icon::after {
    background-position: 0 100%;
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
    0%      { background-position: 0 0; }
    /* +10 frames still = 10th frame */
    8.695%  { background-position: 0 0; }
    /* +4 x rightround = +40 frames = 50th frame */
    17.391% { background-position: calc(-10 * 100%) 0; }
    26.086% { background-position: calc(-20 * 100%) 0; }
    34.782% { background-position: calc(-30 * 100%) 0; }
    43.478% { background-position: calc(-40 * 100%) 0; }
    /* +5 frames still = 55th frame */
    47.826% { background-position: calc(-40 * 100%) 0; }
    /* +6 x leftround = +60 frames = 115th frame */
    56.521% { background-position: calc(-30 * 100%) 0; }
    65.217% { background-position: calc(-20 * 100%) 0; }
    73.913% { background-position: calc(-10 * 100%) 0; }
    82.608% { background-position: 0 0; }
    91.304% { background-position: calc( 10 * 100%) 0; }
    100%    { background-position: calc( 20 * 100%) 0; }
}

@keyframes center {
    0%      { background-position: 0 50%; }
    /* +1 x leftround = +10 frames = 10th frame */
    8.695%  { background-position: calc( 10 * 100%) 50%; }
    /* +15 frames still = 25th frame */
    21.739% { background-position: calc( 10 * 100%) 50%; }
    /* +5 x rightround = +50 frames = 75th frame */
    30.434% { background-position: 0 50%; }
    39.130% { background-position: calc(-10 * 100%) 50%; }
    47.826% { background-position: calc(-20 * 100%) 50%; }
    56.521% { background-position: calc(-30 * 100%) 50%; }
    65.217% { background-position: calc(-40 * 100%) 50%; }
    /* +10 frames still = 85th frame */
    73.913% { background-position: calc(-40 * 100%) 50%; }
    /* +3 x leftround = +30 frames = 115th frame */
    82.608% { background-position: calc(-30 * 100%) 50%; }
    91.304% { background-position: calc(-20 * 100%) 50%; }
    100%    { background-position: calc(-10 * 100%) 50%; }
}

/* Same as top, but left and right switched, and started 10 frames early (-0.4s animation delay) */
@keyframes bottom {
    0%      { background-position: 0 100%; }
    /* +10 frames still = 10th frame */
    8.695%  { background-position: 0 100%; }
    /* +4 x leftround = +40 frames = 50th frame */
    17.391% { background-position: calc( 10 * 100%) 100%; }
    26.086% { background-position: calc( 20 * 100%) 100%; }
    34.782% { background-position: calc( 30 * 100%) 100%; }
    43.478% { background-position: calc( 40 * 100%) 100%; }
    /* +5 frames still = 55th frame */
    47.826% { background-position: calc( 40 * 100%) 100%; }
    /* +6 x rightround = +60 frames = 115th frame */
    56.521% { background-position: calc( 30 * 100%) 100%; }
    65.217% { background-position: calc( 20 * 100%) 100%; }
    73.913% { background-position: calc( 10 * 100%) 100%; }
    82.608% { background-position: 0 100%; }
    91.304% { background-position: calc(-10 * 100%) 100%; }
    100%    { background-position: calc(-20 * 100%) 100%; }
}
</style>
