// ===== Enhanced Search Results Page with AI Face Search & Google Maps =====

// Global map variable
let map;
let marker;
let currentLocationCoords = null;

// ===== GPS LOCATION CAPTURE FOR FACE MATCHING =====
// This stores the user's GPS location that was captured via the browser's Geolocation API
// When user uploads a photo, browser immediately requests their GPS coordinates
// The location is stored here and then sent to backend with the face search request
let capturedLocation = null;  // Format: { latitude: 19.076098, longitude: 72.877690, accuracy: 105 }

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Search Results Page Loaded - AI Face Search with Google Maps');
    initFaceSearch();
    initCurrentLocationCapture();
    // Note: initMap() will be called by Google Maps API callback
});

// ===== Google Maps Integration =====
function initMap() {
    console.log('🗺️ Initializing Google Maps');
    
    // Default location (Mumbai, India)
    const defaultLocation = { lat: 19.0760, lng: 72.8777 };
    
    // Create map
    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultLocation,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
    });
    
    // Add marker
    marker = new google.maps.Marker({
        position: defaultLocation,
        map: map,
        title: 'Current Location',
        draggable: true,
        animation: google.maps.Animation.DROP
    });
    
    // Update coordinates when marker is dragged
    marker.addListener('dragend', function(event) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        updateLocationInput(lat, lng);
    });
    
    // Add click event to map
    map.addListener('click', function(event) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        updateMapMarker(lat, lng);
    });
    
    console.log('✅ Google Maps initialized');
}

function updateMapMarker(lat, lng) {
    const position = { lat: lat, lng: lng };
    
    // Update marker position
    marker.setPosition(position);
    map.panTo(position);
    
    // Update input field
    updateLocationInput(lat, lng);
    
    // Bounce animation
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 2000);
}

function updateLocationInput(lat, lng) {
    const locationInput = document.getElementById('current-location-input');
    if (locationInput) {
        locationInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    currentLocationCoords = { lat, lng };
    console.log('📍 Location updated:', currentLocationCoords);
}

// ===== Current Location Capture =====
function initCurrentLocationCapture() {
    const getLocationBtn = document.getElementById('get-current-location-btn');
    const locationInput = document.getElementById('current-location-input');
    
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    // Allow manual entry and update map
    if (locationInput) {
        locationInput.addEventListener('change', function() {
            const coords = parseCoordinates(this.value);
            if (coords) {
                updateMapMarker(coords.lat, coords.lng);
            }
        });
    }
}

function getCurrentLocation() {
    console.log('📡 Getting current GPS location');
    
    const statusDiv = document.getElementById('current-location-status');
    
    if (!navigator.geolocation) {
        if (statusDiv) {
            statusDiv.innerHTML = '<p style=\"color: #ef4444; padding: 10px; background: #fee; border-radius: 5px;\">❌ Geolocation not supported</p>';
        }
        alert('❌ Geolocation is not supported by your browser');
        return;
    }
    
    if (statusDiv) {
        statusDiv.innerHTML = '<p style=\"color: #3b82f6; padding: 10px; background: #eff6ff; border-radius: 5px;\">🔍 Getting your GPS location...</p>';
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            console.log('✅ GPS Location obtained:', { lat, lng, accuracy: accuracy + 'm' });
            
            // Update map
            updateMapMarker(lat, lng);
            
            // Show success
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <p style=\"color: #059669; padding: 10px; background: #d1fae5; border-radius: 5px;\">
                        ✅ GPS Location obtained successfully!
                        <br><small>Accuracy: ±${Math.round(accuracy)}m</small>
                    </p>
                `;
            }
            
            alert(`✅ GPS Location captured!\\n\\nCoordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}\\nAccuracy: ±${Math.round(accuracy)}m`);
        },
        function(error) {
            console.error('❌ Geolocation error:', error);
            
            let errorMsg = 'Unable to get location';
            if (error.code === 1) errorMsg = 'Location permission denied';
            else if (error.code === 2) errorMsg = 'Location unavailable';
            else if (error.code === 3) errorMsg = 'Location request timeout';
            
            if (statusDiv) {
                statusDiv.innerHTML = `<p style=\"color: #dc2626; padding: 10px; background: #fee2e2; border-radius: 5px;\">❌ ${errorMsg}</p>`;
            }
            
            alert('❌ ' + errorMsg + '\\n\\nYou can:\\n1. Enable location services\\n2. Enter coordinates manually\\n3. Click on the map to set location');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function parseCoordinates(value) {
    const coords = value.split(',').map(c => parseFloat(c.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        return { lat: coords[0], lng: coords[1] };
    }
    return null;
}

// ===== AI Face Search =====
function initFaceSearch() {
    console.log('🤖 Initializing AI Face Search with DeepFace FaceNet512');
    
    const uploadArea = document.querySelector('.upload-area');
    const uploadInput = document.getElementById('search-photo-upload');
    const previewContainer = document.getElementById('search-photo-preview');
    const runMatchBtn = document.getElementById('run-face-match-btn');
    
    if (!uploadArea || !uploadInput) {
        console.error('❌ Face search elements not found');
        return;
    }
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        uploadInput.click();
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#2563eb';
        uploadArea.style.backgroundColor = '#eff6ff';
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = '#ffffff';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = '#ffffff';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadInput.files = files;
            handlePhotoUpload(files[0]);
        }
    });
    
    // File input change
    uploadInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePhotoUpload(e.target.files[0]);
        }
    });
    
    // Run AI Face Match button
    if (runMatchBtn) {
        runMatchBtn.addEventListener('click', runAIFaceMatch);
    }
}

