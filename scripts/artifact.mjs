// Turns the single-file build into a page body for the hosted preview, which
// supplies its own <html>/<head>/<body> skeleton.
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist-artifact/index.html', 'utf8')
const grab = (re) => [...html.matchAll(re)].map((m) => m[0])
const head = html.slice(0, html.indexOf('</head>'))
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))

const out = [
  ...grab(/<title>[\s\S]*?<\/title>/g),
  ...grab(/<meta name="(claude:viewport-fit-sides|description)"[^>]*>/g),
  ...grab(/<link rel="(preconnect|stylesheet)"[^>]*>/g),
  ...grab(/<style[\s\S]*?<\/style>/g),
  body.replace(/<script[\s\S]*?<\/script>/g, '').trim(),
  ...[...head.matchAll(/<script[\s\S]*?<\/script>/g)].map((m) => m[0]),
  ...grab(/<script[\s\S]*?<\/script>/g).filter((s) => body.includes(s)),
].join('\n')

writeFileSync('dist-artifact/preview.html', out)
console.log(`preview.html ${(out.length / 1024).toFixed(0)} KB`)
