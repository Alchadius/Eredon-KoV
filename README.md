# Eredon KoV
Windows desktop version of Knights of Valor (Eredon). Website, installer page and updates: https://eredon-kov.com

- `game/` - the game itself as bundled into the installer (updated in-app via the Update button)
- `site/` - the website and update files served from https://eredon-kov.com (upload this folder to Cloudflare for each release)
- `app/` - Electron shell + installer config (the installer is built on a Windows PC with build-installer.bat)
- `tools/sigserver.js` - optional self-hosted matchmaker (testing/fallback)
- `tools/publish_site.py` - builds `game/` and `site/game/` (with checksums) from the latest game build
