// WordPress → Sanity migration for JOJX.
// Reads data/jojx-content-export.json (produced from api.jojx.co), uploads every still, bio photo,
// gallery image, hover loop and reel into Sanity's asset store, then creates the documents.
// Safe to re-run: documents use stable IDs (wp-<id>) and assets are cached by source URL in data/asset-cache.json.
//
//   node scripts/migrate.mjs --dry        # print what would happen, no writes
//   node scripts/migrate.mjs              # full run
//   node scripts/migrate.mjs --no-video   # skip mp4 uploads (fast first pass, loops/reels keep their source URL)

import {createClient} from '@sanity/client'
import {readFileSync, writeFileSync, existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join, basename} from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  existsSync(join(here, '..', '.env'))
    ? readFileSync(join(here, '..', '.env'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split('=').map((s) => s.trim()))
    : [],
)
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || env.SANITY_STUDIO_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN || env.SANITY_WRITE_TOKEN
const DRY = process.argv.includes('--dry')
const NO_VIDEO = process.argv.includes('--no-video')
if (!projectId || (!token && !DRY)) throw new Error('Need SANITY_STUDIO_PROJECT_ID and SANITY_WRITE_TOKEN in .env')

const client = createClient({projectId, dataset, token, apiVersion: '2025-02-19', useCdn: false})
const data = JSON.parse(readFileSync(join(here, '..', 'data', 'jojx-content-export.json'), 'utf8'))
const cachePath = join(here, '..', 'data', 'asset-cache.json')
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const saveCache = () => writeFileSync(cachePath, JSON.stringify(cache, null, 1))

