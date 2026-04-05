# app.py — Improved Student Performance Predictor API
# Run: python app.py
# Then open index.html in your browser

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime, date
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

app = Flask(__name__)
CORS(app)

MODEL_PATH       = "model.pkl"
ENCODER_PATH     = "subject_encoder.pkl"
FEATURE_COLS_PATH = "feature_cols.pkl"
DATA_PATH        = "students_dataset.csv"

# ─────────────────────────────────────────
# UTILS
# ─────────────────────────────────────────

def days_until(exam_date_str):
    exam = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
    return max((exam - date.today()).days, 0)

def compute_trend(marks_list):
    if len(marks_list) < 2:
        return 0.0
    x = np.arange(len(marks_list))
    return float(np.polyfit(x, marks_list, 1)[0])

def load_model():
    """Load model, encoder, and feature cols from disk."""
    if not os.path.exists(MODEL_PATH):
        return None, None, None
    model       = joblib.load(MODEL_PATH)
    encoder     = joblib.load(ENCODER_PATH) if os.path.exists(ENCODER_PATH) else None
    feature_cols = joblib.load(FEATURE_COLS_PATH) if os.path.exists(FEATURE_COLS_PATH) else None
    return model, encoder, feature_cols

def preprocess(data, encoder):
    """
    Convert raw request data into the clean 10-feature vector.
    Cleaned features — removed: grade, past_mark_1–5 (redundant),
    exam_date (→ days_until_exam already computed).
    
    """
    marks = data["past_marks"]
    subject = data.get("subject", "Mathematics")

    # Encode subject safely
    subject_encoded = 0
    if encoder is not None:
        try:
            subject_encoded = int(encoder.transform([subject])[0])
        except Exception:
            subject_encoded = 0  # fallback to first class

    return {
        "avg_marks":            round(float(np.mean(marks)), 2),
        "last_mark":            float(marks[-1]),
        "marks_trend":          round(compute_trend(marks), 4),
        "marks_std":            round(float(np.std(marks)), 2),
        "study_hours_per_day":  float(data.get("study_hours_per_day", 3.0)),
        "study_consistency":    float(data.get("study_consistency", 0.70)),
        "attendance_pct":       float(data.get("attendance_pct", 80.0)),
        "num_weak_topics":      int(len(data.get("weak_topics", []))),
        "days_until_exam":      days_until(data["exam_date"]),
        "subject_encoded":      subject_encoded,
    }

# ─────────────────────────────────────────
# ROUTE 1: Predict future performance
# ─────────────────────────────────────────

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        model, encoder, feature_cols = load_model()

        if model is None:
            return jsonify({"error": "Model not trained yet. Run train_model.py first."}), 400

        # ── INPUTS ──
        marks = data.get("past_marks", [])
        study_hours = data.get("study_hours_per_day", 0)
        attendance = data.get("attendance_pct", 0)
        exam_date = data.get("exam_date")
        weak_topics = data.get("weak_topics", [])

        # ── FEATURE ENGINEERING ──
        avg_marks = np.mean(marks) if marks else 0
        marks_std = np.std(marks) if marks else 0
        marks_trend = (marks[-1] - marks[0]) if len(marks) > 1 else 0

        days_until_exam = 0
        if exam_date:
            exam_dt = datetime.strptime(exam_date, "%Y-%m-%d")
            days_until_exam = (exam_dt - datetime.now()).days

        features = preprocess(data, encoder)
        X = pd.DataFrame([features])

        # ── PREDICTION ──
        prediction = float(model.predict(X)[0])
        prediction = max(0, min(100, prediction))  # insures Not below <0 and more than >100

        # ── STATUS LOGIC ──
        if prediction >= 75:
            status = "Excellent"
            risk = "low"
            confidence = "High"
        elif prediction >= 55:
            status = "Average"
            risk = "medium"
            confidence = "Medium"
        else:
            status = "At Risk"
            risk = "high"
            confidence = "Low"

        # ── KEY DRIVERS ──
        drivers = []

        if marks_trend > 0:
            drivers.append({"factor": "Improving trend", "impact": "positive"})
        else:
            drivers.append({"factor": "Declining trend", "impact": "negative"})

        if study_hours >= 4:
            drivers.append({"factor": "High study hours", "impact": "positive"})
        else:
            drivers.append({"factor": "Low study hours", "impact": "negative"})

        if attendance < 75:
            drivers.append({"factor": "Low attendance", "impact": "negative"})
        else:
            drivers.append({"factor": "Good attendance", "impact": "positive"})

        if len(weak_topics) > 2:
            drivers.append({"factor": "Many weak topics", "impact": "negative"})

        # ── RESPONSE ──
        return jsonify({
            "predicted_score": round(prediction, 2),
            "status": status,
            "risk_level": risk,
            "confidence": confidence,
            "features_used": {
                "avg_marks": avg_marks,
                "marks_trend": marks_trend,
                "attendance_pct": attendance,
                "study_hours_per_day": study_hours,
                "num_weak_topics": len(weak_topics),
                "days_until_exam": days_until_exam
            },
            "key_drivers": drivers
        })

    except Exception as e:
        return jsonify({"error": str(e)})
