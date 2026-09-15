// The content gaps from the Sept 15 audit that can be fixed without inventing copy.
// Anything needing a human decision is listed at the end rather than guessed at.
//
//   SANITY_WRITE_TOKEN=… node scripts/fix-gaps.mjs [--dry]

import {createClient} from '@sanity/client'

const token = process.env.SANITY_WRITE_TOKEN
if (!token) throw new Error('Need SANITY_WRITE_TOKEN')
const DRY = process.argv.includes('--dry')
const c = createClient({projectId: 'q198rjlt', dataset: 'production', token, apiVersion: '2025-02-19', useCdn: false})

const log = []
const tx = c.transaction()

// 1. Trevor Clarence's Instagram link is labelled "Innstagram"
const trevor = await c.fetch(`*[_type=="director" && name match "Trevor*"][0]{_id, links}`)
if (trevor) {
  const links = (trevor.links || []).map((l) => (/^inn?stagram$/i.test(l.label || '') ? {...l, label: 'Instagram'} : l))
  if (JSON.stringify(links) !== JSON.stringify(trevor.links)) {
    tx.patch(trevor._id, (p) => p.set({links}))
    log.push('Trevor Clarence: "Innstagram" → "Instagram"')
  }
}

// 2. Nandos is set to the two-image layout but only has one still, so it would render with a hole
const nandos = await c.fetch(`*[_type=="project" && brand=="Nandos"][0]{_id, gridSize, secondaryStill}`)
if (nandos && nandos.gridSize === 'featured' && !nandos.secondaryStill) {
  tx.patch(nandos._id, (p) => p.set({gridSize: 'half-width'}))
  log.push('Nandos: grid size "Two images" → "Half width" (there is no second still)')
}

// 3. Adidas is the one untitled spot whose Vimeo name is a real campaign name rather than a
//    file name, so it is safe to fill. The rest stay blank; see the list below.
const adidas = await c.fetch(`*[_type=="project" && brand=="Adidas" && !defined(title)][0]{_id}`)
if (adidas) {
  tx.patch(adidas._id, (p) => p.set({title: 'Adi Dassler'}))
  log.push('Adidas: spot title set to "Adi Dassler" (from the Vimeo title)')
}

// 4. Director names, to the spellings used in the finished design
for (const [match, full] of [['Martin Krejci', 'Martin Krejčí'], ['Per-Hampus', 'Per-Hampus Stålhandske']]) {
  const d = await c.fetch(`*[_type=="director" && name == $n][0]{_id, name}`, {n: match})
  if (d) {
    tx.patch(d._id, (p) => p.set({name: full}))
    log.push(`Director name: "${match}" → "${full}"`)
  }
}

// 5. jabunewman.com is set to private on Squarespace, so the link is dead for every visitor.
//    The Instagram link stays.
const jabu = await c.fetch(`*[_type=="director" && name match "Jabu*"][0]{_id, links}`)
if (jabu) {
  const links = (jabu.links || []).filter((l) => !/jabunewman\.com/i.test(l.url || ''))
  if (links.length !== (jabu.links || []).length) {
    tx.patch(jabu._id, (p) => p.set({links}))
    log.push('Jabu Nadia Newman: removed the website link (the site is private, so it 401s)')
  }
}

// 6. the homepage still carried the old front-desk number
const home = await c.fetch(`*[_id=="homepage"][0]{phone}`)
const phone = 'P — 323 209 5025'
if (home && home.phone !== phone) {
  tx.patch('homepage', (p) => p.set({phone}))
  log.push(`Homepage phone: "${home.phone}" → "${phone}" (matches Contact)`)
}

if (!log.length) { console.log('Nothing to change.'); process.exit(0) }
console.log(DRY ? 'Would change:' : 'Changed:')
log.forEach((l) => console.log('  ' + l))
if (!DRY) await tx.commit()

console.log(`
Left alone on purpose, because filling these means writing copy that should be yours:
  · 7 spots still have no title, all of them Martin Krejčí's. Their Vimeo files are named
    like "GilletteDC" and "DHLdcc", i.e. director's-cut file names, not campaign names.
    Putting those on the site would read worse than leaving the field empty.
  · JONES / Dorinda has no blurb. The film is "Out of Sight", 1m45.
  · Zac Ella has no bio at all.
  · BMW x4M and BMW x3 both point at vimeo.com/319597559, whose Vimeo title is
    "X4M - Move Earth (offline)". So x4M is the correct one and x3 is either a duplicate or a
    real spot with the wrong link. Deleting or repointing it is your call, so nothing was touched.`)
