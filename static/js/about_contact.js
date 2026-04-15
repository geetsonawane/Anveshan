// ===== About & Contact Pages JavaScript =====

document.addEventListener('DOMContentLoaded', function() {
    // Initialize based on current page
    if (document.querySelector('.about-section')) {
        initAboutPage();
    }
    
    if (document.querySelector('.contact-section')) {
        initContactPage();
    }
});

// ===== About Page Functionality =====
function initAboutPage() {
    initTeamMembers();
    initImpactStats();
    initPartnersAnimation();
}

function initTeamMembers() {
    const teamMembers = document.querySelectorAll('.team-member');
    
    teamMembers.forEach(member => {
        member.addEventListener('click', function() {
            const memberName = this.querySelector('h3').textContent;
            const memberRole = this.querySelector('.member-role').textContent;
            showNotification(`Viewing profile: ${memberName} - ${memberRole}`, 'info');
        });
    });
}

function initImpactStats() {
    const impactNumbers = document.querySelectorAll('.impact-number');
    
    impactNumbers.forEach(number => {
        const target = parseInt(number.textContent);
        if (!isNaN(target)) {
            animateNumber(number, target, 2000);
        }
    });
}

function animateNumber(element, target, duration) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target + (element.textContent.includes('+') ? '+' : '');
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

function initPartnersAnimation() {
    const partners = document.querySelectorAll('.partner-logo');
    
    partners.forEach((partner, index) => {
        partner.style.animationDelay = `${index * 0.1}s`;
    });
}

// ===== Contact Page Functionality =====
function initContactPage() {
    initContactForm();
    initFAQ();
    initEmergencyButtons();
    initMap();
}

function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateContactForm()) {
                // Show loading state
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                submitBtn.disabled = true;
                
                // Create FormData from form
                const formData = new FormData(contactForm);
                
                // Send to API
                fetch('/api/contact', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showContactSuccess();
                        contactForm.reset();
                    } else {
                        showNotification(data.message || 'Failed to send message. Please try again.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotification('An error occurred. Please try again later.', 'error');
                })
                .finally(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                });
            }
        });
    }
    
    // Real-time validation
    initContactFormValidation();
}

function validateContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return false;
    
    const requiredFields = contactForm.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'var(--danger-color)';
            isValid = false;
            
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
    
    // Validate email format
    const emailField = contactForm.querySelector('#contact-email');
    if (emailField && emailField.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            emailField.style.borderColor = 'var(--danger-color)';
            isValid = false;
            
            if (!emailField.nextElementSibling || !emailField.nextElementSibling.classList.contains('error-message')) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.style.color = 'var(--danger-color)';
                errorMsg.style.fontSize = '0.875rem';
                errorMsg.style.marginTop = '0.25rem';
                errorMsg.textContent = 'Please enter a valid email address';
                emailField.parentNode.appendChild(errorMsg);
            }
        }
    }
    
    if (!isValid) {
        showNotification('Please correct the errors in the form', 'error');
    }
    
    return isValid;
}

function initContactFormValidation() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;
    
    const fields = contactForm.querySelectorAll('input, textarea, select');
    
    fields.forEach(field => {
        field.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.style.borderColor = 'var(--danger-color)';
            } else {
                this.style.borderColor = 'var(--light-gray)';
                
                // Remove error message if exists
                const errorMsg = this.parentNode.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.remove();
                }
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

function showContactSuccess() {
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'contact-success';
    successDiv.style.display = 'block';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <h3>Message Sent Successfully!</h3>
        <p>Thank you for contacting us. We'll get back to you within 24 hours.</p>
        <button class="btn btn-primary" onclick="this.closest('.contact-success').style.display='none'">
            Send Another Message
        </button>
    `;
    
    const contactForm = document.getElementById('contact-form');
    contactForm.style.display = 'none';
    contactForm.parentNode.appendChild(successDiv);
    
    showNotification('Your message has been sent successfully!', 'success');
}

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });
}

function initEmergencyButtons() {
    // Emergency buttons are handled by onclick attributes in HTML
}

function initMap() {
    // This would initialize a real map in production
    // For demo purposes, we'll just show a placeholder
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        const mapPlaceholder = document.createElement('div');
        mapPlaceholder.className = 'map-placeholder';
        mapPlaceholder.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-map-marked-alt"></i>
                <p>Interactive Map<br><small>Would show our location here</small></p>
            </div>
        `;
        mapContainer.appendChild(mapPlaceholder);
    }
}

// ===== Emergency Contact Functions =====
function callEmergency() {
    if (confirm('Call emergency services (911)? This should only be used for immediate emergencies.')) {
        showNotification('Please call 911 for immediate emergency assistance', 'error');
        // In a real application, this would initiate a phone call
        // window.location.href = 'tel:911';
    }
}

function contactPolice() {
    showNotification('Please contact your local police department non-emergency line', 'info');
    // In a real application, this might open a directory or dialer
}

// ===== Utility Functions =====
function showNotification(message, type = 'info') {
    // Use the base.js notification function
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback notification
        alert(`${type.toUpperCase()}: ${message}`);
    }
}