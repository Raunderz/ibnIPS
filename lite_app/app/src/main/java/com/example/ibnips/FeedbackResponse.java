package com.example.ibnips;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Backend response from GET /api/feedback — every stored response, newest first.
 */
public class FeedbackResponse {

    /** How many responses exist in total, which may exceed {@link #items}. */
    public int                total;
    public List<FeedbackItem> items;

    public FeedbackResponse() {
        items = new ArrayList<>();
    }

    /**
     * Expected shape:
     * {"total": 30, "feedback": [ {...}, ... ]}
     */
    public static FeedbackResponse fromJSON(JSONObject obj) throws JSONException {
        FeedbackResponse response = new FeedbackResponse();

        // `total` counts the whole table server-side, so it stays a true answer
        // to "how many people have responded" however many were returned.
        response.total = obj.optInt("total", 0);

        JSONArray arr = obj.optJSONArray("feedback");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                response.items.add(FeedbackItem.fromJSON(arr.getJSONObject(i)));
            }
        }
        return response;
    }

    /**
     * Mean of the ratings that were actually given, or 0 when nobody rated.
     *
     * <p>Unrated responses are left out of the average rather than counted as
     * zero — someone who wrote a comment and skipped the stars did not think the
     * app was the worst thing they used today, and averaging them in would drag
     * the number below what the raters actually said.
     */
    public float averageRating() {
        int sum = 0;
        int count = 0;
        for (FeedbackItem item : items) {
            if (item.rating > 0) {
                sum += item.rating;
                count++;
            }
        }
        return count == 0 ? 0f : (float) sum / count;
    }
}