# ─────────────────────────────────────────
# ROUTE 2: Weakness analysis
# ─────────────────────────────────────────

@app.route("/weakness", methods=["POST"])
def analyze_weakness():
    data = request.get_json()
    marks = data["past_marks"]
    weak_topics = data.get("weak_topics", [])
    strong_topics = data.get("strong_topics", [])
    avg = float(np.mean(marks))
    trend = compute_trend(marks)
    days_left = days_until(data["exam_date"])

    # Trend label
    if trend > 1.0:
        trend_label = "strongly improving"
    elif trend > 0.3:
        trend_label = "slightly improving"
    elif trend < -1.0:
        trend_label = "strongly declining"
    elif trend < -0.3:
        trend_label = "slightly declining"
    else:
        trend_label = "stable"

    analysis = {
        "average_score": round(avg, 2),
        "trend": trend_label,
        "trend_value": round(trend, 3),
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "focus_areas": [],
        "insights": [],
        "score_band": "At Risk" if avg < 55 else ("Average" if avg < 75 else "Good")
    }

    # Priority scoring per weak topic
    for i, topic in enumerate(weak_topics):
        if days_left < 14:
            priority = "critical"
        elif days_left < 30:
            priority = "high"
        else:
            priority = "medium" if i < 2 else "low"
        analysis["focus_areas"].append({
            "topic": topic,
            "priority": priority,
            "suggested_hours": 3 if priority in ("critical", "high") else 2
        })

    # Smart insight generation
    if trend < -1:
        analysis["insights"].append("📉 Marks are declining rapidly — review recent topics immediately.")
    if trend < -0.3 and data.get("study_hours_per_day", 3) < 3:
        analysis["insights"].append("⚠️ Declining marks + low study hours is a risky combination.")
    if data.get("study_hours_per_day", 3) < 2:
        analysis["insights"].append("⏰ Study hours are too low — aim for at least 3 hours daily.")
    if data.get("attendance_pct", 100) < 75:
        analysis["insights"].append("🏫 Low attendance creates knowledge gaps — attend all remaining classes.")
    if len(weak_topics) > 3:
        analysis["insights"].append(f"📚 {len(weak_topics)} weak areas is too many to fix at once — prioritize top 2 first.")
    if avg >= 75 and trend >= 0:
        analysis["insights"].append("✅ Strong performance with a positive trend — keep it up!")
    if data.get("study_consistency", 0.7) < 0.5:
        analysis["insights"].append("📅 Study consistency is low — create a fixed daily schedule.")
    if not analysis["insights"]:
        analysis["insights"].append("📊 Performance looks stable. Continue current study pattern.")

    return jsonify(analysis)

# ─────────────────────────────────────────
# ROUTE 3: Generate study plan
# ─────────────────────────────────────────