function handlePhotoUpload(file) {
    console.log('📸 Photo uploaded:', file.name);
    
    // === QUICK VALIDATION ===
    // Validate file type - must be an image (jpg, png, etc)
    if (!file.type.startsWith('image/')) {
        showNotification('Please upload an image file', 'error');
        return;
    }
    
    // Validate file size - max 5MB to keep files small
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size must be less than 5MB', 'error');
        return;
    }
    
    // === SHOW PHOTO PREVIEW ===
    // Hide the "Click to upload" area and show the photo preview instead
    const uploadArea = document.querySelector('.upload-area');
    const previewContainer = document.getElementById('search-photo-preview');
    const previewImage = document.getElementById('preview-image');
    
    if (uploadArea) uploadArea.style.display = 'none';
    
    // Use FileReader API to convert the image file to a data URL that can be displayed
    const reader = new FileReader();
    
    reader.onload = (e) => {
        // Display the photo preview
        if (previewImage) {
            previewImage.src = e.target.result;
            previewImage.style.maxWidth = '100%';
            previewImage.style.maxHeight = '400px';
            previewImage.style.borderRadius = '8px';
            previewImage.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }
        
        // Show the preview container which includes the photo and the Run button
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }
        
        showNotification('Photo uploaded successfully', 'success');
        console.log('✅ Photo preview displayed');
        
        // ===== AUTO-REQUEST GPS LOCATION =====
        // IMPORTANT: As soon as the photo is shown, automatically request the user's location
        // This happens before the user clicks "Run AI Face Match" button
        // The browser will show a popup asking "Allow this site to access your location?"
        // User must grant permission for the face search to work
        console.log('📍 Initiating GPS location capture for face matching');
        setTimeout(() => {
            requestGPSLocation();  // This triggers the geolocation request
        }, 500);  // Wait 500ms for the UI to render before showing the location popup
    };
    
    // Convert the image file to a data URL
    reader.readAsDataURL(file);
}

function removeSearchPhoto() {
    const uploadArea = document.querySelector('.upload-area');
    const previewContainer = document.getElementById('search-photo-preview');
    const uploadInput = document.getElementById('search-photo-upload');
    const previewImage = document.getElementById('preview-image');
    const locationStatus = document.getElementById('location-status');
    const runBtn = document.getElementById('run-face-match-btn');
    
    // Reset everything
    if (uploadInput) uploadInput.value = '';
    if (previewImage) previewImage.src = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
    if (locationStatus) locationStatus.style.display = 'none';
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.style.opacity = '0.5';
        runBtn.style.cursor = 'not-allowed';
        runBtn.textContent = '🔍 Run AI Face Match (Awaiting Location)';
    }
    
    capturedLocation = null;
    console.log('🗑️ Photo removed, location reset');
}

