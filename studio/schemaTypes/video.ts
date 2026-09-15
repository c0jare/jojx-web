import {defineField, defineType} from 'sanity'

// A short silent clip: a hover loop, a slider frame, or a director's reel.
// Normally this points at Vimeo, where the footage already lives. Uploading a file is the fallback
// for a clip that isn't on Vimeo, and costs Sanity storage and bandwidth.
export default defineType({
  name: 'video',
  title: 'Clip',
  type: 'object',
  fields: [
    defineField({
      name: 'source',
      title: 'Where the clip comes from',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          {title: 'Vimeo', value: 'vimeo'},
          {title: 'Uploaded file', value: 'upload'},
        ],
      },
      initialValue: 'vimeo',
    }),
    defineField({
      name: 'vimeoUrl',
      title: 'Vimeo link',
      type: 'url',
      description: 'Paste the vimeo.com link for this clip. It can be a different video from the full spot.',
      hidden: ({parent}) => parent?.source === 'upload',
      validation: (r) =>
        r.custom((v, context) => {
          const parent = context.parent as {source?: string} | undefined
          if (parent?.source === 'upload') return true
          if (!v) return true
          return /vimeo\.com\/(?:video\/)?\d+/.test(v) ? true : 'Needs to be a vimeo.com link with a numeric ID'
        }),
    }),
    defineField({
      name: 'file',
      title: 'MP4',
      type: 'file',
      options: {accept: 'video/mp4,video/quicktime,video/webm'},
      description: 'Only needed when the clip is not on Vimeo.',
      hidden: ({parent}) => parent?.source !== 'upload',
    }),
  ],
  preview: {
    select: {source: 'source', vimeoUrl: 'vimeoUrl', name: 'file.asset.originalFilename'},
    prepare: ({source, vimeoUrl, name}) => ({
      title: source === 'upload' ? name || 'No file yet' : vimeoUrl || 'No Vimeo link yet',
      subtitle: source === 'upload' ? 'uploaded file' : 'Vimeo',
    }),
  },
})
