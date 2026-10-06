import { PermissionsAndroid, Platform } from 'react-native'
import { isUsableReading } from './fingerprintMatcher.js'

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
    'Android limits how often Wi-Fi can be scanned. Wait about 30 seconds and try again.',
  couldNotEnableWifi:
    'Turn on Wi-Fi, then scan again.',
  emptyScan:
    'The scan came back with no usable Wi-Fi networks. Turn Wi-Fi on, leave location services switched on, and scan again.',
  exception: 'The Wi-Fi scan failed unexpectedly.',
}

/**
 * Failures that a second attempt has a real chance of clearing.
 *
 * Android redacts every BSSID to `02:00:00:00:00:00` unless it has location
 * permission *and* location services are on, so an app that just missed the
 * permission grant sees a scan that is present but empty. The same happens on
 * the first scan after launch, before the Wi-Fi chipset has populated its
 * cache. Throttling and unexpected native errors are also worth one more go;
 * a denied permission or switched-off location services is not.
 */
const RETRYABLE_CODES = new Set(['couldNotScan', 'emptyScan', 'exception'])

/** Rescans are throttled, so retries are few and spaced rather than tight. */
const MAX_SCAN_ATTEMPTS = 3
const RETRY_DELAY_MS = 1_500

/** Android 13 is where `NEARBY_WIFI_DEVICES` became a runtime permission. */
const ANDROID_13 = 33

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

/**
 * Whether the device-wide location toggle is on.
 *
 * Distinct from the permission: Android hands back redacted BSSIDs when the
 * permission is granted but this is off, which looks exactly like a scan that
 * found nothing. `null` means the platform did not answer.
 */
export async function isLocationEnabled() {
  const wifi = loadWifiModule()

  if (!wifi?.isLocationEnabled) {
    return null
  }

  try {
    return await wifi.isLocationEnabled()
  } catch {
    return null
  }
}

/**
 * Asks for `NEARBY_WIFI_DEVICES` on Android 13+.
 *
 * Best effort: scanning still works with location permission alone, so a
 * refusal is not treated as an error and never blocks the scan.
 */
export async function requestNearbyDevicesPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < ANDROID_13) {
    return true
  }

  const permission = PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES

  if (!permission) {
    return true
  }

  try {
    const granted = await PermissionsAndroid.check(permission)

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return true
    }

    const result = await PermissionsAndroid.request(permission)

    return result === PermissionsAndroid.RESULTS.GRANTED
  } catch {
    return false
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
 * One pass at the native module: a fresh scan when forced, otherwise the
 * chipset's cached list.
 *
 * A fresh scan that Android throttles falls back to the cache, because stale
 * readings still localise the user reasonably well.
 */
async function readOnce(wifi, forceScan) {
  const reader = forceScan ? wifi.reScanAndLoadWifiList : wifi.loadWifiList

  if (typeof reader !== 'function') {
    throw new WifiScanError(ERROR_MESSAGES.exception, 'exception')
  }

  try {
    const entries = await reader.call(wifi)

    if (!Array.isArray(entries)) {
      throw new WifiScanError(ERROR_MESSAGES.exception, 'exception')
    }

    return entries
  } catch (error) {
    const scanError = toWifiScanError(error)

    if (scanError.code !== 'couldNotScan') {
      throw scanError
    }

    try {
      const cached = await wifi.loadWifiList()

      if (Array.isArray(cached)) {
        return cached
      }
    } catch {
      // Fall through and report the throttling error, which is the real cause.
    }

    throw scanError
  }
}

/**
 * Returns surrounding access points as `{ bssid, ssid, rssi }`.
 *
 * Retries while the readings come back unusable, because "no BSSIDs" usually
 * means a permission or location-services problem that has just been resolved,
 * or a chipset cache that has not filled yet, rather than an empty room.
 */
export async function scanWifiNetworks({
  forceScan = true,
  attempts = MAX_SCAN_ATTEMPTS,
} = {}) {
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

  // Requested after the location prompt so the two dialogs do not race.
  await requestNearbyDevicesPermission()

  const locationEnabled = await isLocationEnabled()

  if (locationEnabled === false) {
    throw new WifiScanError(
      ERROR_MESSAGES.locationServicesOff,
      'locationServicesOff',
    )
  }

  const totalAttempts = Math.max(1, attempts)
  let lastError = new WifiScanError(ERROR_MESSAGES.emptyScan, 'emptyScan')

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      const entries = await readOnce(wifi, forceScan)
      const readings = entries.map(toReading)

      // `isUsableReading` reads the normalised `{ bssid, rssi }` shape, so this
      // has to run on `readings` rather than on the native entries.
      if (readings.some(isUsableReading)) {
        return {
          readings,
          capturedAt: Date.now(),
        }
      }

      lastError = new WifiScanError(ERROR_MESSAGES.emptyScan, 'emptyScan')
    } catch (error) {
      lastError = toWifiScanError(error)

      if (!RETRYABLE_CODES.has(lastError.code)) {
        throw lastError
      }
    }

    if (attempt < totalAttempts) {
      await delay(RETRY_DELAY_MS)
    }
  }

  throw lastError
}