function requestGPSLocation() {
    // ===== REQUEST USER'S GPS LOCATION =====
    // This function uses the Browser Geolocation API to ask the user for their location
    // The browser will show a permission popup asking: "Allow site to access your location?"
    
    // Get all the UI elements we'll update with the location status
    const locationStatus = document.getElementById('location-status');
    const spinner = document.getElementById('location-spinner');
    const checkIcon = document.getElementById('location-check');
    const errorIcon = document.getElementById('location-error');
    const locationText = document.getElementById('location-text');
    const locationCoords = document.getElementById('location-coords');
    const latDisplay = document.getElementById('latitude-display');
    const lngDisplay = document.getElementById('longitude-display');
    const runBtn = document.getElementById('run-face-match-btn');
    
    // Show the location status section (spinner, message, etc)
    if (locationStatus) {
        locationStatus.style.display = 'block';
    }
    
    // Show spinner icon while we wait for the browser to get GPS location
    if (spinner) spinner.style.display = 'inline';
    if (checkIcon) checkIcon.style.display = 'none';
    if (errorIcon) errorIcon.style.display = 'none';
    
    // CHECK: Does this browser support geolocation?
    // Older browsers don't have the Geolocation API, so we need to check first
    if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported');
        if (errorIcon) errorIcon.style.display = 'inline';
        if (spinner) spinner.style.display = 'none';
        if (locationText) locationText.textContent = '❌ Geolocation not supported by browser';
        if (locationText) locationText.style.color = '#dc2626';
        return;
    }
    
    console.log('📍 Requesting user GPS location...');
    
    // REQUEST GPS LOCATION from the browser's Geolocation API
    // navigator.geolocation.getCurrentPosition() has 3 parts:
    // 1. successCallback - runs if user grants permission and location is obtained
    // 2. errorCallback - runs if user denies permission or location can't be found
    // 3. options - settings for accuracy, timeout, etc
    
    navigator.geolocation.getCurrentPosition(
        // ===== SUCCESS CALLBACK =====
        // This runs if the browser successfully gets the user's location
        function(position) {
            // Extract the three important values from position.coords:
            // LATITUDE  - North-South position (range: -90 to 90 degrees)
            // LONGITUDE - East-West position (range: -180 to 180 degrees)
            // ACCURACY  - How accurate the location is (in meters)
            
            const latitude = position.coords.latitude;      // Example: 19.076098 (North of Equator)
            const longitude = position.coords.longitude;    // Example: 72.877690 (East of Prime Meridian)
            const accuracy = position.coords.accuracy;      // Example: 105 (accurate within 105 meters)
            
            // Store the location in our global variable so we can send it with the face search
            capturedLocation = { latitude, longitude, accuracy };
            console.log('✅ GPS location captured:', capturedLocation);
            
            // Update UI: Hide spinner, show green checkmark
            if (spinner) spinner.style.display = 'none';
            if (checkIcon) checkIcon.style.display = 'inline';
            if (errorIcon) errorIcon.style.display = 'none';
            
            // Update status message with accuracy information
            // Math.round(105.234) = 105, so user sees "105m" instead of "105.234m"
            if (locationText) {
                locationText.textContent = '✅ Location captured with ' + Math.round(accuracy) + 'm accuracy';
                locationText.style.color = '#059669';
            }
            
            // Display latitude and longitude to the user
            // toFixed(6) formats the number to 6 decimal places (precision of ~1 meter)
            if (latDisplay) latDisplay.textContent = latitude.toFixed(6);
            if (lngDisplay) lngDisplay.textContent = longitude.toFixed(6);
            if (locationCoords) locationCoords.style.display = 'block';
            
            // Enable the "Run AI Face Match" button now that we have location
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.style.opacity = '1';
                runBtn.style.cursor = 'pointer';
                runBtn.textContent = '🔍 Run AI Face Match';
            }
        },
        
        // ===== ERROR CALLBACK =====
        // This runs if user denies location permission or if browser can't find location
        function(error) {
            console.error('❌ Geolocation error:', error);
            
            // Provide helpful error message based on error code
            let errorMsg = 'Unable to get location';
            if (error.code === 1) errorMsg = 'Location permission denied';      // User clicked "Deny"
            else if (error.code === 2) errorMsg = 'Location unavailable';       // GPS/Wi-Fi not available
            else if (error.code === 3) errorMsg = 'Location request timeout';   // Took too long (>10 sec)
            
            // Update UI: Hide spinner, show red error icon
            if (spinner) spinner.style.display = 'none';
            if (checkIcon) checkIcon.style.display = 'none';
            if (errorIcon) errorIcon.style.display = 'inline';
            if (locationText) {
                locationText.textContent = '❌ ' + errorMsg;
                locationText.style.color = '#dc2626';
            }
            
            // Keep button disabled since we don't have location
            if (runBtn) {
                runBtn.disabled = true;
                runBtn.style.opacity = '0.5';
                runBtn.style.cursor = 'not-allowed';
            }
        },
        
        // ===== OPTIONS =====
        // Settings that control how the browser gets the location
        {
            enableHighAccuracy: true,  // Try to get accurate location (slower, drains battery more)
            timeout: 10000,            // Wait max 10 seconds for location, then give up
            maximumAge: 0              // Get fresh location each time, don't use cached location
        }
    );
}

