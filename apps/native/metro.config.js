const { getDefaultConfig } = require("expo/metro-config")
const { withUniwindConfig } = require("uniwind/metro")

/** @type {import('expo/metro-config').MetroConfig} */
// biome-ignore lint: Metro CJS config requires __dirname
const config = getDefaultConfig(__dirname)

const uniwindConfig = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts"
})

module.exports = uniwindConfig
