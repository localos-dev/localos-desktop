# LocalOS Desktop

The desktop build of LocalOS. Install once, run forever. All AI inference happens on your machine with no cloud and no internet required.

LocalOS Desktop is in early access. The app is fully functional and ready to use. As an early release, you may encounter occasional bugs.

## Download

Go to [Releases](https://github.com/localos-dev/localos-desktop/releases) and download the latest version for your platform.

- macOS: download the .dmg file
- Windows: download the .exe installer

## Installation

### macOS

1. Open the downloaded .dmg file
2. Drag LocalOS to your Applications folder
3. On first launch, if you see a security warning, right-click the app and choose Open

### Windows

1. Run the downloaded .exe installer
2. If Windows SmartScreen shows a warning, click More info then Run anyway
3. Follow the installer steps

## First use

1. Open LocalOS
2. Go to the Models page
3. Download a model (internet required for this step only)
4. Start chatting

After the model is downloaded, LocalOS works fully offline. No internet required.

## Requirements

- macOS 12 or later (Intel or Apple Silicon)
- Windows 10 or Windows 11 (64-bit)
- 4 GB RAM minimum, 8 GB recommended
- GPU with WebGPU support (most machines from 2020 and newer)
- 5 to 10 GB free disk space for models

## Architecture

LocalOS Desktop is an Electron application that bundles:

- The LocalOS React frontend (built with Vite)
- The LocalOS Express API server (bundled with esbuild)
- SQLite database stored in the app data directory

The AI inference runs directly in the Chromium WebGPU layer. No model weights are sent to any server.

## Building from source

```
pnpm install
pnpm run compile
pnpm run package
```

Built installers are written to the release/ directory.

## Issues

Report bugs at https://github.com/localos-dev/localos-desktop/issues

## Links

- Website: https://localos.xyz
- Documentation: https://localos.xyz/docs
- GitHub: https://github.com/localos-dev
