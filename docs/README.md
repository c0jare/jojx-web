# JOJX site preview

The Claude Design homepage, served so the team can click it. `index.html` sends phones to
`mobile.html` and everything else to `home.html`.

`directors-data.js` is **generated**, not hand-written. The design imports it for the director
pages. Rebuild it after changing the roster, a director's work order, or any clip:

    cd docs
    T=<sanity read token> V=<vimeo token> node build-data.mjs

It reads the roster and work order from Sanity and asks Vimeo for a playable file per clip
(720p for grid tiles, 1080p for reels). Without it the director pages fail to load and the
homepage layout breaks, which is what went wrong with the earlier upload.

This is a preview of the design, not the production site. The real site comes next: Next.js
reading the same Sanity content, on Vercel.
