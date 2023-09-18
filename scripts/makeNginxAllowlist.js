const fs = require('node:fs')
// Note that this is the same library as used by vue router, i.e. the path matching here is compatible with vue router's
// syntax (https://router.vuejs.org/guide/essentials/route-matching-syntax.html) defined in router.ts
const { pathToRegexp } = require('path-to-regexp')

const routerConfig = fs.readFileSync('src/router.ts', 'utf8')

const paths = routerConfig.split('\n')
    .filter(line => /^\s*(?:path|alias):/.test(line)) // Only process lines that define a path
    .map(line => line.split('\'')[1]) // Take the string between the single quotation marks
    .filter(Boolean) // Remove empty lines

const vueConfig = fs.readFileSync('vue.config.js', 'utf8')
const vuePagesConfigStart = /(?<=pages:[^{]*){/.exec(vueConfig)?.index;
if (vuePagesConfigStart !== undefined) {
    // extract the pages config object by searching for the closing }
    let vuePagesConfigEnd = vuePagesConfigStart
    let openObjects = 0
    do {
        if (vueConfig[vuePagesConfigEnd] === '{') {
            openObjects++
        } else if (vueConfig[vuePagesConfigEnd] === '}') {
            openObjects--
        }
        vuePagesConfigEnd++
    } while (openObjects > 0 && vuePagesConfigEnd < vueConfig.length)
    // convert the pages config to valid JSON
    const vuePagesConfigJson = vueConfig.substring(vuePagesConfigStart, vuePagesConfigEnd)
        .replace(/'/g, '"') // use " as string delimiters
        .replace(/(?<=^\s*)[^\s"':]+(?=\s*:)/gm, '"$&"') // put parameter names in strings
        .replace(/\s*\/\/.*$/gm, '') // remove comments
        .replace(/,(?=\n\s*})/g, '') // remove comma after final parameter of an object
    const vuePagesConfig = JSON.parse(vuePagesConfigJson)
    paths.push(...Object.entries(vuePagesConfig)
        .reduce((pages, [page, config]) => [
            ...pages,
            config.filename ? config.filename.replace('.html', '') : page,
        ], [])
        .filter(page => page !== 'index') // filter out index because it's already covered as root path /
        .map(page => `/${page}`),
    )
}

const pathRegexs = paths
    .map(path => `${pathToRegexp(path.replace('\\\\', '\\'), [])}`)
    .map(regex => {
        if (regex.startsWith('/') && regex.endsWith('/i')) {
            return regex.substring(1, regex.length - 2)
        } else {
            return regex
        }
    })

fs.writeFileSync('public/nginx-allowlist.txt', `${pathRegexs.join('\n')}\n`)

console.info(`Allowlisted ${paths.length} paths for Nginx`)
