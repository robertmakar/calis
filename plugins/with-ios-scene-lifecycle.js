const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const START_REACT_NATIVE_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)[\s\S]*?factory\.startReactNative\([\s\S]*?\)\s*#endif/;

const SCENE_OWNED_STARTUP =
  "    // Window + React Native startup are owned by SceneDelegate (UIScene lifecycle).";

const CALIS_APPEARANCE = `
enum CalisAppearance {
  static let preferenceKey = "calis.appearance"

  static func interfaceStyle() -> UIUserInterfaceStyle {
    switch UserDefaults.standard.string(forKey: preferenceKey) {
    case "light":
      return .light
    case "dark":
      return .dark
    default:
      return .unspecified
    }
  }

  static func apply(to window: UIWindow?) {
    window?.overrideUserInterfaceStyle = interfaceStyle()
  }

  static func applyToAllWindows() {
    let style = interfaceStyle()
    for scene in UIApplication.shared.connectedScenes {
      guard let windowScene = scene as? UIWindowScene else { continue }
      for window in windowScene.windows {
        window.overrideUserInterfaceStyle = style
      }
    }
  }
}
`;

const SCENE_DELEGATE = `
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    CalisAppearance.apply(to: window)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)
    self.window = window
    appDelegate.window = window

    if let urlContext = connectionOptions.urlContexts.first {
      _ = RCTLinkingManager.application(UIApplication.shared, open: urlContext.url, options: [:])
    }
    if let userActivity = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
      _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      return cfg;
    }

    let contents = cfg.modResults.contents;

    if (!contents.includes("var launchOptions:")) {
      contents = contents.replace(
        "var reactNativeFactory: RCTReactNativeFactory?",
        "var reactNativeFactory: RCTReactNativeFactory?\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?"
      );
    }

    if (!contents.includes("self.launchOptions = launchOptions")) {
      contents = contents.replace(
        "reactNativeFactory = factory",
        "reactNativeFactory = factory\n    self.launchOptions = launchOptions"
      );
    }

    if (START_REACT_NATIVE_BLOCK.test(contents)) {
      contents = contents.replace(START_REACT_NATIVE_BLOCK, SCENE_OWNED_STARTUP);
    }

    if (!contents.includes("CalisAppearance.apply(to: window)")) {
      contents = contents.replace(
        "let window = UIWindow(windowScene: windowScene)\n    factory.startReactNative(",
        "let window = UIWindow(windowScene: windowScene)\n    CalisAppearance.apply(to: window)\n    factory.startReactNative("
      );
    }

    if (!contents.includes("class SceneDelegate")) {
      contents = contents.trimEnd() + "\n" + SCENE_DELEGATE;
    }

    if (!contents.includes("enum CalisAppearance")) {
      contents = contents.trimEnd() + "\n" + CALIS_APPEARANCE;
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withIosSceneLifecycle(config) {
  config = withSceneManifest(config);
  config = withSceneAppDelegate(config);
  return config;
}

module.exports = withIosSceneLifecycle;