function runAIFaceMatch() {
    console.log('🔍 AI FACE SEARCH INITIATED - DeepFace FaceNet512');
    
    const uploadInput = document.getElementById('search-photo-upload');
    const progressDiv = document.getElementById('matching-progress');
    
    // Check that user has uploaded a photo
    if (!uploadInput || !uploadInput.files || uploadInput.files.length === 0) {
        showNotification('Please upload a photo first', 'error');
        return;
    }
    
    // ===== MANDATORY GPS LOCATION CHECK =====
    // We check if GPS location was successfully captured earlier
    // The button is disabled until location is obtained, but we double-check here too
    // - capturedLocation must be an object (not null)
    // - capturedLocation.latitude must exist (number like 19.076098)
    // - capturedLocation.longitude must exist (number like 72.877690)
    if (!capturedLocation || !capturedLocation.latitude || !capturedLocation.longitude) {
        showNotification('Please allow location access first', 'error');
        return;
    }
    
    // Show the "Analyzing face..." progress animation while we wait for results
    if (progressDiv) {
        progressDiv.style.display = 'block';
        progressDiv.innerHTML = `
            <div class="progress-content">
                <div class="spinner"></div>
                <p>🤖 DeepFace FaceNet512 analyzing face...</p>
                <p style="font-size: 12px; color: #6b7280;">Extracting 512-D embeddings</p>
            </div>
        `;
    }
    
    // ===== SEND TO BACKEND WITH GPS LOCATION =====
    // We send to the backend:
    // 1. The photo file for face matching
    // 2. The latitude/longitude captured from the browser's GPS
    // The backend will include GPS coordinates in the email alert sent to relatives
    performFaceSearch(
        uploadInput.files[0],           // The photo user uploaded
        progressDiv,                     // UI element for progress animation
        capturedLocation.latitude,       // User's latitude (e.g., 19.076098)
        capturedLocation.longitude       // User's longitude (e.g., 72.877690)
    );
}

function requestGeolocationAndSearch(photoFile, progressDiv) {
    console.log('📍 Requesting geolocation for search...');
    
    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                // Location obtained - send with search
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                console.log('✅ Geolocation obtained:', { latitude, longitude });
                performFaceSearch(photoFile, progressDiv, latitude, longitude);
            },
            function(error) {
                // Location denied or error - continue without it
                console.warn('⚠️ Geolocation error:', error.message);
                performFaceSearch(photoFile, progressDiv, null, null);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        // Geolocation not supported - continue without it
        console.warn('⚠️ Geolocation not supported');
        performFaceSearch(photoFile, progressDiv, null, null);
    }
}

