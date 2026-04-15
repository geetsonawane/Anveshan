// ===== Found Person Page JavaScript =====

document.addEventListener('DOMContentLoaded', function() {
    initFoundPersonForm();
    initFileUploadFound();
    initLocationToggle();
    initSafetyTips();
});

// ===== Found Person Form Handling =====
function initFoundPersonForm() {
    const form = document.getElementById('found-person-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateFoundPersonForm()) {
                submitFoundPersonReport(form);
            }
        });
    }
}

// Submit found person report to backend
function submitFoundPersonReport(form) {
    showNotification('Submitting report...', 'info');
    
    const formData = new FormData(form);
    
    // Add uploaded photos to form data
    const photoInput = document.getElementById('found-photo-upload');
    if (photoInput && photoInput.files.length > 0) {
        for (let i = 0; i < photoInput.files.length; i++) {
            formData.append('photos[]', photoInput.files[i]);
        }
    }
    
    // Send data to server
    fetch('/api/report-found', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || 'Failed to submit report');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification('✓ Found person report submitted successfully! We will process this information and contact you if needed.', 'success');
            
            // Reset form
            form.reset();
            
            // Clear uploaded photos
            const photoContainer = document.getElementById('found-uploaded-photos');
            if (photoContainer) {
                photoContainer.innerHTML = '';
            }
            
            // Clear file input
            if (photoInput) {
                photoInput.value = '';
            }
            
            // Reset location details
            const locationDetails = document.getElementById('location-details-container');
            if (locationDetails) {
                locationDetails.style.display = 'none';
            }
            
            // Redirect to alerts page after 2 seconds
            setTimeout(() => {
                window.location.href = '/alerts';
            }, 2000);
        } else {
            showNotification('❌ ' + (data.message || 'Failed to submit report'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('❌ ' + error.message, 'error');
    });
}

// ===== Form Validation =====
function validateFoundPersonForm() {
    const requiredFields = document.querySelectorAll('#found-person-form [required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'var(--danger-color)';
            isValid = false;
            
            // Add error message if not exists
            if (!field.nextElementSibling || !field.nextElementSibling.classList.contains('error-message')) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.style.color = 'var(--danger-color)';
                errorMsg.style.fontSize = '0.875rem';
                errorMsg.style.marginTop = '0.25rem';
                errorMsg.textContent = 'This field is required';
                field.parentNode.appendChild(errorMsg);
            }
        } else {
            field.style.borderColor = 'var(--light-gray)';
            const errorMsg = field.parentNode.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        }
    });
    
    // Validate location details if "other" is selected
    const currentLocation = document.getElementById('current-location');
    const locationDetails = document.getElementById('location-details');
    
    if (currentLocation && currentLocation.value === 'other' && locationDetails) {
        if (!locationDetails.value.trim()) {
            locationDetails.style.borderColor = 'var(--danger-color)';
            isValid = false;
            
            if (!locationDetails.nextElementSibling || !locationDetails.nextElementSibling.classList.contains('error-message')) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.style.color = 'var(--danger-color)';
                errorMsg.style.fontSize = '0.875rem';
                errorMsg.style.marginTop = '0.25rem';
                errorMsg.textContent = 'Please provide location details';
                locationDetails.parentNode.appendChild(errorMsg);
            }
        }
    }
    
    if (!isValid) {
        showNotification('Please fill in all required fields', 'error');
    }
    
    return isValid;
}

// ===== File Upload for Found Person =====
function initFileUploadFound() {
    const uploadArea = document.getElementById('found-upload-area');
    const fileInput = document.getElementById('found-photo-upload');
    const previewContainer = document.getElementById('found-uploaded-photos');
    
    if (uploadArea && fileInput) {
        // Click on upload area to trigger file input
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        // Drag and drop functionality
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary-color)';
            uploadArea.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
        });
        
        uploadArea.addEventListener('dragleave', function() {
            uploadArea.style.borderColor = 'var(--light-gray)';
            uploadArea.style.backgroundColor = '';
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--light-gray)';
            uploadArea.style.backgroundColor = '';
            
            if (e.dataTransfer.files.length > 0) {
                handleFoundFiles(e.dataTransfer.files, previewContainer);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                handleFoundFiles(this.files, previewContainer);
            }
        });
    }
}

