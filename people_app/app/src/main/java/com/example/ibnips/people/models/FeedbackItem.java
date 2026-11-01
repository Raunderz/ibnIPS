package com.example.ibnips.people.models;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * One feedback response from GET /api/feedback.
 */
public class FeedbackItem {

    public String feedbackId;
    public String username;
    public String comment;
    public Integer rating;      // nullable
    public String userId;       // nullable
    public String createdAt;

    public FeedbackItem() {}

    public String stars() {
        if (rating == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < rating; i++) sb.append("★");
        for (int i = rating; i < 5; i++) sb.append("☆");
        return sb.toString();
    }

    public static List<FeedbackItem> fromJSON(JSONArray arr) throws JSONException {
        List<FeedbackItem> list = new ArrayList<>();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.getJSONObject(i);
            FeedbackItem item = new FeedbackItem();
            item.feedbackId = o.optString("feedback_id", "");
            item.username   = o.optString("username", "Anonymous");
            item.comment    = o.optString("comment", "");
            item.rating     = o.isNull("rating") ? null : o.optInt("rating");
            item.userId     = o.isNull("user_id") ? null : o.optString("user_id", null);
            item.createdAt  = o.optString("created_at", "");
            list.add(item);
        }
        return list;
    }
}
