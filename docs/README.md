# JOJX site preview

The Claude Design homepage, served so the team can click it. `index.html` sends phones to
`mobile.html` and everything else to `home.html`.

Two things here are **generated from Sanity**, not hand-written. Regenerate both after any
content change in the studio (run from `docs/`, with `T` = Sanity token, `V` = Vimeo token):

    T=… V=… node build-home.mjs    # the 34 homepage work tiles + the director list
    T=… V=… node build-data.mjs    # the director pages

`build-home.mjs` rewrites only the blocks between the `BEGIN work` / `BEGIN directors` markers
in `home.html`; the rest of the design is untouched. `layout.json` holds the hand-composed tile
positions from the design, and anything past the 24th continues the same three-column rhythm,
so the homepage can grow without a redesign.

`directors-data.js` is **generated**, not hand-written. The design imports it for the director
pages. Rebuild it after changing the roster, a director's work order, or any clip:

    cd docs
    T=<sanity read token> V=<vimeo token> node build-data.mjs

It reads the roster and work order from Sanity and asks Vimeo for a playable file per clip
(720p for grid tiles, 1080p for reels). Without it the director pages fail to load and the
homepage layout breaks, which is what went wrong with the earlier upload.

This is a preview of the design, not the production site. The real site comes next: Next.js
reading the same Sanity content, on Vercel.
