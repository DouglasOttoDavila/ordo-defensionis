Static media assets for the dashboard live here.

Structure:

- `icons/assets/` for platform-specific icons such as `gripen-e.svg`
- `icons/categories/` for category-level fallbacks such as `aircraft.svg`
- `icons/branches/` for branch-level fallbacks such as `naval.svg`
- `gallery/<asset-slug>/` for asset-specific photos such as `01-overview.webp`
- `gallery/images/` for auto-detected designation-based uploads such as `Igla-S-1.png`

Asset-specific icons and non-standard gallery files are registered in `src/config/assetMedia.ts`.
Category and branch SVGs are built-in fallbacks and load automatically.
Files dropped into `gallery/images/` are scanned by the local backend. Use the pattern `{designation}-1`, `{designation}-2`, `{designation}-3` and so on, with any supported image extension.
