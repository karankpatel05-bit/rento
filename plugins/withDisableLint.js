const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to disable strict lint vital checks during Android release builds.
 * This prevents minor lint issues in third-party libraries (e.g. expo-modules-core, expo-updates)
 * from failing ./gradlew assembleRelease.
 */
module.exports = function withDisableLint(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (!modConfig.modResults.contents.includes('checkReleaseBuilds false')) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /android\s*\{/,
        `android {
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }`
      );
    }
    return modConfig;
  });
};
