const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional asset extensions
config.resolver.assetExts.push(
  // Audio formats
  'mp3',
  'wav',
  'm4a',
  'aac',
  // Video formats
  'mp4',
  'mov',
  'avi',
  // Font formats
  'ttf',
  'otf',
  'woff',
  'woff2'
);

// Optimize for production builds
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Enable tree shaking
config.transformer.unstable_allowRequireContext = true;

module.exports = config;