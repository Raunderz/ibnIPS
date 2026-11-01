package com.example.ibnips.people.models;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Backend response from GET /api/feedback?limit=500.
 */
public class FeedbackResponse {

    public int    total;
    public List<FeedbackItem> items = new ArrayList<>();

    public FeedbackResponse() {}

    public float averageRating() {
        int sum = 0, count = 0;
        for (FeedbackItem item : items) {
            if (item.rating != null) {
                sum += item.rating;
                count++;
            }
        }
        return count == 0 ? 0f : (float) sum / count;
    }

    public static FeedbackResponse fromJSON(JSONObject obj) throws JSONException {
        FeedbackResponse response = new FeedbackResponse();
        response.total = obj.optInt("total", 0);
        JSONArray arr = obj.optJSONArray("items");
        if (arr != null) {
            response.items = FeedbackItem.fromJSON(arr);
        }
        return response;
    }
}
