import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn import metrics
import joblib
import os

def cleanData(data):
    # Map Gender: Male -> 1, Female -> 2
    if 'Gender' in data.columns:
        data['Gender'] = data['Gender'].map({'Male': 1, 'Female': 2})
    # Map Dyslexia: No -> 0, Yes -> 1
    if 'Dyslexia' in data.columns:
        data['Dyslexia'] = data['Dyslexia'].map({'No': 0, 'Yes': 1})
    
    # Ensure all other columns are numeric
    for col in data.columns:
        if col not in ['Gender', 'Dyslexia']:
            data[col] = pd.to_numeric(data[col], errors='coerce')
            
    # Recalculate all Accuracy and Missrate columns to fix dataset scaling bugs
    for i in range(1, 33):
        clicks_col = f'Clicks{i}'
        hits_col = f'Hits{i}'
        misses_col = f'Misses{i}'
        acc_col = f'Accuracy{i}'
        missrate_col = f'Missrate{i}'
        
        if clicks_col in data.columns and hits_col in data.columns:
            data[acc_col] = np.where(data[clicks_col] > 0, data[hits_col] / data[clicks_col], 0.0)
        if clicks_col in data.columns and misses_col in data.columns:
            data[missrate_col] = np.where(data[clicks_col] > 0, data[misses_col] / data[clicks_col], 0.0)

# Resolve paths relative to this script's directory
base_dir = os.path.dirname(__file__)
desktop_path = os.path.join(base_dir, 'Dyt-desktop.csv')
tablet_path = os.path.join(base_dir, 'Dyt-tablet.csv')

# Read datasets directly
desktopData = pd.read_csv(desktop_path, sep=';', na_values=['NULL', '', '(NA)'])
tabletData = pd.read_csv(tablet_path, sep=';', na_values=['NULL', '', '(NA)'])

cleanData(desktopData)
cleanData(tabletData)

# Handle missing values in tablet data using column averages
for col in tabletData.columns:
    if tabletData[col].isnull().any():
        mean_val = tabletData[col].mean()
        if not pd.isna(mean_val):
            tabletData[col] = tabletData[col].fillna(round(mean_val, 4))

# Drop remaining missing columns
cols_with_missing = [col for col in tabletData.columns if tabletData[col].isnull().any()]
reduced_desktopData = desktopData.drop(columns=cols_with_missing, errors='ignore')
reduced_tabletData = tabletData.drop(columns=cols_with_missing, errors='ignore')

# Define columns to keep
commonalityColumns = ['Gender', 'Age', 'Dyslexia']
for i in range(30):
    if 0 <= i < 28:
        commonalityColumns.extend([
            f'Clicks{i+1}', f'Hits{i+1}', f'Misses{i+1}',
            f'Score{i+1}', f'Accuracy{i+1}', f'Missrate{i+1}'
        ])

# Filter columns
df_desktop = reduced_desktopData.loc[:, commonalityColumns].copy()
df_tablet = reduced_tabletData.loc[:, commonalityColumns].copy()

# Calculate averages and add them as new features
for metric in ['Clicks', 'Hits', 'Misses', 'Score', 'Accuracy', 'Missrate']:
    avg_col_name = f'Avg_{metric}'
    metric_cols = [col for col in df_desktop.columns if metric in col]
    df_desktop[avg_col_name] = df_desktop[metric_cols].mean(axis=1)
    df_tablet[avg_col_name] = df_tablet[metric_cols].mean(axis=1)

# Select the new features
new_features = ['Gender', 'Age', 'Avg_Clicks', 'Avg_Hits', 'Avg_Misses', 'Avg_Score', 'Avg_Accuracy', 'Avg_Missrate', 'Dyslexia']
df_desktop = df_desktop[new_features]
df_tablet = df_tablet[new_features]

# Split the data into features and target
y = df_desktop['Dyslexia']
X = df_desktop.drop('Dyslexia', axis=1)

# Split into train and test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Oversample minority class to address imbalance
X_train_pos = X_train[y_train == 1]
X_train_neg = X_train[y_train == 0]
X_train_pos_over = X_train_pos.sample(len(X_train_neg), replace=True, random_state=42)
X_train_over = pd.concat([X_train_neg, X_train_pos_over], axis=0)

y_train_pos = y_train[y_train == 1]
y_train_neg = y_train[y_train == 0]
y_train_pos_over = y_train_pos.sample(len(y_train_neg), replace=True, random_state=42)
y_train_over = pd.concat([y_train_neg, y_train_pos_over], axis=0)

# Train the RandomForestClassifier
rfc = RandomForestClassifier(random_state=42)
rfc.fit(X_train_over, y_train_over)

# Evaluate
y_pred = rfc.predict(X_test)
print("Accuracy on desktop test data:", metrics.accuracy_score(y_test, y_pred))

# Prepare the tablet data for prediction
yTest = df_tablet['Dyslexia']
XTest = df_tablet.drop('Dyslexia', axis=1)
y_pred_tablet = rfc.predict(XTest)
print("Accuracy on tablet data:", metrics.accuracy_score(yTest, y_pred_tablet))

# Save the model
model_save_path = os.path.join(base_dir, 'best_rfc.joblib')
joblib.dump(rfc, model_save_path)
print(f"Model saved to {model_save_path}")
