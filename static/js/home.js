// ===== Home Page JavaScript =====

document.addEventListener('DOMContentLoaded', function() {
    initStatisticsCounter();
    initCaseCards();
    initScrollAnimations();
});

// ===== Statistics Counter Animation =====
function initStatisticsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    if (statNumbers.length > 0) {
        // Check if element is in viewport
        function isInViewport(element) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        }
        
        // Animate counter
        function animateCounter(element) {
            const target = parseInt(element.getAttribute('data-count'));
            const duration = 2000; // 2 seconds
            const step = target / (duration / 16); // 60fps
            let current = 0;
            
            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    element.textContent = target;
                    clearInterval(timer);
                } else {
                    element.textContent = Math.floor(current);
                }
            }, 16);
        }
        
        // Check on scroll
        let animated = false;
        window.addEventListener('scroll', function() {
            if (!animated && isInViewport(statNumbers[0])) {
                statNumbers.forEach(number => {
                    animateCounter(number);
                });
                animated = true;
            }
        });
        
        // Check on load in case already in viewport
        if (isInViewport(statNumbers[0])) {
            statNumbers.forEach(number => {
                animateCounter(number);
            });
            animated = true;
        }
    }
}

// ===== Case Cards Interaction =====
function initCaseCards() {
    const caseCards = document.querySelectorAll('.case-card');
    
    caseCards.forEach(card => {
        card.addEventListener('click', function() {
            const personName = this.querySelector('h3').textContent;
            showNotification(`Viewing details for ${personName}`, 'info');
        });
    });
}

// ===== Scroll Animations =====
function initScrollAnimations() {
    // Add intersection observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all step items and case cards
    const animatedElements = document.querySelectorAll('.step-item, .case-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ===== Smooth Scrolling for Hero Section =====
function initSmoothScrolling() {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', function() {
            window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
            });
        });
    }
}

// Initialize smooth scrolling
initSmoothScrolling();