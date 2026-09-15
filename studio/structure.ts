import type {StructureResolver} from 'sanity/structure'

const singleton = (S: any, type: string, title: string) =>
  S.listItem().title(title).id(type).child(S.document().schemaType(type).documentId(type))

export const structure: StructureResolver = (S) =>
  S.list()
    .title('JOJX')
    .items([
      // roster order lives on this singleton; drag the list to reorder the Directors page
      singleton(S, 'directorsPage', 'Directors page'),
      S.documentTypeListItem('director').title('Directors'),
      S.divider(),
      // every spot, grouped by whose page it belongs to
      S.listItem()
        .title('Work by director')
        .id('work-by-director')
        .child(
          S.documentTypeList('director')
            .title('Work by director')
            .child((directorId: string) =>
              S.documentList()
                .title('Projects')
                .filter('_type == "project" && director._ref == $directorId')
                .params({directorId})
                .defaultOrdering([{field: 'brand', direction: 'asc'}]),
            ),
        ),
      S.documentTypeListItem('project').title('All work'),
      S.divider(),
      singleton(S, 'homepage', 'Homepage'),
      singleton(S, 'infoPage', 'Info page'),
      singleton(S, 'contact', 'Contact'),
      S.divider(),
      singleton(S, 'siteSettings', 'Site settings'),
    ])
