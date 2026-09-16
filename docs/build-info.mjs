// Rewrites the Info panel inside home.html from Sanity, the same way build-home.mjs does the
// work tiles and the director list. Without this the Info page is whatever Claude Design baked
// in at export time, so editing it in the studio changes nothing on the site.
//
//   T=<sanity token> node build-info.mjs
//
// Five blocks are replaced: the hero image, the mission line, the team grid, the representation
// columns, and contact/office. Each sits between BEGIN/END markers written on the first run.

import {createClient} from '@sanity/client'
import {readFileSync, writeFileSync} from 'node:fs'

const T = process.env.T
if (!T) throw new Error('Need T (Sanity token)')
const c = createClient({projectId: 'q198rjlt', dataset: 'production', token: T, apiVersion: '2025-02-19', useCdn: false})

const data = await c.fetch(`{
  "info": *[_id=="infoPage"][0]{mission, "hero": heroImage.asset->url, "alt": heroImage.alt},
  "contact": *[_id=="contact"][0]{email, telephone, address, addressLink, socials, team, representation}
}`)

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const img = (u, w) => (u ? `${u}?w=${w}&q=85&auto=format` : '')
// a tel: href wants digits only, and every rep number here is US
const tel = (t) => '+1' + String(t || '').replace(/\D/g, '').replace(/^1/, '')
const plain = (blocks) => (blocks || []).map((b) => (b.children || []).map((s) => s.text).join('')).join(' ').trim()

const info = data.info || {}
const ct = data.contact || {}

const hero = `        <img src="${esc(img(info.hero, 1200))}" alt="${esc(info.alt || '')}" style="display: block; width: 100%; height: 100%; object-fit: cover;">`

const mission = `        <p style="margin: 0; font-family: 'EB Garamond', Georgia, serif; font-size: 22px; font-weight: 400; line-height: 1.32; text-wrap: pretty; color: #eee;">${esc(plain(info.mission))}</p>`

const team = (ct.team || []).map((m, i) =>
  `          <a class="io-row" href="mailto:${esc(m.email)}" style="--d: ${i}; padding: 7px 0; border-top-color: #333;">` +
  `<span class="io-nm" style="font-size: 13px;">${esc(m.name)}</span>` +
  `<span style="font-size: 9px; font-weight: 500; letter-spacing: .18em; text-transform: uppercase; color: #888;">${esc(m.position)}</span>` +
  `<span style="font-size: 10px; letter-spacing: .04em; color: #999;">${esc(m.email)}</span></a>`
).join('\n')

const reps = (ct.representation || []).map((o) =>
  `          <div class="io-terr" style="display: flex; flex-direction: column; min-width: 0; border-top: 1px solid #fff; padding-top: 8px;">
            <span style="font-size: 10px; font-weight: 500; letter-spacing: .24em; text-transform: uppercase; color: #888;">${esc(o.location)}</span>
            <span style="font-family: 'EB Garamond', Georgia, serif; font-size: 16px; line-height: 1.2; margin: 2px 0 6px;">${esc(o.company)}</span>
` + (o.reps || []).map((r) =>
  `            <div style="display: flex; flex-direction: column; padding: 5px 0; border-top: 1px solid #333; font-size: 13px;">` +
  `<a class="io-rl" href="mailto:${esc(String(r.email || '').toLowerCase())}">${esc(r.name)}</a>` +
  `<a class="io-rt" href="tel:${esc(tel(r.telephone))}" style="font-size: 10px; letter-spacing: .04em; font-variant-numeric: tabular-nums;">${esc(r.telephone)}</a></div>`
).join('\n') + `
          </div>`
).join('\n')

const socials = (ct.socials || []).map((s) =>
  `<a class="io-cl" href="${esc(s.url)}" target="_blank" rel="noopener" style="align-self: flex-start;">${esc(s.title)}</a>`
).join('')

const addressLines = String(ct.address || '').split('\n').filter(Boolean)
const mapHref = ct.addressLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLines.join(' '))}`

const contact = `          <div style="display: flex; flex-direction: column; gap: 12px; border-top: 1px solid #fff; padding-top: 12px;">
            <div style="font-size: 11px; font-weight: 500; letter-spacing: .24em; text-transform: uppercase;">Contact</div>
            <div style="display: flex; flex-direction: column; gap: 2px; font-size: 13px;"><a class="io-cl" href="mailto:${esc(ct.email)}?subject=Enquiry" target="_blank" rel="noopener" style="align-self: flex-start;">${esc(ct.email)}</a><a class="io-cl" href="tel:${esc(tel(ct.telephone))}" target="_blank" rel="noopener" style="align-self: flex-start; font-variant-numeric: tabular-nums;">${esc(ct.telephone)}</a>${socials}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; border-top: 1px solid #fff; padding-top: 12px;">
            <div style="font-size: 11px; font-weight: 500; letter-spacing: .24em; text-transform: uppercase;">Office</div>
            <a class="io-addr" href="${esc(mapHref)}" target="_blank" rel="noopener" style="align-self: flex-start; display: flex; flex-direction: column; align-items: flex-start; font-size: 13px; line-height: 1.5; color: #fff;">${addressLines.map((l) => `<span class="io-cl">${esc(l)}</span>`).join('')}</a>
          </div>`

let html = readFileSync(new URL('./home.html', import.meta.url), 'utf8')
const swap = (name, body, firstRunPattern, indent = '      ') => {
  const marked = new RegExp(`( *<!-- BEGIN ${name} [^>]*-->)[\\s\\S]*?( *<!-- END ${name} -->)`)
  const block = `<!-- BEGIN ${name} (generated by build-info.mjs from Sanity — do not edit) -->\n${body}\n${indent}<!-- END ${name} -->`
  if (marked.test(html)) { html = html.replace(marked, block); return 'updated' }
  const m = html.match(firstRunPattern)
  if (!m) throw new Error(`could not find the ${name} block to replace`)
  html = html.replace(m[0], block)
  return 'marked and replaced'
}

console.log('hero:   ', swap('info-hero', hero, /<img src="uploads\/c4d214551729e2b5a6467f734ebbd09e\.jpg"[^>]*>/, '        '))
console.log('mission:', swap('info-mission', mission, /<p style="margin: 0; font-family: 'EB Garamond'[^>]*>We represent[\s\S]*?<\/p>/, '        '))
console.log('team:   ', swap('info-team', team, /<a class="io-row" href="mailto:jackson@jojx\.co"[\s\S]*?<\/a>(?=\s*<\/div>)/, '          '))
console.log('reps:   ', swap('info-reps', reps, /<div class="io-terr"[\s\S]*<\/div>\s*(?=<\/div>\s*<\/div>)/, '          '))
console.log('contact:', swap('info-contact', contact, /<div style="display: flex; flex-direction: column; gap: 12px; border-top: 1px solid #fff; padding-top: 12px;">\s*<div style="font-size: 11px; font-weight: 500; letter-spacing: .24em; text-transform: uppercase;">Contact[\s\S]*?Office[\s\S]*?<\/div>(?=\s*<\/div>)/, '          '))

writeFileSync(new URL('./home.html', import.meta.url), html)
console.log(`\nwrote home.html: ${(ct.team || []).length} team, ${(ct.representation || []).length} rep offices`)
if (!info.hero) console.log('  warning: the Info page has no hero image in Sanity')