@app.route("/study-plan", methods=["POST"])
def study_plan():
    data = request.get_json()
    weak_topics   = data.get("weak_topics", [])
    strong_topics = data.get("strong_topics", [])
    days_left     = days_until(data["exam_date"])
    hours_per_day = float(data.get("study_hours_per_day", 3.0))
    marks         = data.get("past_marks", [60])
    avg           = float(np.mean(marks))

    total_hours   = days_left * hours_per_day
    # Allocate: 65% weak topics, 20% practice/tests, 15% strong topic revision
    weak_hours    = total_hours * 0.65
    practice_hrs  = total_hours * 0.20
    revision_hrs  = total_hours * 0.15

    plan = {
        "days_until_exam": days_left,
        "total_study_hours": round(total_hours, 1),
        "allocation": {
            "weak_topics": round(weak_hours, 1),
            "practice_tests": round(practice_hrs, 1),
            "revision": round(revision_hrs, 1)
        },
        "weekly_overview": [],
        "daily_schedule": [],
        "milestones": []
    }

    # Distribute weak topics
    if weak_topics:
        hrs_per_topic = round(weak_hours / len(weak_topics), 1)
        for i, topic in enumerate(weak_topics):
            urgency = "🔴 Critical" if i < 2 else ("🟡 Medium" if i < 4 else "🟢 Low")
            plan["weekly_overview"].append({
                "topic": topic,
                "type": "weak — focus study",
                "allocated_hours": hrs_per_topic,
                "urgency": urgency
            })

    for topic in strong_topics[:2]:
        plan["weekly_overview"].append({
            "topic": topic,
            "type": "strong — light revision",
            "allocated_hours": round(revision_hrs / max(len(strong_topics), 1), 1),
            "urgency": "🟢 Maintain"
        })

    # Dynamic daily schedule
    if weak_topics:
        plan["daily_schedule"] = [
            {"slot": "Morning", "duration": "1–1.5 hrs",
            "activity": f"Deep study: {weak_topics[0]}",
            "tip": "Hardest topic first while mind is fresh"},
            {"slot": "Afternoon", "duration": "1 hr",
            "activity": f"Practice problems — {weak_topics[1] if len(weak_topics) > 1 else weak_topics[0]}",
            "tip": "Apply what you studied; do past papers"},
            {"slot": "Evening", "duration": "30–45 min",
            "activity": "Quick revision + flashcards",
            "tip": "Review notes from today. No new topics."},
        ]
    else:
        plan["daily_schedule"] = [
            {"slot": "Morning", "duration": "1 hr",
            "activity": "Revision of strong topics",
            "tip": "Maintain and consolidate"},
            {"slot": "Afternoon", "duration": "1 hr",
            "activity": "Practice test papers",
            "tip": "Focus on speed and accuracy"},
            {"slot": "Evening", "duration": "30 min",
            "activity": "Self-assessment + notes",
            "tip": "Track your progress"},
        ]

    # Milestones
    if days_left >= 21:
        plan["milestones"] = [
            {"week": 1, "goal": f"Complete: {', '.join(weak_topics[:2]) or 'Core revision'}",
            "checkpoint": "Score 60%+ on a practice test"},
            {"week": 2, "goal": f"Complete: {', '.join(weak_topics[2:4]) or 'Problem practice'}",
            "checkpoint": "Score 70%+ on a practice test"},
            {"week": 3, "goal": "Full mock exam + weak area review",
            "checkpoint": "Score within 5 marks of target"},
        ]
    elif days_left >= 7:
        plan["milestones"] = [
            {"week": 1, "goal": f"Speed-cover: {', '.join(weak_topics[:3]) or 'All topics'}",
            "checkpoint": "Complete at least 2 past papers"}
        ]
    else:
        plan["milestones"] = [
            {"week": 1, "goal": "Focus only on highest-weight topics and past papers",
            "checkpoint": "Review notes + attempt 1 full mock"}
        ]

    return jsonify(plan)

# ─────────────────────────────────────────
# ROUTE 4: Health check
# ─────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    model_exists = os.path.exists(MODEL_PATH)
    enc_exists   = os.path.exists(ENCODER_PATH)
    data_exists  = os.path.exists(DATA_PATH)

    return jsonify({
        "status": "ok",
        "model_loaded": model_exists,
        "encoder_loaded": enc_exists,
        "data_available": data_exists,
        "ready": model_exists and enc_exists
    })

# ─────────────────────────────────────────
# ROUTE 5: Get subjects list
# ─────────────────────────────────────────

@app.route("/subjects", methods=["GET"])
def get_subjects():
    subjects = ["Chemistry", "Computer Science", "English",
                "Geography", "History", "Mathematics", "Physics", "Science"]
    if os.path.exists(ENCODER_PATH):
        enc = joblib.load(ENCODER_PATH)
        subjects = enc.classes_.tolist()
    return jsonify({"subjects": subjects})

if __name__ == "__main__":
    print("🚀 Student Predictor API starting on http://localhost:5000")
    print("📋 Endpoints: /predict  /weakness  /study-plan  /health  /subjects")
    app.run(debug=True, port=5000)