function performFaceSearch(photoFile, progressDiv, latitude, longitude) {
    // Use current location from map if available
    if (!latitude && !longitude && currentLocationCoords) {
        latitude = currentLocationCoords.lat;
        longitude = currentLocationCoords.lng;
        console.log('📍 Using current location from map:', { latitude, longitude });
    }
    
    // Prepare form data
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    // Add geolocation if available
    if (latitude && longitude) {
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
        console.log('📍 Including geolocation in search request');
    }
    
    console.log('📤 Sending photo to /api/face-search endpoint');
    
    // Call API
    fetch('/api/face-search', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || 'Face search failed');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Face search response:', data);
        console.log('📊 Full response data:', JSON.stringify(data, null, 2));
        
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
        
        if (data.success) {
            if (data.results && data.results.length > 0) {
                displaySearchResults(data.results, 'AI Face Match Results');
                
                // Check data source
                const dataSource = data.results[0]?.data_source;
                if (dataSource === 'database_missing_persons') {
                    console.log('✅ Searching against actual missing persons database');
                }
                
                // Check if alert was sent
                if (data.alert_sent) {
                    const locationMsg = data.location_received ? 
                        ' Exact location shared with relatives!' : 
                        ' Alert sent to relatives!';
                    
                    if (data.location_received) {
                        showNotification(`🎯 ${data.results.length} matches found - Email notification sent with GPS location!`, 'success');
                    } else {
                        showNotification(`✅ ${data.results.length} matches found - Email notification sent!`, 'success');
                    }
                    
                    // Show location confirmation modal
                    if (data.location_received) {
                        showLocationConfirmationModal(data.results[0]);
                    }
                } else {
                    showNotification(`Found ${data.results.length} potential matches`, 'success');
                }
            } else {
                showNoResults('No face matches found');
                showNotification('No matches found in database', 'info');
            }
        } else {
            const errorMsg = data.message || data.error || 'Face search failed';
            showNotification('❌ ' + errorMsg, 'error');
            console.error('❌ Error details:', data);
        }
    })
    .catch(error => {
        console.error('❌ Face search error:', error);
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
        showNotification('Error performing face search', 'error');
    });
}

function showLocationConfirmationModal(matchedPerson) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 500px;
        text-align: center;
    `;
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 10px;"></i>
            <h2 style="margin: 0; font-size: 24px;">Location Shared Successfully!</h2>
        </div>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Your exact GPS location has been sent to the relatives of<br>
            <strong style="color: #059669; font-size: 18px;">${matchedPerson.name}</strong>
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
            📧 Email sent with Google Maps link
        </p>
        <button onclick="this.parentElement.remove(); document.getElementById('modal-backdrop').remove();" 
                style="margin-top: 20px; padding: 12px 30px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600;">
            Got it!
        </button>
    `;
    
    const backdrop = document.createElement('div');
    backdrop.id = 'modal-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
}

// ===== Text Search =====
function initTextSearch() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performTextSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performTextSearch();
            }
        });
    }
}

function performTextSearch() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const genderFilter = document.getElementById('gender-filter');
    const timeFilter = document.getElementById('time-filter');
    
    const query = searchInput ? searchInput.value.trim() : '';
    const category = categoryFilter ? categoryFilter.value : '';
    const gender = genderFilter ? genderFilter.value : '';
    const time = timeFilter ? timeFilter.value : '';
    
    console.log('🔍 Text search:', { query, category, gender, time });
    
    showLoadingState();
    
    // Call API
    fetch('/api/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: query,
            category: category,
            gender: gender,
            time: time
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.results && data.results.length > 0) {
            displaySearchResults(data.results, 'Text Search Results');
        } else {
            showNoResults('No matching results found');
        }
    })
    .catch(error => {
        console.error('Text search error:', error);
        showNoResults('Search error occurred');
    });
}

// ===== Location Search =====
function initLocationSearch() {
    console.log('📍 Initializing Geolocation Search');
    
    const locationBtn = document.getElementById('use-my-location-btn');
    const searchBtn = document.getElementById('search-location-btn');
    
    if (locationBtn) {
        locationBtn.addEventListener('click', getMyLocation);
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchByLocation);
    }
}

