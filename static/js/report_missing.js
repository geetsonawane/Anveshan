// ===== Report Missing Page JavaScript =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('Report Missing form initialized');
    initMultiStepForm();
    initFileUpload();
    initFormValidation();
    initRealTimeValidation();
});

// ===== Multi-step Form Functionality =====
function initMultiStepForm() {
    const formSections = document.querySelectorAll('.form-section');
    const progressSteps = document.querySelectorAll('.progress-step');
    const nextButtons = document.querySelectorAll('.next-step');
    const prevButtons = document.querySelectorAll('.prev-step');
    
    let currentStep = 1;
    
    // Show first section
    showSection(currentStep);
    
    // Next button functionality
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            const nextStep = parseInt(this.getAttribute('data-next'));
            if (validateSection(currentStep)) {
                currentStep = nextStep;
                showSection(currentStep);
                updateProgress();
            }
        });
    });
    
    // Previous button functionality
    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            const prevStep = parseInt(this.getAttribute('data-prev'));
            currentStep = prevStep;
            showSection(currentStep);
            updateProgress();
        });
    });
    
    function showSection(step) {
        formSections.forEach(section => {
            section.classList.remove('active');
            if (parseInt(section.getAttribute('data-step')) === step) {
                section.classList.add('active');
            }
        });
    }
    
    function updateProgress() {
        progressSteps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === currentStep) {
                step.classList.add('active');
            }
        });
    }
}

// Validate a specific section
function validateSection(step) {
    const currentSection = document.querySelector(`.form-section[data-step="${step}"]`);
    if (!currentSection) {
        console.error('Section not found:', step);
        return false;
    }
    
    const requiredFields = currentSection.querySelectorAll('[required]');
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
    
    if (!isValid) {
        showNotification('Please fill in all required fields in this step', 'error');
    }
    
    console.log('Validation for step', step, ':', isValid);
    return isValid;
}

// ===== File Upload Functionality =====
function initFileUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('photo-upload');
    const previewContainer = document.getElementById('uploaded-photos');
    
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
                handleFiles(e.dataTransfer.files, previewContainer);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                handleFiles(this.files, previewContainer);
            }
        });
    }
}

function handleFiles(files, previewContainer) {
    if (!previewContainer) return;
    
    const photoInput = document.getElementById('photo-upload');
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
                removeFileFromInput(file.name);
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

function removeFileFromInput(filename) {
    const photoInput = document.getElementById('photo-upload');
    if (!photoInput || !photoInput.files) return;
    
    const dataTransfer = new DataTransfer();
    
    for (let i = 0; i < photoInput.files.length; i++) {
        if (photoInput.files[i].name !== filename) {
            dataTransfer.items.add(photoInput.files[i]);
        }
    }
    
    photoInput.files = dataTransfer.files;
}

// ===== Form Validation =====
function initFormValidation() {
    const form = document.getElementById('missing-person-form');
    
    if (form) {
        console.log('Form validation initialized');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted');
            
            // Validate all sections
            let allValid = true;
            for (let i = 1; i <= 5; i++) {
                if (!validateSection(i)) {
                    allValid = false;
                    console.log('Validation failed at step:', i);
                    // Show the section with errors
                    document.querySelectorAll('.form-section').forEach(section => {
                        section.classList.remove('active');
                    });
                    document.querySelector(`.form-section[data-step="${i}"]`).classList.add('active');
                    break;
                }
            }
            
            if (allValid) {
                console.log('All validations passed, submitting to server...');
                // Submit form data to backend
                submitMissingPersonReport(form);
            }
        });
    } else {
        console.error('Form not found!');
    }
}

// Submit form data to backend
function submitMissingPersonReport(form) {
    console.log('='.repeat(50));
    console.log('submitMissingPersonReport function called');
    console.log('Form element:', form);
    console.log('='.repeat(50));
    
    showNotification('Submitting report...', 'info');
    
    const formData = new FormData(form);
    
    // Log form data for debugging
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
        console.log(key + ': ' + value);
    }
    
    // Add uploaded photos to form data
    const photoInput = document.getElementById('photo-upload');
    if (photoInput && photoInput.files.length > 0) {
        console.log('Adding', photoInput.files.length, 'photos to form data');
        for (let i = 0; i < photoInput.files.length; i++) {
            formData.append('photos[]', photoInput.files[i]);
        }
    }
    
    console.log('About to send fetch request to /api/report-missing');
    
    // Send data to server
    fetch('/api/report-missing', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Response status:', response.status);
        // Check if response is not ok (status code outside 200-299)
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || 'Failed to submit report');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Server response:', data);
        if (data.success) {
            showNotification('✓ Missing person report submitted successfully! Our team will contact you soon.', 'success');
            
            // Reset form after successful submission
            form.reset();
            
            // Clear uploaded photos
            const photoContainer = document.getElementById('uploaded-photos');
            if (photoContainer) {
                photoContainer.innerHTML = '';
            }
            
            // Clear file input
            const photoInput = document.getElementById('photo-upload');
            if (photoInput) {
                photoInput.value = '';
            }
            
            // Reset to first step
            document.querySelectorAll('.form-section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelector('.form-section[data-step="1"]').classList.add('active');
            
            // Reset progress
            document.querySelectorAll('.progress-step').forEach((step, index) => {
                step.classList.remove('active', 'completed');
                if (index === 0) {
                    step.classList.add('active');
                }
            });
            
            // Redirect to search results page after 2 seconds
            setTimeout(() => {
                window.location.href = '/search-results';
            }, 2000);
        } else {
            console.error('Submission failed:', data.message);
            showNotification('❌ ' + (data.message || 'Failed to submit report'), 'error');
        }
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        showNotification('❌ ' + error.message, 'error');
    });
}

// ===== Real-time Validation =====
function initRealTimeValidation() {
    // Add real-time validation for required fields
    const requiredFields = document.querySelectorAll('[required]');
    
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