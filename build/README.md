# Build Resources

## App Icon

To set a custom app icon, place image files here:

- `icon.png` — Source icon (1024×1024 recommended). electron-builder will auto-generate platform-specific formats.
- `icon.icns` — macOS icon (optional, auto-generated from PNG if missing)
- `icon.ico` — Windows icon (optional, auto-generated from PNG if missing)

Without a custom icon, the default Electron icon will be used.

## macOS Entitlements

- `entitlements.mac.plist` — Required for hardened runtime when code-signing macOS builds.
