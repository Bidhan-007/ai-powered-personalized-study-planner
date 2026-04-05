# 🎯 AI-Powered Personalized Study Planner 

An intelligent system that generates personalized study plans for students by analyzing their academic performance using Machine Learning.

---

## 📚 Table of Contents

- [📌 Project Overview](#-project-overview)  
- [🧠 AI Component](#-ai-component)  
- [🏗️ Project Structure](#️-project-structure)  
- [⚙️ How It Works (Pipeline)](#️-how-it-works-pipeline)  
- [🚀 Installation & Setup](#-installation--setup)  
- [📊 Technologies Used](#-technologies-used)  
- [🔥 Key Features](#-key-features)  
- [📌 Future Improvements](#-future-improvements)    
- [🎯 Conclusion](#-conclusion)  
- [👨‍💻 Author](#-author)
- [📬 Contact](#-contact)  

---

## 📌 Project Overview

This project leverages **Machine Learning** to predict student performance and generate customized study strategies.

It helps students:
- Identify weak subjects
- Predict future scores
- Get a personalized study plan based on their performance

---

## 🧠 AI Component

The project uses a trained ML model that:
- Learns from historical student data
- Predicts future academic performance
- Helps in decision-making for study planning

---
## 🏗️ Project Structure
```
ai-powered-personalized-study-planner/
│
├── client/
|   └──index.html
|   └──script.js
|   └──style.css
├── notebook/
│   └── study_plan_model_training.ipynb
├── scripts/
│   ├── app.py
│   └── subject_encoder.pkl
|   └── model.pkl
|   └──feature_cols.pkl
├── images/
|   └──correlation_analysis.png
|   └──feature_importances.png
|   └──model_evaluation.png
├── data/
│   └── students_dataset.csv
└── README.md

```
---

## ⚙️ How It Works (Pipeline)

### 1. Data Processing
- Load dataset
- Clean missing values
- Encode categorical features

### 2. Model Training
- Train ML model on student performance data
- Evaluate accuracy
- Save model using `pickle`

### 3. Prediction System
- Flask app loads trained model
- Takes user input (marks, subjects, etc.)
- Predicts performance
- Generates study recommendations

---

## 🚀 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/Bidhan-007/ai-powered-personalized-study-planner.git

cd ai-powered-personalized-study-planner


## 📊 Technologies Used
- Python 🐍  
- Scikit-learn 🤖  
- Pandas & NumPy 📊  
- Flask 🌐  
- Pickle 📦  

---

## 🔥 Key Features
- ✅ Machine Learning-based predictions  
- ✅ Personalized study planning  
- ✅ Clean and structured pipeline  
- ✅ Real-world dataset usage  
- ✅ End-to-end ML project  

---

## 📌 Future Improvements
- 🚀 Add deep learning models  
- 🚀 Improve recommendation logic  
- 🚀 Add user authentication  
- 🚀 Deploy on cloud (AWS / Render)  

---

## 🎯 Conclusion

- 📊 Demonstrates a complete end-to-end Machine Learning pipeline.  
- 🧠 Covers data preprocessing, model training, and prediction.  
- 🌐 Integrates a Flask-based web application for real-world usage.  
- 🎯 Provides personalized study plans based on predicted performance.  
- 🚀 Showcases practical implementation of AI in education domain.  

---

## 👨‍💻 Developer

**Bidhan Yadav**

---

## 📬 Contact

- 📧 Email: ybidhan121@gmail.com  
- 🔗 GitHub: https://github.com/Bidhan-007 
- 💼 LinkedIn: https://www.linkedin.com/in/bidhan-ydv-17bb09354/  
- 🏆 LeetCode: https://leetcode.com/u/Bidhan-007/


