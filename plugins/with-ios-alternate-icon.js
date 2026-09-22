const { withDangerousMod, withInfoPlist, withXcodeProject, IOSConfig } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const LIGHT_ICON = "assets/images/ios-icon-light.png";
const DARK_ICON = "assets/images/ios-icon-dark.png";
const ALTERNATE_ICON_NAME = "AppIconDark";

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function withAppIconAssets(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosRoot = IOSConfig.Paths.getSourceRoot(projectRoot);
      const catalog = path.join(iosRoot, "Images.xcassets");

      const lightSet = path.join(catalog, "AppIcon.appiconset");
      copyFile(path.join(projectRoot, LIGHT_ICON), path.join(lightSet, "App-Icon-1024x1024@1x.png"));
      writeJson(path.join(lightSet, "Contents.json"), {
        images: [
          {
            filename: "App-Icon-1024x1024@1x.png",
            idiom: "universal",
            platform: "ios",
            size: "1024x1024",
          },
        ],
        info: {
          version: 1,
          author: "expo",
        },
      });

      const darkSet = path.join(catalog, `${ALTERNATE_ICON_NAME}.appiconset`);
      copyFile(
        path.join(projectRoot, DARK_ICON),
        path.join(darkSet, "App-Icon-1024x1024@1x.png")
      );
      writeJson(path.join(darkSet, "Contents.json"), {
        images: [
          {
            filename: "App-Icon-1024x1024@1x.png",
            idiom: "universal",
            platform: "ios",
            size: "1024x1024",
          },
        ],
        info: {
          version: 1,
          author: "expo",
        },
      });

      return cfg;
    },
  ]);
}

function withAlternateIconPlist(config) {
  return withInfoPlist(config, (cfg) => {
    const iconEntry = {
      CFBundleIconFiles: [ALTERNATE_ICON_NAME],
      CFBundleIconName: ALTERNATE_ICON_NAME,
      UIPrerenderedIcon: true,
    };
    const icons = {
      CFBundlePrimaryIcon: {
        CFBundleIconFiles: ["AppIcon"],
        CFBundleIconName: "AppIcon",
      },
      CFBundleAlternateIcons: {
        [ALTERNATE_ICON_NAME]: iconEntry,
      },
    };
    cfg.modResults.CFBundleIcons = icons;
    cfg.modResults["CFBundleIcons~ipad"] = icons;
    return cfg;
  });
}

function withAlternateIconBuildSettings(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    Object.values(configurations).forEach((entry) => {
      if (!entry || !entry.buildSettings) {
        return;
      }
      if (!entry.buildSettings.ASSETCATALOG_COMPILER_APPICON_NAME) {
        return;
      }
      entry.buildSettings.ASSETCATALOG_COMPILER_APPICON_NAME = "AppIcon";
      entry.buildSettings.ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS = "YES";
      entry.buildSettings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = ALTERNATE_ICON_NAME;
    });
    return cfg;
  });
}

function withIosAlternateIcon(config) {
  config = withAppIconAssets(config);
  config = withAlternateIconPlist(config);
  config = withAlternateIconBuildSettings(config);
  return config;
}

module.exports = withIosAlternateIcon;
