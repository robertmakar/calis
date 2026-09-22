const { withEntitlementsPlist, withInfoPlist, withXcodeProject, IOSConfig } = require("expo/config-plugins");

const UPDATE_USAGE =
  "CALIS uses Apple Health to save your completed workouts to your Health history.";

function withHealthKitFramework(config) {
  return withXcodeProject(config, (cfg) => {
    IOSConfig.XcodeUtils.addFramework({
      project: cfg.modResults,
      projectName: cfg.modRequest.projectName,
      framework: "HealthKit.framework",
    });
    return cfg;
  });
}

function withIosHealthKit(config) {
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults["com.apple.developer.healthkit"] = true;
    return cfg;
  });

  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSHealthUpdateUsageDescription = UPDATE_USAGE;
    return cfg;
  });

  config = withHealthKitFramework(config);
  return config;
}

module.exports = withIosHealthKit;

