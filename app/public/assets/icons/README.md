Custom icon system for the dashboard.

Preferred naming:

- Asset icon: `assets/icons/assets/<asset-slug>.svg`
- Category fallback: `assets/icons/categories/<category-slug>.svg`
- Branch fallback: `assets/icons/branches/<branch-slug>.svg`

Examples:

- `assets/icons/assets/gripen-e.svg`
- `assets/icons/categories/missiles.svg`
- `assets/icons/branches/naval.svg`

PNG files are also supported, but SVG is preferred.

Asset-specific icons are activated by registering them in `src/config/assetMedia.ts`.
Category and branch fallbacks are already wired automatically.
