from flask import Flask, render_template, request, jsonify
import csv
import os

app = Flask(__name__)

CSV_FILE = "locations.csv"

# Ensure CSV file exists with headers
if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, "w", newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["latitude", "longitude"])  # Headers

# Route to save a new marker
@app.route('/save_location', methods=['POST'])
def save_location():
    data = request.json
    lat, lon = data["latitude"], data["longitude"]

    # Read the existing locations to check for duplicates
    existing_locations = []
    with open(CSV_FILE, "r") as file:
        reader = csv.DictReader(file)
        for row in reader:
            existing_locations.append({
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"])
            })
    
    # Check if the location already exists
    if {"latitude": lat, "longitude": lon} not in existing_locations:
        # Save the location if not a duplicate
        with open(CSV_FILE, "a", newline='') as file:
            writer = csv.writer(file)
            writer.writerow([lat, lon])
        return jsonify({"message": "Location saved"}), 200
    else:
        return jsonify({"message": "Location already exists"}), 400

# Route to get saved markers
@app.route('/get_locations', methods=['GET'])
def get_locations():
    locations = []
    with open(CSV_FILE, "r") as file:
        reader = csv.DictReader(file)
        for row in reader:
            locations.append({
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"])
            })
    
    return jsonify(locations)

# Route to remove a specific location
@app.route('/remove_location', methods=['POST'])
def remove_location():
    data = request.json
    lat, lon = data["latitude"], data["longitude"]

    # Read the existing locations
    locations = []
    with open(CSV_FILE, "r") as file:
        reader = csv.DictReader(file)
        for row in reader:
            locations.append({
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"])
            })

    # Remove the location if it exists
    new_locations = [loc for loc in locations if not (loc["latitude"] == lat and loc["longitude"] == lon)]

    if len(new_locations) == len(locations):
        return jsonify({"message": "Location not found"}), 404

    # Write the updated locations back to the CSV file
    with open(CSV_FILE, "w", newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["latitude", "longitude"])  # Write headers
        for loc in new_locations:
            writer.writerow([loc["latitude"], loc["longitude"]])

    return jsonify({"message": "Location removed"}), 200

# Route to clear all saved locations
@app.route('/clear_all', methods=['POST'])
def clear_all():
    # Clear all locations from the CSV file
    with open(CSV_FILE, "w", newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["latitude", "longitude"])  # Keep headers, remove all data

    return jsonify({"message": "All locations cleared"}), 200

# Home route to render the HTML page
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
