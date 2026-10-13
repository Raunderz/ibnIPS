package com.example.ibnips;

import org.json.JSONObject;

/**
 * One response from GET /api/feedback.
 *
 * <p>The endpoint is public and read-only as far as the app is concerned — the
 * reviews screen only shows responses, it never sends any.
 */
public class FeedbackItem {

    public int    feedbackId;
    public String username;
    public String comment;
    /** 1–5, or {@link #NO_RATING} when the sender only wrote a comment. */
    public int    rating;
    /** Roll number if the sender was logged in, else null. Not shown. */
    public String userId;
    /** Unix epoch seconds. */
    public long   createdAt;

    /** Sentinel for "no rating", so 0 can mean "a broken parse". */
    public static final int NO_RATING = 0;

    /**
     * Deserialise one row:
     * {"feedback_id":1,"username":"2401234","comment":"...","rating":4,
     *  "user_id":"2401234","created_at":1791905549}
     *
     * <p>`rating` and `user_id` are sent as JSON null rather than omitted, which
     * is what org.json turns into JSONObject.NULL — hence optInt with a fallback
     * rather than getInt, which would throw on that.
     */
    public static FeedbackItem fromJSON(JSONObject obj) {
        FeedbackItem item = new FeedbackItem();
        item.feedbackId = obj.optInt("feedback_id", 0);
        item.username   = obj.optString("username", "");
        item.comment    = obj.optString("comment", "");
        item.rating     = obj.isNull("rating") ? NO_RATING : obj.optInt("rating", NO_RATING);
        item.userId     = obj.isNull("user_id") ? null : obj.optString("user_id", null);
        item.createdAt  = obj.optLong("created_at", 0L);
        return item;
    }

    /** The rating as filled/empty stars, e.g. "★★★☆☆". */
    public String stars() {
        if (rating <= 0) return "";

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            sb.append(i < rating ? '★' : '☆');
        }
        return sb.toString();
    }
}
