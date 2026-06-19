# App store badges

The "Get the app" popup in the site header (and anywhere else `StoreBadge` is used)
renders the **official** Apple App Store and Google Play badges from this folder.

Until the two files below are present, the popup gracefully falls back to a plain
icon + text pill — so nothing looks broken. Drop the official files in and the real
badges appear automatically (no code change needed).

## Files to add

| File (exact name)            | Where to get it                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `public/badges/app-store.svg`   | Apple — https://developer.apple.com/app-store/marketing/guidelines/#section-badges (download the "Download on the App Store" badge, black, SVG) |
| `public/badges/google-play.svg` | Google — https://play.google.com/intl/en_us/badges/ (generate the "Get it on Google Play" badge) |

## Notes

- Both render at `h-10` (40px tall), width auto — the standard badge sizes fit fine.
- Keep the official artwork unmodified and follow each store's brand guidelines
  (don't recolor, stretch, or alter them).
- If you change the filenames, update the `img=` props in
  `src/components/public/SiteHeader.tsx`.