const slugify = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const vimeoId = (u) => (u && u.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1]
// clip URLs come in three WordPress flavours; all of them carry the Vimeo id of the clip itself
const clipVimeoId = (u) =>
  u ? (u.match(/\/playback\/(\d+)\//) || u.match(/\/external\/(\d+)\./) || u.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1] : undefined
const cleanVimeo = (u) => (vimeoId(u) ? `https://vimeo.com/${vimeoId(u)}` : u)
const block = (text) =>
  text
    ? text.split(/\n{2,}/).map((p, i) => ({_type: 'block', _key: `p${i}`, style: 'normal', markDefs: [], children: [{_type: 'span', _key: `s${i}`, text: p.trim(), marks: []}]}))
    : []

let uploaded = 0
async function upload(kind, url, label) {
  if (!url) return null
  if (cache[url]) return cache[url]
  if (DRY) {
    console.log(`  [dry] would upload ${kind}: ${label || basename(url)}`)
    return `dry-${kind}`
  }
  const res = await fetch(url)
  if (!res.ok) {
    console.warn(`  !! ${res.status} fetching ${url}`)
    return null
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const filename = decodeURIComponent(basename(new URL(url).pathname)).replace(/\s+/g, '-') || `${kind}.bin`
  const asset = await client.assets.upload(kind, buf, {filename: kind === 'file' && !/\.(mp4|webm|mov)$/i.test(filename) ? filename + '.mp4' : filename, source: {name: 'wordpress', id: url, url}})
  cache[url] = asset._id
  uploaded++
  if (uploaded % 10 === 0) saveCache()
  return asset._id
}

const image = async (img, label) => {
  if (!img?.url) return undefined
  const id = await upload('image', img.url, label)
  return id ? {_type: 'image', asset: {_type: 'reference', _ref: id}, ...(img.alt ? {alt: img.alt} : {})} : undefined
}
// clips point at Vimeo rather than being copied into Sanity; the id is pulled out of the old WordPress URL
const video = async (url) => {
  const id = clipVimeoId(url)
  return id ? {_type: 'video', source: 'vimeo', vimeoUrl: `https://vimeo.com/${id}`} : undefined
}

const docs = []
const usedSlugs = new Set()
const uniqueSlug = (base) => {
  let s = base || 'untitled', n = 2
  while (usedSlugs.has(s)) s = `${base}-${n++}`
  usedSlugs.add(s)
  return s
}

// ---- directors + projects
const projectByVimeo = new Map()
for (const [di, d] of data.directors.entries()) {
  console.log(`\n${d.name} (${d.projects.length} projects)`)
  const dirId = `director-${d.wpId}`
  docs.push({
    _id: dirId,
    _type: 'director',
    wpId: d.wpId,
    name: d.name,
    slug: {_type: 'slug', current: uniqueSlug(slugify(d.name))},
    bio: d.bio || undefined,
    abstract: d.abstract || undefined,
    coverImage: await image(d.coverImage, `${d.name} cover`),
    reel: await video(d.reelVideoUrl),
    bioImage: await image(d.bioImage, `${d.name} bio photo`),
    links: (d.links || []).filter((l) => l.url).map((l, i) => ({_type: 'link', _key: `l${i}`, label: l.label || 'Link', url: l.url, text: l.text || undefined})),
  })
  for (const [pi, p] of d.projects.entries()) {
    const id = `project-${p.wpId}`
    projectByVimeo.set(vimeoId(p.vimeoUrl), id)
    docs.push({
      _id: id,
      _type: 'project',
      wpId: p.wpId,
      brand: p.brand,
      title: p.title || undefined,
      director: {_type: 'reference', _ref: dirId},
      slug: {_type: 'slug', current: uniqueSlug(slugify([p.brand, p.title].filter(Boolean).join(' ')))},
      blurb: p.blurb || undefined,
      credit: p.credit && p.credit !== d.name ? p.credit : undefined,
      externalLink: p.externalLink || undefined,
      vimeoUrl: cleanVimeo(p.vimeoUrl),
      still: await image(p.still, `${d.name} / ${p.brand} still`),
      loop: await video(p.still?.loopVideoUrl),
      secondaryStill: await image(p.secondaryStill, `${d.name} / ${p.brand} second still`),
      gridSize: p.gridType || 'half-width',
    })
  }
}

// ---- featured: references to projects; orphans (no director-page twin) become new projects
const dirByName = new Map(data.directors.map((d) => [d.name, `director-${d.wpId}`]))
// featured spots with no director-page twin and no credit field: director confirmed from the blurb / Vimeo title
const orphanDirector = {Netflix: 'JONES', 'The Weeknd': 'Anton Tammi'}
const featuredRefs = []
// spots that only existed on the old homepage still belong on their director's page
const orphanWork = []
for (const [fi, f] of data.featured.entries()) {
  let ref = projectByVimeo.get(f.vimeoId)
  let dirId
  if (!ref) {
    dirId = dirByName.get(f.credit || orphanDirector[f.brand])
    if (!dirId) {
      console.warn(`  !! featured "${f.brand}" has no matching project and no credit; skipping (add by hand)`)
      continue
    }
    ref = `project-${f.wpId}`
    console.log(`  + creating project for featured orphan "${f.brand}" under ${f.credit || orphanDirector[f.brand]}`)
    docs.push({
      _id: ref,
      _type: 'project',
      wpId: f.wpId,
      brand: f.brand,
      title: f.title || undefined,
      director: {_type: 'reference', _ref: dirId},
      slug: {_type: 'slug', current: uniqueSlug(slugify([f.brand, f.title].filter(Boolean).join(' ')))},
      blurb: f.blurb || undefined,
      vimeoUrl: cleanVimeo(f.vimeoUrl),
      still: await image(f.still, `featured ${f.brand} still`),
      loop: await video(f.still?.loopVideoUrl),
      gridSize: f.gridType || 'half-width',
    })
    orphanWork.push({dirId, ref})
  }
  featuredRefs.push({_type: 'reference', _key: `f${f.wpId}`, _ref: ref})
}

// ---- singletons
console.log('\nHomepage gallery')
docs.push({
  _id: 'homepage',
  _type: 'homepage',
  phone: data.home.phoneLine || undefined,
  featuredWork: featuredRefs,
  gallery: (
    await Promise.all(
      (data.home.gallery || []).map(async (g, i) => {
        const img = await image(g, `slider ${i} still`)
        if (!img) return null
        return {_type: 'galleryItem', _key: `g${i}`, image: img, loop: await video(g.loopVideoUrl)}
      }),
    )
  ).filter(Boolean),
})
docs.push({
  _id: 'infoPage',
  _type: 'infoPage',
  mission: block(data.info.mission),
  heroImage: await image(data.info.heroImage, 'info hero'),
})
docs.push({
  _id: 'contact',
  _type: 'contact',
  email: 'frontdesk@jojx.co',
  telephone: '(310) 732 0034',
  socials: [
    {_type: 'social', _key: 'ig', title: 'Instagram', url: 'https://instagram.com/jojx'},
    {_type: 'social', _key: 'fb', title: 'Facebook', url: 'http://facebook.com/jojxproductions'},
  ],
  team: [
    ['Joe Care', 'Executive Producer / Partner'],
    ['Jackson Morton', 'Executive Producer / Partner'],
    ['Sevasti Buford', 'Executive Producer Sales / Partner'],
    ['Harry Joseph', 'Executive Producer'],
    ['Tara Spencer', 'CFO / Head of Production'],
    ['Jenni Zeller', 'Visual Designer'],
    ['Felix Huesca', 'Production Manager'],
  ].map(([name, position], i) => ({_type: 'teamMember', _key: `t${i}`, name, position})),
  representation: [
    {location: 'West', company: 'Red Rep', url: 'http://redrep.tv', reps: [['Holly Ross', '(323) 610-8888', 'holly@redrep.tv'], ['Vanessa McLean', '(310) 850-0019', 'vanessa@redrep.tv'], ['Jeremy Hodges', '(310) 926-9722', 'Jeremy@redrep.tv']]},
    {location: 'East', company: 'Barrie Isacson MGMT', reps: [['Barrie Isaacson', '(917) 903-6610', 'barrie@barriei.com'], ['Harry White', '(718) 938-1249', 'harry@barriei.com']]},
    {location: 'Midwest', company: 'Wry Wit', url: 'https://www.wrywit.tv/', reps: [['Sue Rosen', '(312) 952-7182', 'Sue@wrywit.tv']]},
  ].map((o, i) => ({_type: 'repOffice', _key: `o${i}`, location: o.location, company: o.company, url: o.url, reps: o.reps.map(([name, telephone, email], j) => ({_type: 'rep', _key: `r${i}${j}`, name, telephone, email}))})),
})
docs.push({
  _id: 'siteSettings',
  _type: 'siteSettings',
  title: data.site?.generalSettings?.title || 'JOJX',
  description: data.site?.generalSettings?.description || undefined,
  gaIds: (data.site?.siteOptions?.siteOptions?.googleAnalytics || []).map((g) => g.code).filter(Boolean),
  socials: [{_type: 'social', _key: 'ig', platform: 'Instagram', url: 'https://instagram.com/jojx'}],
})

saveCache()
const counts = docs.reduce((a, d) => ((a[d._type] = (a[d._type] || 0) + 1), a), {})
console.log('\nDocuments:', counts, DRY ? '(dry run, nothing written)' : '')
if (DRY) process.exit(0)

// strip undefined, write in batches
const clean = (o) => JSON.parse(JSON.stringify(o))
for (let i = 0; i < docs.length; i += 50) {
  const tx = client.transaction()
  docs.slice(i, i + 50).forEach((d) => tx.createOrReplace(clean(d)))
  await tx.commit()
  console.log(`  wrote ${Math.min(i + 50, docs.length)}/${docs.length}`)
}
console.log(`Done. ${uploaded} assets uploaded this run.`)

// ---- ordering lists (native drag-to-reorder, no plugin)
const orderDocs = [
  {
    _id: 'directorsPage',
    _type: 'directorsPage',
    roster: data.directors.map((d) => ({_type: 'reference', _key: `d${d.wpId}`, _ref: `director-${d.wpId}`})),
  },
  ...data.directors.map((d) => ({
    _id: `director-${d.wpId}`,
    work: [
      ...d.projects.map((p) => ({_type: 'reference', _key: `w${p.wpId}`, _ref: `project-${p.wpId}`})),
      ...orphanWork.filter((o) => o.dirId === `director-${d.wpId}`).map((o) => ({_type: 'reference', _key: `w${o.ref}`, _ref: o.ref})),
    ],
  })),
]
{
  const tx = client.transaction()
  tx.createOrReplace(clean(orderDocs[0]))
  orderDocs.slice(1).forEach((d) => tx.patch(d._id, {set: {work: d.work}}))
  await tx.commit()
  console.log('Ordering lists written.')
}
