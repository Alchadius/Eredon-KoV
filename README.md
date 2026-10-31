# Eredon KoV
Windows desktop version of Knights of Valor (Eredon). Website, installer page and updates: https://eredon-kov.com

- `game/` - the game itself as bundled into the installer (updated in-app via the Update button)
- `site/` - the website and update files. The app checks `site/game/` on GitHub first (raw.githubusercontent.com, main branch), then https://eredon-kov.com and the workers.dev backup (upload this folder to Cloudflare to keep the backup current)
- `app/` - Electron shell + installer config (the installer is built on a Windows PC with build-installer.bat)
- `tools/sigserver.js` - optional self-hosted matchmaker (testing/fallback)
- `tools/publish_site.py` - builds `game/` and `site/game/` (with checksums) from the latest game build

Installer: build it on a Windows PC, then attach `Eredon-KoV-Setup.exe` to a GitHub Release. The website's Download button points at `releases/latest/download/Eredon-KoV-Setup.exe`.
