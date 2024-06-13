/**
 * This TypeScript module imports SCSS variables from variables.module.scss, parses them, and exports them as numbers.
 * It ensures that JavaScript or TypeScript files can utilize the SCSS breakpoints as integers.
 * Any update to the main variables.scss file should be reflected here.
 */

import breakpoints from './variables.module.scss';

const parsedBreakpoints = Object.fromEntries(
    Object.entries(breakpoints).map(([key, value]) => [key, parseInt(value, 10)]),
);

export default parsedBreakpoints;
export const {
    mobileBreakpoint,
    tabletBreakpoint,
    halfMobileBreakpoint,
    smallDesktopBreakpoint,
    mediumDesktopBreakpoint,
    largeDesktopBreakpoint,
    extraLargeDesktopBreakpoint,
    veryLargeDesktopBreakpoint,
    ultraLargeDesktopBreakpoint,
} = parsedBreakpoints;
