package com.example.ibnips.people.models;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * A single Wi-Fi access point from a scan result.
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

    public JSONObject toJSON() throws JSONException {
        JSONObject obj = new JSONObject();
        obj.put("bssid", bssid);
        obj.put("ssid",  ssid);
        obj.put("rssi",  rssi);
        return obj;
    }

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
