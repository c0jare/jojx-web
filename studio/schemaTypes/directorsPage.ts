import {defineField, defineType} from 'sanity'

// Controls the order of the roster on the Directors page. Drag to reorder.
export default defineType({
  name: 'directorsPage',
  title: 'Directors page',
  type: 'document',
  fields: [
    defineField({
      name: 'roster',
      title: 'Roster order',
      type: 'array',
      description: 'Every director, in the order they appear on the site. Drag to reorder.',
      of: [{type: 'reference', to: [{type: 'director'}]}],
      validation: (r) => r.unique(),
    }),
  ],
  preview: {prepare: () => ({title: 'Directors page'})},
})