function handleFoundFiles(files, previewContainer) {
    if (!previewContainer) return;
    
    const photoInput = document.getElementById('found-photo-upload');
    const dataTransfer = new DataTransfer();
    
    // Preserve existing files
    if (photoInput && photoInput.files) {
        for (let i = 0; i < photoInput.files.length; i++) {
            dataTransfer.items.add(photoInput.files[i]);
        }
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check if file is an image
        if (!file.type.match('image.*')) {
            showNotification('Please upload only image files.', 'error');
            continue;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File size should be less than 5MB.', 'error');
            continue;
        }
        
        // Add file to DataTransfer
        dataTransfer.items.add(file);
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const preview = document.createElement('div');
            preview.className = 'uploaded-photo';
            preview.dataset.filename = file.name;
            
            const img = document.createElement('img');
            img.src = e.target.result;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-photo';
            removeBtn.innerHTML = '×';
            removeBtn.type = 'button';
            removeBtn.addEventListener('click', function() {
                preview.remove();
                removeFoundFileFromInput(file.name);
                showNotification('Photo removed', 'info');
            });
            
            preview.appendChild(img);
            preview.appendChild(removeBtn);
            previewContainer.appendChild(preview);
            
            showNotification('Photo uploaded successfully', 'success');
        };
        
        reader.readAsDataURL(file);
    }
    
    // Update file input with new files
    if (photoInput) {
        photoInput.files = dataTransfer.files;
    }
}

function removeFoundFileFromInput(filename) {
    const photoInput = document.getElementById('found-photo-upload');
    if (!photoInput || !photoInput.files) return;
    
    const dataTransfer = new DataTransfer();
    
    for (let i = 0; i < photoInput.files.length; i++) {
        if (photoInput.files[i].name !== filename) {
            dataTransfer.items.add(photoInput.files[i]);
        }
    }
    
    photoInput.files = dataTransfer.files;
}

// ===== Location Toggle =====
function initLocationToggle() {
    const currentLocation = document.getElementById('current-location');
    const locationDetailsContainer = document.getElementById('location-details-container');
    
    if (currentLocation && locationDetailsContainer) {
        currentLocation.addEventListener('change', function() {
            if (this.value === 'other') {
                locationDetailsContainer.style.display = 'block';
            } else {
                locationDetailsContainer.style.display = 'none';
            }
        });
    }
}

// ===== Safety Tips =====
function initSafetyTips() {
    // Add safety tips dynamically
    const quickActions = document.querySelector('.quick-actions');
    if (quickActions) {
        const safetyTips = document.createElement('div');
        safetyTips.className = 'safety-tips';
        safetyTips.innerHTML = `
            <h4><i class="fas fa-lightbulb"></i> Important Safety Tips</h4>
            <ul>
                <li>Do not put yourself in danger while helping</li>
                <li>Stay in a public, well-lit area</li>
                <li>If the person seems confused or disoriented, speak calmly and reassuringly</li>
                <li>Do not transport the person in your private vehicle unless absolutely necessary</li>
                <li>Contact authorities immediately if the person appears injured or in distress</li>
            </ul>
        `;
        
        quickActions.parentNode.insertBefore(safetyTips, quickActions);
    }
}

// ===== Emergency Contact Buttons =====
function initEmergencyContacts() {
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
        const emergencyContact = document.createElement('div');
        emergencyContact.className = 'emergency-contact-found';
        emergencyContact.innerHTML = `
            <h3>Need Immediate Assistance?</h3>
            <p>If the situation requires urgent attention, contact emergency services immediately.</p>
            <div class="contact-buttons">
                <button type="button" class="btn btn-emergency" onclick="callEmergency()">
                    <i class="fas fa-phone"></i> Call Emergency (911)
                </button>
                <button type="button" class="btn btn-outline" style="color: white; border-color: white;" onclick="contactPolice()">
                    <i class="fas fa-shield-alt"></i> Contact Local Police
                </button>
            </div>
        `;
        
        formContainer.parentNode.insertBefore(emergencyContact, formContainer);
    }
}

// Emergency contact functions
function callEmergency() {
    if (confirm('Call emergency services (911)?')) {
        showNotification('Please call 911 for immediate emergency assistance', 'error');
        // In a real application, this would initiate a phone call
        // window.location.href = 'tel:911';
    }
}

function contactPolice() {
    showNotification('Please contact your local police department non-emergency line', 'info');
}

// Initialize emergency contacts
initEmergencyContacts();

// ===== Real-time Validation =====
function initRealTimeValidationFound() {
    const requiredFields = document.querySelectorAll('#found-person-form [required]');
    
    requiredFields.forEach(field => {
        field.addEventListener('blur', function() {
            if (!this.value.trim()) {
                this.style.borderColor = 'var(--danger-color)';
            } else {
                this.style.borderColor = 'var(--light-gray)';
            }
        });
        
        field.addEventListener('input', function() {
            if (this.value.trim()) {
                this.style.borderColor = 'var(--light-gray)';
                const errorMsg = this.parentNode.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.remove();
                }
            }
        });
    });
}

// Initialize real-time validation
initRealTimeValidationFound();