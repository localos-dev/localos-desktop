/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "xyz.localos.desktop",
  productName: "LocalOS",
  copyright: "LocalOS",

  directories: {
    output: "release",
    buildResources: "build",
  },

  files: [
    "dist/**/*",
    "package.json",
  ],

  extraResources: [
    {
      from: "resources/frontend",
      to: "frontend",
      filter: ["**/*"],
    },
    {
      from: "resources/api",
      to: "api",
      filter: ["**/*"],
    },
    {
      from: "node_modules/better-sqlite3",
      to: "api/node_modules/better-sqlite3",
      filter: ["**/*"],
    },
    {
      from: "node_modules/bindings",
      to: "api/node_modules/bindings",
      filter: ["**/*"],
    },
    {
      from: "node_modules/file-uri-to-path",
      to: "api/node_modules/file-uri-to-path",
      filter: ["**/*"],
    },
  ],

  asar: true,
  asarUnpack: [
    "node_modules/better-sqlite3/**/*",
  ],

  mac: {
    category: "public.app-category.productivity",
    target: [
      { target: "dmg", arch: ["x64", "arm64"] },
    ],
    icon: "build/icon.icns",
    hardenedRuntime: true,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
  },

  dmg: {
    title: "LocalOS",
    contents: [
      { x: 130, y: 220, type: "file" },
      { x: 410, y: 220, type: "link", path: "/Applications" },
    ],
    window: { width: 540, height: 380 },
  },

  win: {
    target: [
      { target: "nsis", arch: ["x64"] },
    ],
    icon: "build/icon.ico",
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "LocalOS",
  },

  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
    ],
    icon: "build/icon.png",
    category: "Utility",
  },

  publish: {
    provider: "github",
    owner: "localos-dev",
    repo: "localos-desktop",
    releaseType: "release",
  },
}
