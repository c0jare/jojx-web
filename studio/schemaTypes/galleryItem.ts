import {defineField, defineType} from 'sanity'

// One frame in the homepage slider: a still plus the short mp4 that plays in its place.
export default defineType({
  name: 'galleryItem',
  title: 'Slider frame',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Still',
      type: 'image',
      options: {hotspot: true},
      description: 'Shown while the clip loads, and used on its own if there is no clip.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'loop',
      title: 'Motion clip',
      type: 'video',
      description: 'Short silent mp4 that plays in the slider. Leave empty for a still frame.',
    }),
    defineField({name: 'alt', title: 'Alt text', type: 'string'}),
  ],
  preview: {
    select: {media: 'image', alt: 'alt', file: 'loop.file.asset.originalFilename'},
    prepare: ({media, alt, file}) => ({title: alt || 'Slider frame', subtitle: file ? 'motion' : 'still only', media}),
  },
})
