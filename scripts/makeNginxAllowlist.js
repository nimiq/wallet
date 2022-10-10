const fs = require('node:fs')
const { pathToRegexp } = require('path-to-regexp')

const data = fs.readFileSync('src/router.ts', 'utf8')

const paths = data.split('\n')
    .filter(line => /^\s*(?:path|alias):/.test(line)) // Only process lines that define a path
    .map(line => line.split('\'')[1]) // Take the string between the single quotation marks
    .filter(Boolean) // Remove empty lines
    .map(path => `${pathToRegexp(path.replace('\\\\', '\\'), [])}`)
    .map(regex => {
        if (regex.startsWith('/') && regex.endsWith('/i')) {
            return regex.substring(1, regex.length - 2)
        } else {
            return regex
        }
    })

paths.push('') // Add newline at the end

fs.writeFileSync('public/nginx-allowlist.txt', paths.join('\n'))

console.info(`Allowlisted ${paths.length - 1} paths for Nginx`)
