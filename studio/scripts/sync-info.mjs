// Brings the Info page and Contact in Sanity up to date with the finished Claude Design page,
// which is newer than what came across from WordPress. One-off; kept for the record.
//
//   SANITY_WRITE_TOKEN=… node scripts/sync-info.mjs [--dry]

import {createClient} from '@sanity/client'

const token = process.env.SANITY_WRITE_TOKEN
if (!token) throw new Error('Need SANITY_WRITE_TOKEN')
const DRY = process.argv.includes('--dry')
const c = createClient({projectId: 'q198rjlt', dataset: 'production', token, apiVersion: '2025-02-19', useCdn: false})

const mission = 'We represent award-winning directors and make films for brands. Small by choice. We like being close to the work.'

const team = [
  ['Jackson Morton', 'Executive Producer / Partner', 'jackson@jojx.co'],
  ['Joe Care', 'Executive Producer / Partner', 'joe@jojx.co'],
  ['Sevasti Buford', 'EP Sales / Partner', 'sevasti@jojx.co'],
  ['Harry Joseph', 'Executive Producer', 'harry@jojx.co'],
  ['Tara Spencer', 'CFO', 'tara@jojx.co'],
  ['Mary Katherine Wise', 'Production Manager', 'mk@jojx.co'],
  ['Jenni Zeller', 'Design Project Manager', 'jenni@jojx.co'],
]

// the design lists West, Midwest, East in that order
const representation = [
  {location: 'West', company: 'Red Rep', url: 'https://redrep.tv', reps: [
    ['Holly Ross', '(323) 610-8888', 'holly@redrep.tv'],
    ['Vanessa McLean', '(310) 850-0019', 'vanessa@redrep.tv'],
    ['Jeremy Hodges', '(310) 926-9722', 'Jeremy@redrep.tv'],
  ]},
  {location: 'Midwest', company: 'Wry Wit', url: 'https://www.wrywit.tv/', reps: [
    ['Sue Rosen', '(312) 952-7182', 'Sue@wrywit.tv'],
  ]},
  {location: 'East', company: 'Barrie Isaacson', reps: [
    ['Harry White', '(212) 627-1200', 'harry@barriei.com'],
    ['Barrie Isaacson', '(212) 627-1200', 'barrie@barriei.com'],
  ]},
]

const infoPatch = {
  mission: [{
    _type: 'block', _key: 'mission', style: 'normal', markDefs: [],
    children: [{_type: 'span', _key: 'mission0', text: mission, marks: []}],
  }],
}

const contactPatch = {
  email: 'production@jojx.co',
  telephone: '323 209 5025',
  address: '920 Abbot Kinney Blvd\nVenice, CA 90291',
  socials: [{_type: 'social', _key: 'ig', title: 'Instagram', url: 'https://instagram.com/jojx'}],
  team: team.map(([name, position, email], i) => ({_type: 'teamMember', _key: `t${i}`, name, position, email})),
  representation: representation.map((o, i) => ({
    _type: 'repOffice', _key: `o${i}`, location: o.location, company: o.company, url: o.url,
    reps: o.reps.map(([name, telephone, email], j) => ({_type: 'rep', _key: `r${i}${j}`, name, telephone, email})),
  })),
}

if (DRY) {
  console.log(JSON.stringify({infoPatch, contactPatch}, null, 1))
  process.exit(0)
}
await c.transaction()
  .patch('infoPage', (p) => p.set(infoPatch))
  .patch('contact', (p) => p.set(contactPatch))
  .commit()
console.log('Info page and Contact updated from the design.')
