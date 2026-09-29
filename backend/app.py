from flask import Flask, request, jsonify
import joblib
import pandas as pd
import os

# Configure Flask to serve the React frontend build folder
frontend_dist = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
app = Flask(__name__, static_folder=frontend_dist, static_url_path='')

# Load the trained model
model_path = os.path.join(os.path.dirname(__file__), 'best_rfc.joblib')
model = joblib.load(model_path)

@app.route('/')
def home():
    """
    Serve the React frontend home page.
    """
    if not os.path.exists(os.path.join(frontend_dist, 'index.html')):
        return "React frontend is not built. Please run 'npm run build' inside the 'frontend' directory.", 500
    return app.send_static_file('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """
    Handle form submission, process input data, and return the prediction.
    """
    if request.method == 'POST':
        try:
            # Handle both JSON payloads and URL-encoded/Multipart form data
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form.to_dict()
                
            df = pd.DataFrame([data])
            
            # Reorder columns to match the exact feature order the model was trained on
            expected_features = [
                'Gender', 'Age',
                'Avg_Clicks', 'Avg_Hits', 'Avg_Misses', 
                'Avg_Score', 'Avg_Accuracy', 'Avg_Missrate'
              ]
            df = df[expected_features]
            df = df.astype(float)
            
            # Get probability scores
            probabilities = model.predict_proba(df)[0]
            
            # Clinical safety override: If the child made clicks and has more misses than hits, 
            # or if their accuracy is below 50% (indicating severe letter/visual confusion),
            # classify them as high risk ("Dyslexic") to prioritize screening sensitivity.
            avg_clicks = float(data.get('Avg_Clicks', 0))
            avg_misses = float(data.get('Avg_Misses', 0))
            avg_hits = float(data.get('Avg_Hits', 0))
            avg_accuracy = float(data.get('Avg_Accuracy', 1.0))
            
            if avg_clicks > 0 and (avg_misses > avg_hits or avg_accuracy < 0.5):
                result = "Dyslexic"
            else:
                # Since the dataset is highly imbalanced, using a standard 0.5 threshold causes 
                # the model to almost never predict Dyslexia. We use an optimized threshold 
                # of 0.25 to detect dyslexic children correctly (maximizing screening sensitivity).
                result = "Dyslexic" if probabilities[1] >= 0.25 else "Not Dyslexic"
            
            return jsonify({'prediction': result})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)
