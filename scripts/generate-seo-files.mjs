import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve('dist')
const configuredUrl = process.env.VITE_SITE_URL?.trim()
let siteUrl = null

if (configuredUrl) {
  const parsedUrl = new URL(configuredUrl)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('VITE_SITE_URL doit être une URL HTTP ou HTTPS absolue.')
  }
  parsedUrl.pathname = '/'
  parsedUrl.search = ''
  parsedUrl.hash = ''
  siteUrl = parsedUrl.href.replace(/\/$/, '')
}

await mkdir(outputDirectory, { recursive: true })

const robots = [
  'User-agent: *',
  'Allow: /',
  ...(siteUrl ? ['', `Sitemap: ${siteUrl}/sitemap.xml`] : []),
  '',
].join('\n')

await writeFile(resolve(outputDirectory, 'robots.txt'), robots, 'utf8')

if (siteUrl) {
  const pages = [
    {
      file: resolve(outputDirectory, 'index.html'),
      url: `${siteUrl}/`,
      image: `${siteUrl}/ressources/04-atelier/photo-garage-1280.webp`,
    },
    {
      file: resolve(outputDirectory, 'realisations', 'index.html'),
      url: `${siteUrl}/realisations`,
      image: `${siteUrl}/ressources/03-video/realisations-poster-640.webp`,
    },
  ]

  for (const page of pages) {
    const html = await readFile(page.file, 'utf8')
    const absoluteMetadata = [
      `    <link rel="canonical" href="${page.url}" />`,
      `    <meta property="og:url" content="${page.url}" />`,
      `    <meta property="og:image" content="${page.image}" />`,
      `    <meta name="twitter:image" content="${page.image}" />`,
    ].join('\n')
    await writeFile(page.file, html.replace('</head>', `${absoluteMetadata}\n  </head>`), 'utf8')
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${siteUrl}/</loc>`,
    '  </url>',
    '  <url>',
    `    <loc>${siteUrl}/realisations</loc>`,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n')

  await writeFile(resolve(outputDirectory, 'sitemap.xml'), sitemap, 'utf8')
} else {
  console.warn('VITE_SITE_URL absent : sitemap.xml et URL canoniques à générer lorsque le domaine sera confirmé.')
}
