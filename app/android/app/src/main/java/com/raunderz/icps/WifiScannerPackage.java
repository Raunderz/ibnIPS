package com.raunderz.icps;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.ModuleSpec;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import java.util.Arrays;
import java.util.List;

public class WifiScannerPackage extends BaseReactPackage {
  @Override
  public List<ModuleSpec> getNativeModules(ReactApplicationContext reactContext) {
    return Arrays.<ModuleSpec>asList(
      new ModuleSpec(WifiScannerModule.class, () -> new WifiScannerModule(reactContext))
    );
  }
}