function getMyLocation() {
    console.log('📡 Getting user location via Geolocation API');
    
    const statusDiv = document.getElementById('location-status');
    const locationInput = document.getElementById('location-input');
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by your browser';
        console.error('❌', errorMsg);
        if (statusDiv) {
            statusDiv.innerHTML = '<p style="color: #ef4444; padding: 10px; background: #fee; border-radius: 5px;">❌ Geolocation not supported by this browser</p>';
        }
        alert(errorMsg);
        return;
    }
    
    // Check if using HTTPS or localhost
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
        console.warn('⚠️ Geolocation may not work without HTTPS');
    }
    
    // Show loading status
    if (statusDiv) {
        statusDiv.innerHTML = `
            <div style="color: #3b82f6; padding: 10px; background: #eff6ff; border-radius: 5px; border-left: 4px solid #3b82f6;">
                <strong>🔍 Getting your location...</strong><br>
                <small>Please allow location access when prompted</small>
            </div>
        `;
    }
    
    // Request location with options
    const options = {
        enableHighAccuracy: true,  // Use GPS if available
        timeout: 10000,            // Wait up to 10 seconds
        maximumAge: 0              // Don't use cached location
    };
    
    console.log('Requesting location with options:', options);
    
    navigator.geolocation.getCurrentPosition(
        // Success callback
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            console.log('✅ Location obtained:', { lat, lng, accuracy: accuracy + 'm' });
            
            // Update input field
            if (locationInput) {
                locationInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
            
            // Show success message
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div style="color: #059669; padding: 10px; background: #d1fae5; border-radius: 5px; border-left: 4px solid #059669;">
                        <strong>✓ Location found successfully!</strong><br>
                        <small>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}</small><br>
                        <small>Accuracy: ±${Math.round(accuracy)}m</small><br>
                        <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" 
                           style="color: #059669; text-decoration: underline; font-size: 12px;">
                           📍 View on Google Maps
                        </a>
                    </div>
                `;
            }
            
            // Show notification
            alert('✅ Location obtained successfully!\n\nLat: ' + lat.toFixed(4) + '\nLng: ' + lng.toFixed(4));
        },
        // Error callback
        function(error) {
            console.error('❌ Geolocation error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            let errorMsg = 'Unable to get location';
            let helpText = '';
            
            switch(error.code) {
                case 1: // PERMISSION_DENIED
                    errorMsg = 'Location permission denied';
                    helpText = 'Please allow location access in your browser settings and try again.';
                    break;
                case 2: // POSITION_UNAVAILABLE
                    errorMsg = 'Location unavailable';
                    helpText = 'Unable to determine your location. Please check your device settings.';
                    break;
                case 3: // TIMEOUT
                    errorMsg = 'Location request timeout';
                    helpText = 'Request took too long. Please try again.';
                    break;
                default:
                    errorMsg = 'Unknown location error';
                    helpText = 'Please try again or enter location manually.';
            }
            
            // Show error message
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div style="color: #dc2626; padding: 10px; background: #fee2e2; border-radius: 5px; border-left: 4px solid #dc2626;">
                        <strong>❌ ${errorMsg}</strong><br>
                        <small>${helpText}</small><br><br>
                        <strong>Troubleshooting:</strong><br>
                        <small>1. Check browser location permissions</small><br>
                        <small>2. Enable location services on your device</small><br>
                        <small>3. Try using Chrome or Firefox</small><br>
                        <small>4. Or enter location manually below</small>
                    </div>
                `;
            }
            
            // Show alert
            alert('❌ ' + errorMsg + '\n\n' + helpText);
        },
        options
    );
}

function searchByLocation() {
    console.log('🗺️ Searching by location');
    
    const locationInput = document.getElementById('location-input');
    const radiusSelect = document.getElementById('search-radius');
    
    if (!locationInput || !locationInput.value.trim()) {
        alert('❌ Please enter location first!\n\nYou can:\n1. Click "Use My Location" button\n2. Or enter coordinates manually (e.g., 19.0760, 72.8777)');
        return;
    }
    
    const coords = locationInput.value.split(',').map(c => c.trim());
    if (coords.length !== 2) {
        showNotification('Invalid location format', 'error');
        return;
    }
    
    const lat = parseFloat(coords[0]);
    const lng = parseFloat(coords[1]);
    const radius = radiusSelect ? parseInt(radiusSelect.value) : 10;
    
    console.log('📍 Location search params:', { lat, lng, radius });
    
    showLoadingState();
    
    // Call API
    fetch('/api/location-search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            radius: radius
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.results && data.results.length > 0) {
            displaySearchResults(data.results, `Results within ${radius}km`);
            showNotification(`Found ${data.results.length} missing persons nearby`, 'success');
        } else {
            showNoResults(`No missing persons found within ${radius}km`);
            showNotification('No nearby results', 'info');
        }
    })
    .catch(error => {
        console.error('Location search error:', error);
        showNotification('Location search failed', 'error');
        showNoResults('Search error occurred');
    });
}

