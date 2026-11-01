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

import java.util.List;
import java.util.Locale;

/**
 * Google Maps styled bottom sheet dialog for viewing turn-by-turn route steps.
 */
public class RouteSheet {

    public interface OnRouteActionListener {
        void onClearRoute();
    }

    private final Activity activity;
    private Dialog dialog;
    private OnRouteActionListener listener;

    public RouteSheet(Activity activity) {
        this.activity = activity;
    }

    public void setOnRouteActionListener(OnRouteActionListener listener) {
        this.listener = listener;
    }

    public void show(List<Router.Step> steps, String fromName, String toName) {
        if (activity.isFinishing()) return;

        if (dialog != null && dialog.isShowing()) {
            dialog.dismiss();
        }

        dialog = new Dialog(activity, R.style.Theme_BottomSheetDialog);
        View root = LayoutInflater.from(activity).inflate(R.layout.sheet_route, null);
        dialog.setContentView(root);

        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            window.setGravity(Gravity.BOTTOM);
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.dimAmount = 0.25f;
            window.setAttributes(lp);
        }

        TextView timeText = root.findViewById(R.id.routeEstTime);
        TextView distText = root.findViewById(R.id.routeEstDistance);
        Button btnClear   = root.findViewById(R.id.btnClearRoute);
        LinearLayout list = root.findViewById(R.id.routeStepsList);

        int hops = steps != null ? Math.max(1, steps.size() - 1) : 0;
        int mins = Math.max(1, (hops + 1) / 2);
        timeText.setText("~" + mins + " min walk");
        distText.setText(hops + " hops • " + fromName + " → " + toName);

        btnClear.setOnClickListener(v -> {
            dialog.dismiss();
            if (listener != null) listener.onClearRoute();
        });

        list.removeAllViews();
        if (steps != null && !steps.isEmpty()) {
            for (int i = 0; i < steps.size(); i++) {
                Router.Step step = steps.get(i);
                LinearLayout row = new LinearLayout(activity);
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setGravity(Gravity.CENTER_VERTICAL);
                row.setPadding(0, 10, 0, 10);

                TextView icon = new TextView(activity);
                icon.setTextSize(16f);
                icon.setPadding(0, 0, 16, 0);

                TextView text = new TextView(activity);
                text.setTextSize(14f);
                text.setTextColor(Color.parseColor("#202124"));

                if (i == 0) {
                    icon.setText("🟢");
                    text.setText("Start at " + (step.name != null ? step.name : step.nodeId) + " (Floor " + step.floor + ")");
                    text.setTextColor(Color.parseColor("#188038"));
                    text.getPaint().setFakeBoldText(true);
                } else if (i == steps.size() - 1) {
                    icon.setText("🔴");
                    text.setText("Arrive at " + (step.name != null ? step.name : step.nodeId) + " (Floor " + step.floor + ")");
                    text.setTextColor(Color.parseColor("#D93025"));
                    text.getPaint().setFakeBoldText(true);
                } else {
                    icon.setText("⚪");
                    String dir = (step.fromDirection != null && !step.fromDirection.isEmpty()) ? "Head " + step.fromDirection + " towards " : "Continue to ";
                    text.setText(dir + (step.name != null ? step.name : step.nodeId));
                }

                row.addView(icon);
                row.addView(text);
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
