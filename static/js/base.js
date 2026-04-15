// ===== Base JavaScript - Common functionality for all pages =====

// Document ready function
document.addEventListener('DOMContentLoaded', function() {
    // Initialize common components
    initNavigation();
    initLightningEffect();
});

// ===== Navigation Functions =====
function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    });
}

// ===== Lightning Effect =====
function initLightningEffect() {
    // Create lightning element
    const lightning = document.createElement('div');
    lightning.className = 'lightning';
    document.body.appendChild(lightning);
    
    // Add click event to specific elements to trigger lightning
    const lightningTriggers = document.querySelectorAll('.nav-link, .btn, .case-card, .result-card, .alert-item, .action-btn');
    
    lightningTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            // Only trigger for certain elements or add a specific class
            if (this.classList.contains('nav-link') && 
                (this.textContent.includes('Blog') || this.getAttribute('href') && this.getAttribute('href').includes('blog'))) {
                triggerLightning();
            }
        });
    });
    
    // Also trigger on page load for demo purposes
    window.addEventListener('load', function() {
        // Trigger lightning once on initial load
        setTimeout(triggerLightning, 1000);
    });
}

function triggerLightning() {
    const lightning = document.querySelector('.lightning');
    if (lightning) {
        lightning.classList.add('active');
        setTimeout(() => {
            lightning.classList.remove('active');
        }, 500);
    }
}

// ===== Utility Functions =====
// Debounce function for performance
function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Format date for display
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
}

// Format time for display
function formatTime(date) {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleTimeString(undefined, options);
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 100px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 1rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                z-index: 10000;
                transform: translateX(400px);
                transition: transform 0.3s ease;
                max-width: 400px;
            }
            .notification.show {
                transform: translateX(0);
            }
            .notification-success {
                border-left: 4px solid #4cc9f0;
            }
            .notification-error {
                border-left: 4px solid #e63946;
            }
            .notification-info {
                border-left: 4px solid #4361ee;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex: 1;
            }
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                color: #6c757d;
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}