// ===== Display Results =====
function displaySearchResults(results, title) {
    console.log('📊 Displaying results:', results.length);
    
    const resultsSection = document.getElementById('search-results');
    const resultsGrid = document.getElementById('results-grid');
    const resultsCount = document.getElementById('results-count');
    const resultsTitle = document.querySelector('.results-header h3');
    
    if (!resultsGrid) {
        console.error('Results grid not found');
        return;
    }
    
    // Show results section
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
    
    // Update title
    if (resultsTitle) {
        resultsTitle.textContent = title || 'Search Results';
    }
    
    // Update count
    if (resultsCount) {
        resultsCount.textContent = results.length;
    }
    
    // Clear existing results
    resultsGrid.innerHTML = '';
    
    // Add each result
    results.forEach(result => {
        const card = createResultCard(result);
        resultsGrid.appendChild(card);
    });
}

function createResultCard(result) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.setAttribute('data-id', result.id || result.person_id);
    
    // Determine confidence badge
    let confidenceBadge = '';
    if (result.confidence !== undefined) {
        const confidence = Math.round(result.confidence);
        let badgeClass = 'low-match';
        if (confidence >= 80) badgeClass = 'high-match';
        else if (confidence >= 60) badgeClass = 'medium-match';
        
        confidenceBadge = `<div class="match-badge ${badgeClass}">${confidence}% Match</div>`;
    }
    
    // Exact match badge
    let exactMatchBadge = '';
    if (result.match_type === 'exact') {
        exactMatchBadge = '<div class="exact-match">🎯 Exact Match</div>';
    }
    
    // Image path - handle array or string
    let imagePath = '/static/images/default-person.jpg';
    if (result.photo_paths && Array.isArray(result.photo_paths) && result.photo_paths.length > 0) {
        imagePath = result.photo_paths[0].startsWith('/static') ? result.photo_paths[0] : `/static/${result.photo_paths[0]}`;
    } else if (result.photo_url) {
        imagePath = result.photo_url;
    }
    
    // Location with map link
    const locationHtml = result.last_seen_location ? 
        `<span>${result.last_seen_location}</span>
         <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.last_seen_location)}" 
            target="_blank" class="map-link" title="View on Google Maps">
            <i class="fas fa-external-link-alt"></i>
         </a>` : 'Location unknown';
    
    card.innerHTML = `
        <div class="result-image">
            <img src="${imagePath}" alt="${result.name}" onerror="this.src='/static/images/default-person.jpg'">
            ${confidenceBadge}
            ${exactMatchBadge}
        </div>
        <div class="result-info">
            <h3>${result.name}</h3>
            <div class="result-details">
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span>${result.age || 'N/A'} years, ${result.gender || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    ${locationHtml}
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${result.last_seen_date || result.missing_since || 'Date unknown'}</span>
                </div>
            </div>
            <div class="result-actions">
                <button class="btn btn-primary view-details" onclick="viewPersonDetails(${result.id || result.person_id})">
                    <i class="fas fa-info-circle"></i> View Details
                </button>
                <button class="btn btn-outline report-sighting">
                    <i class="fas fa-flag"></i> Report Sighting
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function viewPersonDetails(personId) {
    console.log('👁️ Viewing details for person ID:', personId);
    showNotification(`Loading details for person #${personId}`, 'info');
    // TODO: Implement modal or redirect to details page
}

// ===== Loading & Error States =====
function showLoadingState() {
    const resultsGrid = document.getElementById('results-grid');
    if (!resultsGrid) return;
    
    resultsGrid.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Searching database...</p>
        </div>
    `;
}

function showNoResults(message) {
    const resultsGrid = document.getElementById('results-grid');
    if (!resultsGrid) return;
    
    resultsGrid.innerHTML = `
        <div class="no-results">
            <i class="fas fa-search" style="font-size: 48px; color: #9ca3af; margin-bottom: 16px;"></i>
            <h3>No Results Found</h3>
            <p>${message || 'Try adjusting your search criteria'}</p>
        </div>
    `;
}

function loadInitialResults() {
    // Load some initial data if needed
    console.log('📄 Search page ready - Use tabs to search');
}

// ===== Notification System =====
function showNotification(message, type) {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}