import { PermissionsAndroid, Platform } from 'react-native'

/**
 * Adapter around `react-native-wifi-reborn`.
 *
 * Only Android exposes a full surrounding-network scan. iOS gives the app the
 * BSSID of the network it is joined to and nothing else, and browsers expose
 * nothing at all, so capability is checked before any native call is made.
 *
 * The native module is required lazily: its top-level code touches
 * `NativeModules.RNWifiModule`, which does not exist on web and would throw
 * during a web bundle.
 */

export const SCAN_PLATFORM = Object.freeze({
  full: 'full',
  currentOnly: 'current-only',
  unavailable: 'unavailable',
})

let wifiModuleCache

function loadWifiModule() {
  if (Platform.OS !== 'android') {
    return null
  }

  if (wifiModuleCache !== undefined) {
    return wifiModuleCache
  }

  try {
    wifiModuleCache = require('react-native-wifi-reborn').default
  } catch {
    wifiModuleCache = null
  }

  return wifiModuleCache
}

export function getScanCapability() {
  if (Platform.OS === 'android') {
    return SCAN_PLATFORM.full
  }

  if (Platform.OS === 'ios') {
    return SCAN_PLATFORM.currentOnly
  }

  return SCAN_PLATFORM.unavailable
}

export function isFullScanSupported() {
  return getScanCapability() === SCAN_PLATFORM.full
}

export class WifiScanError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'WifiScanError'
    this.code = code
  }
}

const ERROR_MESSAGES = {
  locationPermissionMissing:
    'ibnIPS needs location permission to read nearby Wi-Fi networks.',
  locationServicesOff:
    'Turn on Android location services so Wi-Fi scanning can run.',
  couldNotScan:
    'Android limits Wi-Fi scans. Wait about 30 seconds and try again.',
  couldNotEnableWifi:
    'Turn on Wi-Fi, then scan again.',
  exception: 'The Wi-Fi scan failed unexpectedly.',
}

function toWifiScanError(error) {
  const rawCode =
    typeof error === 'string' ? error : (error?.code ?? error?.message ?? '')
  const code = Object.keys(ERROR_MESSAGES).find(
    (known) => rawCode === known || rawCode.includes(known),
  )

  if (code) {
    return new WifiScanError(ERROR_MESSAGES[code], code)
  }

  return new WifiScanError(
    ERROR_MESSAGES.exception,
    'exception',
  )
}

export async function hasLocationPermission() {
  if (Platform.OS !== 'android') {
    return true
  }

  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    )
    return granted === PermissionsAndroid.RESULTS.GRANTED
  } catch {
    return false
  }
}

export async function requestLocationPermission() {
  if (Platform.OS !== 'android') {
    return true
  }

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Allow location for Wi-Fi scanning',
        message:
          'ibnIPS reads the Wi-Fi networks around you to work out which room you are in. Android requires location permission for this.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      },
    )

    return result === PermissionsAndroid.RESULTS.GRANTED
  } catch {
    return false
  }
}

export async function isWifiEnabled() {
  const wifi = loadWifiModule()

  if (!wifi?.isEnabled) {
    return null
  }

  try {
    return await wifi.isEnabled()
  } catch {
    return null
  }
}

function toReading(entry) {
  const bssid = entry?.BSSID ?? entry?.bssid
  const ssid = entry?.SSID ?? entry?.ssid
  const rssi = entry?.level ?? entry?.rssi

  return {
    bssid: typeof bssid === 'string' ? bssid : null,
    ssid: typeof ssid === 'string' ? ssid.replace(/^<|>"$/g, '') : '',
    rssi: Number.isFinite(Number(rssi)) ? Number(rssi) : null,
  }
}

/**
 * Returns surrounding access points as `{ bssid, ssid, rssi }`.
 *
 * Falls back to the cached results of the previous scan when Android refuses a
 * new one, because stale readings still localise the user reasonably well.
 */
export async function scanWifiNetworks({ forceScan = true } = {}) {
  const wifi = loadWifiModule()

  if (!wifi) {
    throw new WifiScanError(
      Platform.OS === 'ios'
        ? 'iOS does not allow apps to list nearby Wi-Fi networks.'
        : 'Wi-Fi scanning is not available on this platform.',
      'unsupported',
    )
  }

  const granted = await requestLocationPermission()

  if (!granted) {
    throw new WifiScanError(
      ERROR_MESSAGES.locationPermissionMissing,
      'locationPermissionMissing',
    )
  }

  const reader = forceScan ? wifi.reScanAndLoadWifiList : wifi.loadWifiList

  if (typeof reader !== 'function') {
    throw new WifiScanError(ERROR_MESSAGES.exception, 'exception')
  }

  let entries

  try {
    entries = await reader.call(wifi)
  } catch (error) {
    const scanError = toWifiScanError(error)

    if (scanError.code === 'couldNotScan') {
      try {
        entries = await wifi.loadWifiList()
      } catch {
        throw scanError
      }
    } else {
      throw scanError
    }
  }

  if (!Array.isArray(entries)) {
    throw new WifiScanError(ERROR_MESSAGES.exception, 'exception')
  }

  return {
    readings: entries.map(toReading),
    capturedAt: Date.now(),
  }
}
