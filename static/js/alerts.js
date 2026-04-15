// ===== Alerts Page JavaScript =====

document.addEventListener('DOMContentLoaded', function() {
    initAlertsFilters();
    loadAlerts();
    loadCommunityUpdates();
    initAlertActions();
    initToggleSwitches();
});

// ===== Alerts Filtering =====
function initAlertsFilters() {
    const filterOptions = document.querySelectorAll('.filter-option');
    
    filterOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            filterOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            filterAlerts(filter);
        });
    });
}

function filterAlerts(filter) {
    const alertItems = document.querySelectorAll('.alert-item');
    let visibleCount = 0;
    
    alertItems.forEach(item => {
        if (filter === 'all') {
            item.style.display = 'grid';
            visibleCount++;
        } else if (item.classList.contains(filter)) {
            item.style.display = 'grid';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show no alerts message if no items visible
    const alertsList = document.getElementById('alerts-list');
    const noAlerts = alertsList.querySelector('.no-alerts');
    
    if (visibleCount === 0) {
        if (!noAlerts) {
            const noAlertsMsg = document.createElement('div');
            noAlertsMsg.className = 'no-alerts';
            noAlertsMsg.innerHTML = `
                <i class="fas fa-bell-slash"></i>
                <h3>No alerts found</h3>
                <p>There are no ${filter !== 'all' ? filter + ' ' : ''}alerts to display.</p>
            `;
            alertsList.appendChild(noAlertsMsg);
        }
    } else if (noAlerts) {
        noAlerts.remove();
    }
}

// ===== Load Alerts =====
function loadAlerts() {
    const alertsList = document.getElementById('alerts-list');
    
    if (!alertsList) return;
    
    // Sample alerts data
    const sampleAlerts = [
        {
            id: 1,
            type: 'emergency',
            title: 'Emergency Alert: Missing Child',
            message: '8-year-old girl missing from Central Park area since 2:30 PM today. Last seen wearing blue dress and white shoes.',
            time: '2 hours ago',
            location: 'Within 5 miles of you',
            unread: true
        },
        {
            id: 2,
            type: 'match',
            title: 'Potential Match Found',
            message: 'High probability match (92%) found for missing person Robert Williams. Please verify the match.',
            time: '5 hours ago',
            location: 'Match confidence: 92%',
            unread: true
        },
        {
            id: 3,
            type: 'sighting',
            title: 'New Sighting Reported',
            message: 'Community member reported seeing someone matching description of Sophia Martinez near Oak Street.',
            time: '1 day ago',
            location: '3 miles away',
            unread: false
        },
        {
            id: 4,
            type: 'resolved',
            title: 'Case Resolved: Emma Johnson',
            message: 'Missing child Emma Johnson has been found safe and reunited with family. Thank you for your help!',
            time: '2 days ago',
            location: 'Case closed',
            unread: false
        },
        {
            id: 5,
            type: 'emergency',
            title: 'Amber Alert Activated',
            message: 'AMBER Alert issued for missing 6-year-old boy. Last seen getting into a blue sedan.',
            time: '3 hours ago',
            location: 'Statewide alert',
            unread: true
        }
    ];
    
    // Clear existing alerts
    alertsList.innerHTML = '';
    
    // Add alerts to list
    sampleAlerts.forEach(alert => {
        const alertItem = createAlertItem(alert);
        alertsList.appendChild(alertItem);
    });
    
    // Update filter counts
    updateFilterCounts(sampleAlerts);
}

function createAlertItem(alert) {
    const item = document.createElement('div');
    item.className = `alert-item ${alert.type} ${alert.unread ? 'unread' : ''}`;
    item.setAttribute('data-id', alert.id);
    
    const iconClass = getAlertIcon(alert.type);
    
    item.innerHTML = `
        <div class="alert-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="alert-content">
            <h3>${alert.title}</h3>
            <p>${alert.message}</p>
            <div class="alert-meta">
                <span class="alert-time">${alert.time}</span>
                <span class="alert-location">${alert.location}</span>
            </div>
        </div>
        <div class="alert-actions">
            <button class="btn btn-primary view-alert">View Details</button>
            ${alert.unread ? '<button class="btn-text mark-read">Mark Read</button>' : ''}
        </div>
        ${alert.unread ? '<div class="unread-badge"></div>' : ''}
    `;
    
    return item;
}

function getAlertIcon(type) {
    const icons = {
        'emergency': 'fas fa-exclamation-triangle',
        'match': 'fas fa-user-check',
        'sighting': 'fas fa-eye',
        'resolved': 'fas fa-check-circle'
    };
    return icons[type] || 'fas fa-bell';
}

function updateFilterCounts(alerts) {
    const counts = {
        all: alerts.length,
        emergency: alerts.filter(a => a.type === 'emergency').length,
        match: alerts.filter(a => a.type === 'match').length,
        sighting: alerts.filter(a => a.type === 'sighting').length,
        resolved: alerts.filter(a => a.type === 'resolved').length
    };
    
    Object.keys(counts).forEach(filter => {
        const countElement = document.querySelector(`.filter-option[data-filter="${filter}"] .filter-count`);
        if (countElement) {
            countElement.textContent = counts[filter];
        }
    });
}

// ===== Alert Actions =====
function initAlertActions() {
    // Mark all as read
    const markAllReadBtn = document.querySelector('.mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', function() {
            const unreadAlerts = document.querySelectorAll('.alert-item.unread');
            unreadAlerts.forEach(alert => {
                alert.classList.remove('unread');
                const badge = alert.querySelector('.unread-badge');
                if (badge) badge.remove();
                const markReadBtn = alert.querySelector('.mark-read');
                if (markReadBtn) markReadBtn.remove();
            });
            showNotification('All alerts marked as read', 'success');
        });
    }
    
    // Individual alert actions using event delegation
    document.addEventListener('click', function(e) {
        // Mark as read
        if (e.target.classList.contains('mark-read')) {
            const alertItem = e.target.closest('.alert-item');
            alertItem.classList.remove('unread');
            const badge = alertItem.querySelector('.unread-badge');
            if (badge) badge.remove();
            e.target.remove();
            showNotification('Alert marked as read', 'success');
        }
        
        // View alert details
        if (e.target.classList.contains('view-alert')) {
            const alertItem = e.target.closest('.alert-item');
            const alertId = alertItem.getAttribute('data-id');
            const alertTitle = alertItem.querySelector('h3').textContent;
            showNotification(`Viewing details for: ${alertTitle}`, 'info');
        }
        
        // Emergency banner button
        if (e.target.classList.contains('btn-emergency') && e.target.textContent.includes('View Alert Details')) {
            showNotification('Showing Amber Alert details', 'error');
        }
    });
}

// ===== Toggle Switches =====
function initToggleSwitches() {
    const toggleSwitches = document.querySelectorAll('.toggle-switch input');
    
    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const preference = this.closest('.preference-item').querySelector('span').textContent;
            const action = this.checked ? 'enabled' : 'disabled';
            showNotification(`${preference} ${action}`, 'info');
        });
    });
}

