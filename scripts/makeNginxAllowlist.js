const fs = require('node:fs')
// Note that this is the same library as used by vue router, i.e. the path matching here is compatible with vue router's
// syntax (https://router.vuejs.org/guide/essentials/route-matching-syntax.html) defined in router.ts
const { pathToRegexp } = require('path-to-regexp')

const routerConfig = fs.readFileSync('src/router.ts', 'utf8')

const paths = routerConfig.split('\n')
    .filter(line => /^\s*(?:path|alias):/.test(line)) // Only process lines that define a path
    .map(line => line.split('\'')[1]) // Take the string between the single quotation marks
    .filter(Boolean) // Remove empty lines

// Additional html pages besides index.html, which is already covered as root path /. These are the entry points of the
// build, see build.rolldownOptions.input in vite.config.ts.
paths.push(...fs.readdirSync('.')
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .map(file => `/${file.replace('.html', '')}`),
)

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
