import {defineField, defineType} from 'sanity'

// Mirrors the WordPress project page: Title (brand), Excerpt (blurb), Featured image (+ loop mp4 in image meta),
// Work Meta → Video Url (Vimeo), Work Category (spot title), Type (grid size), Talent Name (credit), Link,
// Secondary Featured Image.
export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  groups: [
    {name: 'main', title: 'Main', default: true},
    {name: 'media', title: 'Video & stills'},
    {name: 'layout', title: 'Layout'},
  ],
  fields: [
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'string',
      group: 'main',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'title',
      title: 'Spot title',
      type: 'string',
      group: 'main',
      description: 'Campaign or film name, e.g. "Intensity Driven".',
    }),
    defineField({
      name: 'director',
      title: 'Director',
      type: 'reference',
      to: [{type: 'director'}],
      group: 'main',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      group: 'main',
      options: {
        source: (doc: any) => [doc.brand, doc.title].filter(Boolean).join(' '),
        maxLength: 80,
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'blurb',
      title: 'Blurb',
      type: 'text',
      rows: 3,
      group: 'main',
      description: 'One line shown under the player.',
    }),
    defineField({
      name: 'credit',
      title: 'Credit override',
      type: 'string',
      group: 'main',
      description: 'Only if the on-screen credit should differ from the director name (co-directed, etc).',
    }),
    defineField({
      name: 'externalLink',
      title: 'External link',
      type: 'url',
      group: 'main',
      description: 'Optional link out to a case study, article, or other site.',
    }),
    defineField({
      name: 'vimeoUrl',
      title: 'Vimeo link (full spot)',
      type: 'url',
      group: 'media',
      description: 'The vimeo.com link. Plays in the popup when the post is clicked.',
      validation: (r) =>
        r.required().uri({scheme: ['https']}).custom((v) =>
          !v || /vimeo\.com\/(video\/)?\d+/.test(v) ? true : 'Needs to be a vimeo.com link with a numeric ID',
        ),
    }),
    defineField({
      name: 'still',
      title: 'Still',
      type: 'image',
      group: 'media',
      options: {hotspot: true},
      description: 'Frame shown in the grid.',
      fields: [{name: 'alt', title: 'Alt text', type: 'string'}],
    }),
    defineField({
      name: 'loop',
      title: 'Hover loop',
      type: 'video',
      group: 'media',
      description: 'Short silent mp4 that plays in the grid on hover.',
    }),
    defineField({
      name: 'secondaryStill',
      title: 'Second still',
      type: 'image',
      group: 'media',
      options: {hotspot: true},
      description: 'Only used by the "Two images" grid size.',
      fields: [{name: 'alt', title: 'Alt text', type: 'string'}],
      hidden: ({document}) => document?.gridSize !== 'featured',
    }),
    defineField({
      name: 'gridSize',
      title: 'Grid size',
      type: 'string',
      group: 'layout',
      options: {
        layout: 'radio',
        list: [
          {title: 'Half width', value: 'half-width'},
          {title: 'Full width image', value: 'full-width'},
          {title: 'Two images', value: 'featured'},
        ],
      },
      initialValue: 'half-width',
    }),
    defineField({
      name: 'wpId',
      title: 'WordPress ID',
      type: 'number',
      hidden: true,
      readOnly: true,
    }),
  ],
  preview: {
    select: {brand: 'brand', title: 'title', director: 'director.name', media: 'still'},
    prepare: ({brand, title, director, media}) => ({
      title: [brand, title].filter(Boolean).join(' · '),
      subtitle: director,
      media,
    }),
  },
})
