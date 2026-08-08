# Asset sources and visual references

## Repository-owner assets

- `src/assets/blog-covers/1.jpg` … `15.png`
  - Added by repository owner `lfw` in commit `8bca0f1` (`feat(blog): add visual covers and motion polish`).
  - `15.png` is used for the homepage cover and default social image; the cover library is also used by article cards and pages.
- `public/mascot/ali.webp`
  - Added by repository owner `lfw` in commit `33dcbf9` (`feat(ai): turn assistant trigger into draggable pet`).
  - Used only as the LFW AI trigger/mascot.

The upstream creation/license metadata for these raster files is not embedded in the repository. They are treated as project-owner-provided assets; downstream reuse should obtain permission from the repository owner.

## Visual reference

- [cosZone/astro-koharu](https://github.com/cosZone/astro-koharu), local reference commit `2b62608936b551a9e8fdc98769eecb845f861fb2`, AGPL-3.0.
  - Referenced for the high-level Koharu-style cover composition and the idea of independently moving wave layers.
  - LFW Space uses its own Astro markup, two-layer path, timing, colors, responsive layout and reduced-motion behavior. No astro-koharu image asset is included.

## Generated release images

- `docs/images/*.webp` are screenshots generated from this repository's production build by `pnpm screenshots:capture`.
- `dist/_astro/*` social images are build outputs created by Astro Assets from the repository-owner cover library.

## Project license status

This repository currently has no LICENSE file. The project owner has not selected a code license; third-party references do not imply that this repository is licensed under their terms.
