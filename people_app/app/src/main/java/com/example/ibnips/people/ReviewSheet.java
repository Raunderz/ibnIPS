package com.example.ibnips.people;

import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.example.ibnips.people.models.FeedbackItem;

import java.util.List;
import java.util.Locale;

/**
 * Google Maps styled bottom sheet dialog for viewing ratings & reviews.
 */
public class ReviewSheet {

    private final Activity activity;
    private Dialog dialog;

    public ReviewSheet(Activity activity) {
        this.activity = activity;
    }

    public void show(List<FeedbackItem> items, String roomName) {
        if (activity.isFinishing()) return;

        if (dialog != null && dialog.isShowing()) {
            dialog.dismiss();
        }

        dialog = new Dialog(activity, R.style.Theme_BottomSheetDialog);
        View root = LayoutInflater.from(activity).inflate(R.layout.sheet_reviews, null);
        dialog.setContentView(root);

        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            window.setGravity(Gravity.BOTTOM);
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.dimAmount = 0.35f;
            window.setAttributes(lp);
        }

        TextView title = root.findViewById(R.id.sheetTitle);
        TextView subtitle = root.findViewById(R.id.sheetSubtitle);
        Button btnClose = root.findViewById(R.id.btnCloseReviews);
        LinearLayout list = root.findViewById(R.id.sheetReviewsList);

        if (roomName != null && !roomName.isEmpty()) {
            title.setText("Reviews for " + roomName);
        } else {
            title.setText("Ratings & Reviews");
        }

        int count = items != null ? items.size() : 0;
        double avg = 0;
        int ratingCount = 0;
        if (items != null) {
            for (FeedbackItem item : items) {
                if (item.rating != null && item.rating > 0) {
                    avg += item.rating;
                    ratingCount++;
                }
            }
        }
        if (ratingCount > 0) {
            avg /= ratingCount;
            subtitle.setText(String.format(Locale.getDefault(), "★ %.1f avg • %d %s", avg, count, count == 1 ? "review" : "reviews"));
        } else {
            subtitle.setText(count + (count == 1 ? " review" : " reviews"));
        }

        btnClose.setOnClickListener(v -> dialog.dismiss());

        list.removeAllViews();
        if (items == null || items.isEmpty()) {
            TextView empty = new TextView(activity);
            empty.setText("No reviews available yet.");
            empty.setTextColor(Color.parseColor("#80868B"));
            empty.setTextSize(14f);
            empty.setPadding(48, 48, 48, 48);
            empty.setGravity(Gravity.CENTER);
            list.addView(empty);
        } else {
            LayoutInflater inf = LayoutInflater.from(activity);
            for (FeedbackItem item : items) {
                View row = inf.inflate(R.layout.item_review, list, false);
                TextView avatar   = row.findViewById(R.id.reviewAvatar);
                TextView username = row.findViewById(R.id.reviewUsername);
                TextView stars    = row.findViewById(R.id.reviewStars);
                TextView date     = row.findViewById(R.id.reviewDate);
                TextView comment  = row.findViewById(R.id.reviewComment);

                String name = (item.username != null && !item.username.trim().isEmpty()) ? item.username : "Anonymous";
                username.setText(name);

                // Initial for avatar circle
                String initial = name.substring(0, 1).toUpperCase(Locale.getDefault());
                avatar.setText(initial);

                String starStr = item.stars();
                if (starStr != null && !starStr.isEmpty()) {
                    stars.setText(starStr);
                    stars.setVisibility(View.VISIBLE);
                } else {
                    stars.setVisibility(View.GONE);
                }

                if (item.createdAt != null && item.createdAt.length() >= 10) {
                    date.setText(item.createdAt.substring(0, 10));
                    date.setVisibility(View.VISIBLE);
                } else {
                    date.setVisibility(View.GONE);
                }

                comment.setText((item.comment != null && !item.comment.isEmpty()) ? item.comment : "—");
                list.addView(row);
            }
        }

        dialog.show();
    }

    public void dismiss() {
        if (dialog != null && dialog.isShowing()) {
            dialog.dismiss();
        }
    }
}
