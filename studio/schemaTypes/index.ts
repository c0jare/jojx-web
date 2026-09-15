import director from './director'
import project from './project'
import video from './video'
import directorsPage from './directorsPage'
import {homepage, infoPage, contact, siteSettings} from './singletons'

export const schemaTypes = [director, project, video, directorsPage, homepage, infoPage, contact, siteSettings]
export const singletonTypes = new Set(['directorsPage', 'homepage', 'infoPage', 'contact', 'siteSettings'])
