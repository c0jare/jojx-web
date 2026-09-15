# JOJX Studio

Sanity Studio for jojx.co. Project `q198rjlt`, dataset `production`.

## Run it locally

```
cd studio
npm install
cp .env.example .env        # then fill in SANITY_STUDIO_PROJECT_ID=q198rjlt
npm run dev                 # http://localhost:3333
```

## Deploy the hosted studio

```
npm run deploy              # publishes to https://jojx.sanity.studio
```

Ordering is done with plain reference arrays (`directorsPage.roster`, `director.work`, `homepage.featuredWork`), not a plugin. `@sanity/orderable-document-list` was tried and dropped: its CommonJS-only build breaks `sanity schema extract`, which blocks every deploy.

## Content model

- `director`: name, slug, bio, abstract, cover still, reel (mp4), bio photo, links, and `work` (that director's spots in page order, drag to reorder).
- `project`: brand, spot title, director, slug, blurb, Vimeo link (full spot, opens in the popup), still, hover loop (mp4), second still, grid size.
- `directorsPage`: the roster in site order. Drag to reorder.
- `homepage`: featured work (references to projects, drag to reorder), slider (each frame is a still plus an optional motion clip), phone line.
- `infoPage`: mission, hero image.
- `contact`: general, team, representation.
- `siteSettings`: title, tagline, share image, GA IDs, socials.

## Clips

Hover loops, slider frames and director reels are **not** self-hosted. Each `video` field stores a `vimeo.com/<id>` link, and the front end turns that into something playable. The old WordPress stored signed `progressive_redirect` URLs that expire; the numeric id inside them is stable, so that is what was kept. Uploading a file stays available per-field for a clip that is not on Vimeo.

## Migration from WordPress

`scripts/migrate.mjs` reads `data/jojx-content-export.json` (pulled from api.jojx.co on Sept 8, 2026), uploads every image into Sanity's asset store, points every clip at Vimeo, and creates all documents with stable IDs (`director-<wpId>`, `project-<wpId>`). It has already been run; re-running is safe (assets are cached in `data/asset-cache.json`, documents are replaced in place). Needs `SANITY_WRITE_TOKEN` in `.env`.