// ===== Community Updates =====
function loadCommunityUpdates() {
    const updatesGrid = document.getElementById('updates-grid');
    
    if (!updatesGrid) return;
    
    // Sample community updates
    const sampleUpdates = [
        {
            id: 1,
            avatar: 'fas fa-user',
            name: 'Community Volunteer',
            time: '3 hours ago',
            content: 'Just helped reunite a missing elderly gentleman with his family. The Anveshan alert system made it possible to locate him within 2 hours of him wandering off. Amazing work, team!',
            likes: 24,
            shares: 5
        },
        {
            id: 2,
            avatar: 'fas fa-user-shield',
            name: 'Local Police Department',
            time: '1 day ago',
            content: 'Partnership with Anveshan has resulted in a 40% decrease in resolution time for missing person cases in our jurisdiction. The community\'s involvement through this platform is invaluable.',
            likes: 56,
            shares: 12
        },
        {
            id: 3,
            avatar: 'fas fa-user',
            name: 'Grateful Parent',
            time: '2 days ago',
            content: 'Words cannot express my gratitude to the Anveshan community. My daughter was found within hours thanks to your alerts and the amazing facial recognition technology. Thank you for bringing her home safely.',
            likes: 89,
            shares: 23
        }
    ];
    
    // Clear existing updates
    updatesGrid.innerHTML = '';
    
    // Add updates to grid
    sampleUpdates.forEach(update => {
        const updateCard = createUpdateCard(update);
        updatesGrid.appendChild(updateCard);
    });
}

function createUpdateCard(update) {
    const card = document.createElement('div');
    card.className = 'update-card';
    card.setAttribute('data-id', update.id);
    
    card.innerHTML = `
        <div class="update-header">
            <div class="update-avatar">
                <i class="${update.avatar}"></i>
            </div>
            <div class="update-info">
                <h4>${update.name}</h4>
                <span>${update.time}</span>
            </div>
        </div>
        <div class="update-content">
            <p>${update.content}</p>
        </div>
        <div class="update-actions">
            <button class="btn-text like-update">
                <i class="fas fa-heart"></i> ${update.likes}
            </button>
            <button class="btn-text share-update">
                <i class="fas fa-share"></i> Share
            </button>
        </div>
    `;
    
    return card;
}

// ===== Update Interactions =====
document.addEventListener('click', function(e) {
    // Like update
    if (e.target.classList.contains('like-update') || e.target.closest('.like-update')) {
        const btn = e.target.classList.contains('like-update') ? e.target : e.target.closest('.like-update');
        const currentLikes = parseInt(btn.textContent);
        btn.innerHTML = `<i class="fas fa-heart" style="color: var(--accent-color);"></i> ${currentLikes + 1}`;
        showNotification('Update liked', 'success');
    }
    
    // Share update
    if (e.target.classList.contains('share-update') || e.target.closest('.share-update')) {
        showNotification('Update shared', 'info');
    }
});

// ===== Real-time Alert Simulation =====
function simulateNewAlert() {
    // This would be connected to a real-time service in production
    setTimeout(() => {
        if (Math.random() > 0.7) { // 30% chance of new alert
            showNotification('New alert received!', 'info');
            // Reload alerts to show new one
            loadAlerts();
        }
    }, 30000); // Check every 30 seconds
}

// Start simulation
simulateNewAlert();
setInterval(simulateNewAlert, 30000);