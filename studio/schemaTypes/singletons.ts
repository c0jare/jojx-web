import {defineField, defineType} from 'sanity'

const personFields = [
  defineField({name: 'name', title: 'Name', type: 'string', validation: (r) => r.required()}),
  defineField({name: 'telephone', title: 'Telephone', type: 'string'}),
  defineField({name: 'email', title: 'Email', type: 'string'}),
]

// Home Meta: Excerpt (phone line), Image Gallery. Plus the 34 "featured" pages become references.
export const homepage = defineType({
  name: 'homepage',
  title: 'Homepage',
  type: 'document',
  fields: [
    defineField({
      name: 'featuredWork',
      title: 'Featured work',
      type: 'array',
      description: 'The homepage grid. Drag to reorder. Pick from existing projects.',
      of: [{type: 'reference', to: [{type: 'project'}]}],
      validation: (r) => r.unique(),
    }),
    defineField({
      name: 'gallery',
      title: 'Image gallery',
      type: 'array',
      description: 'Side-scrolling gallery of stills.',
      of: [{type: 'image', options: {hotspot: true}, fields: [{name: 'alt', title: 'Alt text', type: 'string'}]}],
    }),
    defineField({name: 'phone', title: 'Phone line', type: 'string', description: 'Shown in the header, e.g. "P — 310 732 0034".'}),
  ],
  preview: {prepare: () => ({title: 'Homepage'})},
})

// Info page: Content (mission), Featured image.
export const infoPage = defineType({
  name: 'infoPage',
  title: 'Info page',
  type: 'document',
  fields: [
    defineField({
      name: 'mission',
      title: 'Mission statement',
      type: 'array',
      of: [{type: 'block', styles: [{title: 'Normal', value: 'normal'}], lists: []}],
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', title: 'Alt text', type: 'string'}],
    }),
  ],
  preview: {prepare: () => ({title: 'Info page'})},
})

// Contact Meta form, finally filled in: address, address link, email, telephone, socials, team, representation.
export const contact = defineType({
  name: 'contact',
  title: 'Contact',
  type: 'document',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'team', title: 'Team'},
    {name: 'reps', title: 'Representation'},
  ],
  fields: [
    defineField({name: 'email', title: 'Email', type: 'string', group: 'general'}),
    defineField({name: 'telephone', title: 'Telephone', type: 'string', group: 'general'}),
    defineField({name: 'address', title: 'Address', type: 'text', rows: 3, group: 'general'}),
    defineField({name: 'addressLink', title: 'Map link', type: 'url', group: 'general'}),
    defineField({
      name: 'socials',
      title: 'Socials',
      type: 'array',
      group: 'general',
      of: [
        {
          type: 'object',
          name: 'social',
          fields: [
            {name: 'title', title: 'Platform', type: 'string'},
            {name: 'url', title: 'Link', type: 'url'},
          ],
          preview: {select: {title: 'title', subtitle: 'url'}},
        },
      ],
    }),
    defineField({
      name: 'team',
      title: 'Team',
      type: 'array',
      group: 'team',
      of: [
        {
          type: 'object',
          name: 'teamMember',
          fields: [
            {name: 'name', title: 'Name', type: 'string', validation: (r) => r.required()},
            {name: 'position', title: 'Position', type: 'string'},
            {name: 'email', title: 'Email', type: 'string'},
          ],
          preview: {select: {title: 'name', subtitle: 'position'}},
        },
      ],
    }),
    defineField({
      name: 'representation',
      title: 'Representation',
      type: 'array',
      group: 'reps',
      of: [
        {
          type: 'object',
          name: 'repOffice',
          fields: [
            {name: 'location', title: 'Location', type: 'string', description: 'West, East, Midwest…'},
            {name: 'company', title: 'Company', type: 'string'},
            {name: 'url', title: 'Company link', type: 'url'},
            {
              name: 'reps',
              title: 'Reps',
              type: 'array',
              of: [{type: 'object', name: 'rep', fields: personFields, preview: {select: {title: 'name', subtitle: 'telephone'}}}],
            },
          ],
          preview: {select: {title: 'location', subtitle: 'company'}},
        },
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Contact'})},
})

// Site Options: title, tagline, GA codes, socials, share image.
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Site title', type: 'string'}),
    defineField({name: 'description', title: 'Tagline / meta description', type: 'text', rows: 2}),
    defineField({
      name: 'ogImage',
      title: 'Social share image',
      type: 'image',
      description: '1200 × 630. Used when the site is shared, unless a page has its own image.',
    }),
    defineField({
      name: 'gaIds',
      title: 'Google Analytics IDs',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'socials',
      title: 'Social links',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'social',
          fields: [
            {name: 'platform', title: 'Platform', type: 'string'},
            {name: 'url', title: 'URL', type: 'url'},
          ],
          preview: {select: {title: 'platform', subtitle: 'url'}},
        },
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
