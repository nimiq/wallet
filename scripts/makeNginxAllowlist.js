const fs = require('node:fs')
const path = require('node:path')
// Note that this is the same library as used by vue router, i.e. the path matching here is compatible with vue router's
// syntax (https://router.vuejs.org/guide/essentials/route-matching-syntax.html) defined in router.ts
const { pathToRegexp } = require('path-to-regexp')

async function main() {
    const routerConfig = fs.readFileSync('src/router.ts', 'utf8')

    const paths = routerConfig.split('\n')
        .filter(line => /^\s*(?:path|alias):/.test(line)) // Only process lines that define a path
        .map(line => line.split('\'')[1]) // Take the string between the single quotation marks
        .filter(Boolean) // Remove empty lines

    // Additional html pages besides index.html, which is already covered as root path /. These are the entry points of
    // the build, build.rolldownOptions.input in vite.config.ts, such that exactly the pages that are built are
    // allowlisted. The entry points are the same in all modes, therefore the config is loaded in development mode,
    // which doesn't require the build environment variable or a release tag.
    const { loadConfigFromFile } = await import('vite-plus')
    const rootDir = process.cwd()
    const { config } = await loadConfigFromFile({ command: 'build', mode: 'development' }, undefined, rootDir, 'silent')
    const input = config.build && config.build.rolldownOptions && config.build.rolldownOptions.input
    if (!input) throw new Error('No entry points found in build.rolldownOptions.input of vite.config.ts')
    paths.push(...Object.values(typeof input === 'string' ? [input] : input)
        .map(file => path.relative(rootDir, path.resolve(rootDir, file)).replace(/\\/g, '/'))
        .filter(file => file !== 'index.html')
        .map(file => `/${file.replace(/\.html$/, '')}`),
    )

    const pathRegexs = paths
        .map(routePath => `${pathToRegexp(routePath.replace('\\\\', '\\'), [])}`)
        .map(regex => {
            if (regex.startsWith('/') && regex.endsWith('/i')) {
                return regex.substring(1, regex.length - 2)
            } else {
                return regex
            }
        })

    fs.writeFileSync('public/nginx-allowlist.txt', `${pathRegexs.join('\n')}\n`)

    console.info(`Allowlisted ${paths.length} paths for Nginx`)
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})
