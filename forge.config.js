const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  buildIdentifier: 'veil',
  packagerConfig: {
    asar: true,
    ignore: (path) => {
      if (!path) return false;
      if (path.includes('.next')) return true;
      if (path.includes('.git')) return true;
      if (path.startsWith('/src')) return true;
      if (path.startsWith('/components')) return true;
      if (path.startsWith('/app')) return true;
      if (path.startsWith('/release')) return true;
      if (path.startsWith('/dist')) return true;
      if (path.includes('node_modules/.cache')) return true;
      return false;
    }
  },
  outDir: 'release-forge',
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
