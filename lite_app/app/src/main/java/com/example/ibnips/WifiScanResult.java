package com.example.ibnips;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Model representing a single Wi-Fi access point from a scan result.
 */
public class WifiScanResult {

    public final String bssid;
    public final String ssid;
    public final int rssi; // dBm

    public WifiScanResult(String bssid, String ssid, int rssi) {
        this.bssid = bssid;
        this.ssid  = ssid;
        this.rssi  = rssi;
    }

    /**
     * Serialise to JSON matching the backend fingerprint schema.
     * {"bssid":"aa:bb:cc:dd:ee:ff","ssid":"IITB-WiFi","rssi":-65}
     */
    public JSONObject toJSON() throws JSONException {
        JSONObject obj = new JSONObject();
        obj.put("bssid", bssid);
        obj.put("ssid",  ssid);
        obj.put("rssi",  rssi);
        return obj;
    }

    /**
     * Deserialise from a JSON object (reverse of toJSON).
     */
    public static WifiScanResult fromJSON(JSONObject obj) throws JSONException {
        String bssid = obj.getString("bssid");
        String ssid  = obj.optString("ssid", "");
        int    rssi  = obj.getInt("rssi");
        return new WifiScanResult(bssid, ssid, rssi);
    }

    @Override
    public String toString() {
        return "WifiScanResult{bssid='" + bssid + "', ssid='" + ssid + "', rssi=" + rssi + '}';
    }
}
