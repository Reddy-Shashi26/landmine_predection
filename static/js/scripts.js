// Initialize the left map (Normal view using OpenStreetMap)
const mapLeft = L.map('mapLeft', {
    center: [17.48342, 78.51730],
    zoom: 18,
    zoomControl: true
});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mapLeft);

// Initialize the right map (Satellite view using ESRI)
const mapRight = L.map('mapRight', {
    center: [17.48342, 78.51730],
    zoom: 18,
    zoomControl: false
});
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.esri.com/">ESRI</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
}).addTo(mapRight);

// Synchronize the movement and zoom between the two maps
mapLeft.on('moveend', () => {
    const center = mapLeft.getCenter();
    const zoom = mapLeft.getZoom();
    mapRight.setView(center, zoom);
});
mapRight.on('moveend', () => {
    const center = mapRight.getCenter();
    const zoom = mapRight.getZoom();
    mapLeft.setView(center, zoom);
});

// Arrays to hold locations, markers, and their indices
let locations = [];
let markers = [];
let markerBounds = L.latLngBounds(); // Track bounds of all markers

// Fetch saved locations from the server when the page loads
fetch('/get_locations')
    .then(response => response.json())
    .then(data => {
        // Add previously saved locations to both maps
        data.forEach((loc, index) => addMarker(loc.latitude, loc.longitude, index));
    })
    .catch(error => console.error("Error fetching locations:", error));

// Function to add a marker to both maps and update the location list
function addMarker(lat, lng, index) {
    // Add markers to both maps
    const markerLeft = L.marker([lat, lng]).addTo(mapLeft);
    const markerRight = L.marker([lat, lng]).addTo(mapRight);

    // Bind tooltips to the markers
    const tooltipContent = `Marked Lat: ${lat.toFixed(5)}, Long: ${lng.toFixed(5)}`;
    markerLeft.bindTooltip(tooltipContent, { permanent: false, opacity: 0.7 }).openTooltip();
    markerRight.bindTooltip(tooltipContent, { permanent: false, opacity: 0.7 }).openTooltip();

    // Store markers with their index for later removal
    markers.push({ markerLeft, markerRight, index });

    // Save location and update the table
    locations.push({ lat, lng, index });
    updateLocationTable();

    // Update bounds to include this marker
    markerBounds.extend([lat, lng]);

    // Save the location to the server (CSV file)
    fetch('/save_location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng })
    })
    .then(response => response.json())
    .then(data => console.log(data.message))
    .catch(error => console.error("Error saving location:", error));

    // Auto zoom to fit all markers after adding a new one
    mapLeft.fitBounds(markerBounds);
    mapRight.fitBounds(markerBounds);
}

// Function to update the locations table
function updateLocationTable() {
    const tableBody = document.querySelector('#locationTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    locations.forEach((location, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${location.lat.toFixed(5)}</td>
            <td>${location.lng.toFixed(5)}</td>
            <td><button onclick="removeLocation(${location.index})" class="btn">Remove</button></td>
        `;
        tableBody.appendChild(row);
    });
}

// Function to remove a location by index
function removeLocation(index) {
    // Find the marker object by index
    const markerToRemove = markers.find(marker => marker.index === index);

    if (markerToRemove) {
        // Remove the location from the array
        locations = locations.filter(location => location.index !== index);

        // Remove the corresponding markers from both maps
        mapLeft.removeLayer(markerToRemove.markerLeft);
        mapRight.removeLayer(markerToRemove.markerRight);

        // Remove marker references from markers array
        markers = markers.filter(marker => marker.index !== index);

        // Update the table
        updateLocationTable();

        // Send the removal request to the backend
        fetch('/remove_location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: markerToRemove.markerLeft.getLatLng().lat, longitude: markerToRemove.markerLeft.getLatLng().lng })
        })
        .then(response => response.json())
        .then(data => console.log(data.message))
        .catch(error => console.error("Error removing location:", error));

        // Recalculate bounds for all remaining markers after removal
        markerBounds = L.latLngBounds();
        markers.forEach(marker => markerBounds.extend(marker.markerLeft.getLatLng()));

        // Adjust map view to fit the remaining markers
        mapLeft.fitBounds(markerBounds);
        mapRight.fitBounds(markerBounds);
    }
}

// Clear all markers and reset the locations list
document.getElementById('clearBtn').addEventListener('click', () => {
    // Clear arrays and table
    locations = [];
    updateLocationTable();

    // Remove all markers from both maps
    markers.forEach(marker => {
        mapLeft.removeLayer(marker.markerLeft);
        mapRight.removeLayer(marker.markerRight);
    });

    // Reset markers array and bounds
    markers = [];
    markerBounds = L.latLngBounds();

    // Send clear request to backend
    fetch('/clear_all', { method: 'POST' })
        .then(response => response.json())
        .then(data => console.log(data.message))
        .catch(error => console.error("Error clearing locations:", error));
});

// Handle zoom slider changes to update both maps
const zoomSlider = document.getElementById('zoomSlider');
zoomSlider.addEventListener('input', () => {
    const zoomLevel = parseInt(zoomSlider.value, 10);
    mapLeft.setZoom(zoomLevel);
    mapRight.setZoom(zoomLevel);
});

// Mark location based on user input for latitude and longitude
document.getElementById('markBtn').addEventListener('click', () => {
    const latInput = parseFloat(document.getElementById('latitudeInput').value);
    const lngInput = parseFloat(document.getElementById('longitudeInput').value);

    if (!isNaN(latInput) && !isNaN(lngInput)) {
        const newIndex = locations.length ? locations[locations.length - 1].index + 1 : 0;
        // Add the marker to the maps
        addMarker(latInput, lngInput, newIndex);

        // Clear the input fields
        document.getElementById('latitudeInput').value = '';
        document.getElementById('longitudeInput').value = '';
    } else {
        alert("Please enter valid latitude and longitude values.");
    }
});

// Add marker on click on the left map
mapLeft.on('click', (e) => {
    const { lat, lng } = e.latlng;
    const newIndex = locations.length ? locations[locations.length - 1].index + 1 : 0;
    addMarker(lat, lng, newIndex);
});
