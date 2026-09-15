// Rewrites the generated blocks inside home.html from Sanity, so the site shows what the
// studio says rather than what Claude Design baked in at export time.
//
//   T=<sanity token> V=<vimeo token> node build-home.mjs
//
// Two blocks are replaced: the work tiles on the homepage, and the director list in the
// overlay. Both sit between BEGIN/END markers that this script writes on its first run, so
// re-running is safe and the rest of the design is never touched.

import {createClient} from '@sanity/client'
import {readFileSync, writeFileSync} from 'node:fs'

const T = process.env.T, V = process.env.V
if (!T || !V) throw new Error('Need T (Sanity token) and V (Vimeo token)')
const c = createClient({projectId: 'q198rjlt', dataset: 'production', token: T, apiVersion: '2025-02-19', useCdn: false})

const data = await c.fetch(`{
  "featured": *[_id=="homepage"][0].featuredWork[]->{
    brand, title, blurb, vimeoUrl, credit,
    "director": director->name,
    "clip": loop.vimeoUrl,
    "still": still.asset->url
  },
  "rosterRefs": *[_id=="directorsPage"][0].roster[]._ref,
  "directors": *[_type=="director"]{_id, name, "slug": slug.current, "cover": coverImage.asset->url, "reel": reel.vimeoUrl}
}`)

// dereferencing an array of refs in GROQ does not preserve the array's order, so the roster
// order is rebuilt from the raw _ref list
const byId = Object.fromEntries(data.directors.map((d) => [d._id, d]))
const roster = (data.rosterRefs || []).map((r) => byId[r]).filter(Boolean)

const vid = (u) => (u && u.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1]
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const img = (u, w) => (u ? `${u}?w=${w}&q=80&auto=format` : '')

const ids = new Set()
for (const f of data.featured) if (vid(f.clip)) ids.add(vid(f.clip))
for (const d of roster) if (vid(d.reel)) ids.add(vid(d.reel))
const files = new Map()
const queue = [...ids]
console.log(`resolving ${queue.length} clips…`)
async function worker() {
  while (queue.length) {
    const id = queue.shift()
    for (let a = 0; a < 4; a++) {
      const r = await fetch(`https://api.vimeo.com/videos/${id}?fields=files.rendition,files.link,files.width`, {headers: {Authorization: `bearer ${V}`}})
      if (r.status === 429) { await new Promise((s) => setTimeout(s, 8000)); continue }
      const j = await r.json().catch(() => ({}))
      files.set(id, j.files || [])
      break
    }
    await new Promise((s) => setTimeout(s, 110))
  }
}
await Promise.all(Array.from({length: 5}, worker))
const clipUrl = (u) => {
  const f = files.get(vid(u)) || []
  for (const r of ['1080p', '720p', '540p']) { const hit = f.find((x) => x.rendition === r); if (hit?.link) return hit.link }
  return f.filter((x) => x.link && x.rendition !== 'adaptive').sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.link || ''
}

// the homepage is a hand-composed scatter, not a grid: three staggered columns on a ~230px
// vertical rhythm with the tile size varied for pace. These are the positions from the design;
// anything past the 24th continues the same rhythm so the roster can grow without a redesign.
const DESIGN = JSON.parse(readFileSync(new URL('./layout.json', import.meta.url), 'utf8'))
const COLS = [[70, 120], [430, 700], [880, 1040]]
const position = (i) => {
  if (DESIGN[i]) return DESIGN[i]
  const prev = DESIGN[DESIGN.length - 1]
  const n = i - DESIGN.length
  const col = COLS[i % 3]
  const jitter = (seed, lo, hi) => lo + ((seed * 2654435761) % 1000) / 1000 * (hi - lo) | 0
  return {
    left: jitter(i + 7, col[0], col[1]),
    top: prev.top + 230 * (n + 1),
    w: jitter(i + 13, 380, 470),
    h: jitter(i + 29, 240, 295),
    speed: (0.02 + (i % 7) * 0.01).toFixed(3),
    cls: 'is-left',
  }
}

const tiles = data.featured.map((f, i) => {
  const p = position(i)
  const clip = clipUrl(f.clip)
  const embed = vid(f.vimeoUrl) ? `https://player.vimeo.com/video/${vid(f.vimeoUrl)}` : ''
  const who = f.credit || f.director || ''
  const desc = [f.title ? `<em>${esc(f.title)}</em>` : '', f.blurb ? `${f.title ? ' — ' : ''}${esc(f.blurb)}` : ''].join('')
  return `      <a class="wp ${p.cls}" href="#work"${embed ? ` data-embed="${embed}"` : ''}${clip ? ` data-clip="${esc(clip)}"` : ''} data-title="${esc(f.title || f.brand)}" style="left: ${p.left}px; top: ${p.top}px; width: ${p.w}px;" data-speed="${p.speed}">
        <span class="wp-shot" style="height: ${p.h}px;">
          <img src="${esc(img(f.still, Math.round(p.w * 2)))}" alt="${esc(f.brand)}" loading="lazy">
          <span class="wp-client">${esc(f.brand)}</span>
        </span>
        <span class="wp-vert">${esc(who)}</span>
        <span class="wp-desc">${desc}</span>
      </a>`
}).join('\n')

const names = roster.map((d) => {
  const parts = String(d.name || '').trim().split(/\s+/)
  const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''
  const last = parts.at(-1)
  const clip = clipUrl(d.reel)
  return `        <a class="do-name" href="#work" data-slug="${esc(d.slug)}" data-still="${esc(img(d.cover, 1200))}"${clip ? ` data-clip="${esc(clip)}"` : ''}>${first ? `<em>${esc(first)}</em> ` : ''}<span>${esc(last)}</span></a>`
}).join('\n')

// swap each block in, adding the markers the first time so later runs have something to aim at
let html = readFileSync(new URL('./home.html', import.meta.url), 'utf8')
const swap = (name, body, firstRunPattern) => {
  const marked = new RegExp(`( *<!-- BEGIN ${name} [^>]*-->)[\\s\\S]*?( *<!-- END ${name} -->)`)
  const block = `<!-- BEGIN ${name} (generated by build-home.mjs from Sanity — do not edit) -->\n${body}\n      <!-- END ${name} -->`
  if (marked.test(html)) { html = html.replace(marked, block); return 'updated' }
  const m = html.match(firstRunPattern)
  if (!m) throw new Error(`could not find the ${name} block to replace`)
  html = html.replace(m[0], block)
  return 'marked and replaced'
}
console.log('work tiles:', swap('work', tiles, /<a class="wp[\s\S]*<\/a>(?=\s*<\/div>\s*<\/div>\s*<div class="do")/))
console.log('director list:', swap('directors', names, /<a class="do-name"[\s\S]*?<\/a>(?=\s*<\/div>)/))
writeFileSync(new URL('./home.html', import.meta.url), html)
console.log(`\nwrote home.html: ${data.featured.length} work tiles, ${roster.length} directors`)
const noClip = data.featured.filter((f) => !clipUrl(f.clip)).map((f) => f.brand)
if (noClip.length) console.log('  no clip: ' + noClip.join(', '))
