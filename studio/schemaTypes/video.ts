import {defineField, defineType} from 'sanity'

// A short mp4 (hover loop, reel) stored in Sanity's own asset store so it never depends on a signed Vimeo link.
export default defineType({
  name: 'video',
  title: 'Video file',
  type: 'object',
  fields: [
    defineField({
      name: 'file',
      title: 'MP4',
      type: 'file',
      options: {accept: 'video/mp4,video/quicktime,video/webm'},
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Original URL',
      type: 'url',
      description: 'Where this file came from (kept for reference).',
      readOnly: true,
      hidden: ({parent}) => !parent?.sourceUrl,
    }),
  ],
  preview: {
    select: {name: 'file.asset.originalFilename'},
    prepare: ({name}) => ({title: name || 'No file yet'}),
  },
})
