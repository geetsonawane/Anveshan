// Admin Login JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('admin-login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const btnLoading = document.getElementById('btn-loading');

    // Initialize login functionality
    initLoginForm();

    function initLoginForm() {
        // Form submission
        loginForm.addEventListener('submit', handleLoginSubmit);

        // Real-time validation
        usernameInput.addEventListener('input', clearError);
        passwordInput.addEventListener('input', clearError);

        // Enter key support
        loginForm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLoginSubmit(e);
            }
        });

        // Demo credentials auto-fill for development
        initDemoAutoFill();
    }

    function handleLoginSubmit(e) {
        e.preventDefault();
        
        if (validateForm()) {
            submitLoginForm();
        }
    }

    function validateForm() {
        let isValid = true;
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // Clear previous errors
        clearAllErrors();

        // Validate username
        if (!username) {
            showError('username', 'Username is required');
            isValid = false;
        } else if (username.length < 3) {
            showError('username', 'Username must be at least 3 characters');
            isValid = false;
        }

        // Validate password
        if (!password) {
            showError('password', 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            showError('password', 'Password must be at least 6 characters');
            isValid = false;
        }

        if (!isValid) {
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        }

        return isValid;
    }

    function showError(field, message) {
        const errorElement = document.getElementById(`${field}-error`);
        const inputElement = document.getElementById(field);
        
        if (errorElement && inputElement) {
            errorElement.textContent = message;
            inputElement.classList.add('error');
        }
    }

    function clearError(e) {
        const field = e.target.id;
        const errorElement = document.getElementById(`${field}-error`);
        const inputElement = document.getElementById(field);
        
        if (errorElement && inputElement) {
            errorElement.textContent = '';
            inputElement.classList.remove('error');
        }
    }

    function clearAllErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        const inputElements = document.querySelectorAll('.form-input');
        
        errorElements.forEach(element => {
            element.textContent = '';
        });
        
        inputElements.forEach(element => {
            element.classList.remove('error');
        });
    }

    async function submitLoginForm() {
        const formData = new FormData(loginForm);
        const username = formData.get('username');
        const password = formData.get('password');

        // Show loading state
        setLoadingState(true);

        try {
            // Simulate API call delay
            await simulateAPICall();

            // For demo purposes, accept any credentials
            // In production, this would be a real API call
            if (username && password) {
                // Success - form will submit normally to Flask route
                showSuccessFeedback();
            } else {
                throw new Error('Invalid credentials');
            }

        } catch (error) {
            setLoadingState(false);
            showError('password', 'Login failed. Please check your credentials.');
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        }
    }

    function simulateAPICall() {
        return new Promise((resolve) => {
            setTimeout(resolve, 1500);
        });
    }

    function showSuccessFeedback() {
        // Add success animation before form submission
        loginBtn.innerHTML = '<i class="fas fa-check"></i> Success! Redirecting...';
        loginBtn.style.backgroundColor = 'var(--success-color)';
        
        setTimeout(() => {
            // Allow form to submit normally
            loginForm.submit();
        }, 1000);
    }

    function setLoadingState(loading) {
        if (loading) {
            loginBtn.disabled = true;
            loginBtn.classList.add('loading');
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        } else {
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    }

    function initDemoAutoFill() {
        // Auto-fill demo credentials for development
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true') {
            usernameInput.value = 'admin';
            passwordInput.value = 'admin123';
            
            // Show demo notification
            showDemoNotification();
        }
    }

    function showDemoNotification() {
        const notification = document.createElement('div');
        notification.className = 'flash-message flash-success';
        notification.innerHTML = `
            <i class="fas fa-info-circle"></i>
            Demo credentials auto-filled for testing
        `;
        
        const flashContainer = document.querySelector('.flash-messages') || createFlashContainer();
        flashContainer.appendChild(notification);
    }

    function createFlashContainer() {
        const container = document.createElement('div');
        container.className = 'flash-messages';
        loginForm.parentNode.insertBefore(container, loginForm);
        return container;
    }

    // Password visibility toggle (optional enhancement)
    function initPasswordToggle() {
        const passwordGroup = document.querySelector('.form-group:has(#password)');
        if (passwordGroup) {
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'password-toggle';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
            toggleBtn.style.cssText = `
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--gray-color);
                cursor: pointer;
                padding: 4px;
            `;

            passwordGroup.style.position = 'relative';
            passwordGroup.appendChild(toggleBtn);

            toggleBtn.addEventListener('click', function() {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }
    }

    // Initialize password toggle
    initPasswordToggle();
});

// Utility function to show notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `flash-message flash-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    
    const container = document.querySelector('.flash-messages') || document.body;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}