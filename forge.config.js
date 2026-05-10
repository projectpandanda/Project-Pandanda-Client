module.exports = {
  packagerConfig: {
    asar: true,

    asarUnpack: ["lib/plugins/**/*"],

    icon: "./lib/assets/icon",

    extraResource: ["./lib/plugins", "./lib/assets"],
  },

  makers: [
    {
      name: "@electron-forge/maker-squirrel",

      config: {
        name: "pdnorgclient",

        setupIcon: "./lib/assets/icon.ico",

        iconUrl: "https://pandanda.org/web/assets/favicon.ico",

        loadingGif: "./lib/assets/loader.gif",
      },
    },

    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
  ],
};
