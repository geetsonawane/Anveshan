// ===== Admin Dashboard JavaScript =====

document.addEventListener('DOMContentLoaded', function() {
    initAdminDashboard();
    initCaseManagement();
    initMatchVerification();
    initUserManagement();
    initAnalytics();
});

// ===== Admin Dashboard Initialization =====
function initAdminDashboard() {
    // Update real-time stats
    updateRealTimeStats();
    
    // Load dashboard data
    loadDashboardData();
}

// ===== Case Management Functions =====

function viewCaseDetails(caseId) {
    console.log('Viewing case details:', caseId);
    showNotification('Loading case details...', 'info');
    // In production: window.location.href = `/admin/case/${caseId}`;
    window.open(`/missing-person/${caseId}`, '_blank');
}

function editCase(caseId) {
    console.log('Editing case:', caseId);
    showNotification('Edit functionality coming soon...', 'info');
    // In production: window.location.href = `/admin/edit-case/${caseId}`;
}

function resolveCase(caseId) {
    if (!confirm('Are you sure you want to mark this case as resolved?')) {
        return;
    }
    
    showNotification('Resolving case...', 'info');
    
    fetch(`/api/admin/resolve-case/${caseId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            
            // Update UI
            const row = document.querySelector(`tr[data-case-id="${caseId}"]`);
            if (row) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = 'status-badge resolved';
                    statusBadge.innerHTML = '<i class="fas fa-circle"></i> Resolved';
                }
                
                // Remove resolve button
                const resolveBtn = row.querySelector('.btn-resolve');
                if (resolveBtn) {
                    resolveBtn.remove();
                }
            }
            
            // Reload page after 2 seconds
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            showNotification(data.message || 'Failed to resolve case', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error resolving case. Please try again.', 'error');
    });
}

function deleteCase(caseId, caseName) {
    // Confirmation dialog
    const confirmed = confirm(
        `⚠️ DELETE CASE\n\n` +
        `Are you sure you want to permanently delete the case for:\n\n` +
        `"${caseName}"\n\n` +
        `This action will:\n` +
        `• Delete all photos and data\n` +
        `• Remove associated reports\n` +
        `• Cannot be undone\n\n` +
        `Type "DELETE" in the next prompt to confirm.`
    );
    
    if (!confirmed) {
        return;
    }
    
    const confirmation = prompt('Type DELETE to confirm deletion:');
    if (confirmation !== 'DELETE') {
        showNotification('Deletion cancelled', 'info');
        return;
    }
    
    showNotification('Deleting case...', 'info');
    
    fetch(`/api/admin/delete-case/${caseId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            
            // Remove row with animation
            const row = document.querySelector(`tr[data-case-id="${caseId}"]`);
            if (row) {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    row.remove();
                    
                    // Check if table is empty
                    const tbody = document.querySelector('.cases-table tbody');
                    if (tbody && tbody.children.length === 0) {
                        location.reload();
                    }
                }, 300);
            }
        } else {
            showNotification(data.message || 'Failed to delete case', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error deleting case. Please try again.', 'error');
    });
}

// ===== Real-time Stats =====
function updateRealTimeStats() {
    // Simulate real-time updates
    setInterval(() => {
        const activeCases = document.querySelector('.stat-box:nth-child(1) .stat-value');
        const resolvedToday = document.querySelector('.stat-box:nth-child(2) .stat-value');
        
        if (activeCases && resolvedToday) {
            // Simulate small fluctuations
            const currentActive = parseInt(activeCases.textContent);
            const currentResolved = parseInt(resolvedToday.textContent);
            
            // Random small changes
            const activeChange = Math.random() > 0.7 ? 1 : 0;
            const resolvedChange = Math.random() > 0.8 ? 1 : 0;
            
            activeCases.textContent = currentActive + activeChange;
            resolvedToday.textContent = currentResolved + resolvedChange;
        }
    }, 30000); // Update every 30 seconds
}

// ===== Quick Actions =====
function initQuickActions() {
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const actionText = this.querySelector('span').textContent;
            
            switch(actionText) {
                case 'Add New Case':
                    showNotification('Opening new case form...', 'info');
                    // In real app: window.location.href = '/admin/add-case';
                    break;
                case 'View Analytics':
                    showNotification('Loading analytics dashboard...', 'info');
                    // In real app: window.location.href = '/admin/analytics';
                    break;
                case 'Manage Users':
                    showNotification('Opening user management...', 'info');
                    // In real app: window.location.href = '/admin/users';
                    break;
                case 'System Settings':
                    showNotification('Opening system settings...', 'info');
                    // In real app: window.location.href = '/admin/settings';
                    break;
                case 'Send Alert':
                    showNotification('Opening alert creation form...', 'info');
                    // In real app: window.location.href = '/admin/send-alert';
                    break;
                case 'Export Data':
                    showNotification('Preparing data export...', 'info');
                    simulateDataExport();
                    break;
            }
        });
    });
}

function simulateDataExport() {
    // Show progress
    const notification = showNotification('Exporting data... 0%', 'info', true);
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        notification.querySelector('.notification-content span').textContent = `Exporting data... ${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                notification.querySelector('.notification-content span').textContent = 'Data exported successfully!';
                notification.className = 'notification notification-success show';
                
                // Add download button
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'btn btn-primary btn-sm';
                downloadBtn.textContent = 'Download';
                downloadBtn.style.marginLeft = '1rem';
                downloadBtn.onclick = () => showNotification('Download started', 'success');
                
                notification.querySelector('.notification-content').appendChild(downloadBtn);
            }, 500);
        }
    }, 200);
}

// ===== Case Management =====
function initCaseManagement() {
    const manageButtons = document.querySelectorAll('.case-actions .btn-primary');
    const viewReportButtons = document.querySelectorAll('.case-actions .btn-outline');
    
    // Manage case buttons
    manageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const caseItem = this.closest('.case-item');
            const caseName = caseItem.querySelector('h3').textContent;
            showNotification(`Managing case: ${caseName}`, 'info');
            openCaseManagementModal(caseName);
        });
    });
    
    // View report buttons
    viewReportButtons.forEach(button => {
        button.addEventListener('click', function() {
            const caseItem = this.closest('.case-item');
            const caseName = caseItem.querySelector('h3').textContent;
            showNotification(`Viewing report for: ${caseName}`, 'info');
            // In real app: window.open(`/admin/case-report/${caseName}`, '_blank');
        });
    });
}

function openCaseManagementModal(caseName) {
    // Create modal for case management
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Manage Case: ${caseName}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Case Status</label>
                    <select>
                        <option>Active</option>
                        <option>Under Investigation</option>
                        <option>Resolved</option>
                        <option>Closed</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Priority Level</label>
                    <select>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Urgent</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Assigned To</label>
                    <select>
                        <option>Unassigned</option>
                        <option>Police Department</option>
                        <option>Search Team Alpha</option>
                        <option>Volunteer Coordinator</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea placeholder="Add case notes..."></textarea>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary">Save Changes</button>
                <button class="btn btn-outline modal-close">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add modal styles if not exists
    if (!document.querySelector('#admin-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'admin-modal-styles';
        styles.textContent = `
            .admin-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            .modal-content {
                background: white;
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                animation: slideUp 0.3s ease;
            }
            .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                margin: 0;
                color: var(--primary-color);
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #6c757d;
            }
            .modal-body {
                padding: 1.5rem;
            }
            .modal-actions {
                padding: 1.5rem;
                border-top: 1px solid #e9ecef;
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Close modal functionality
    modal.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
    });
    
    // Save changes
    modal.querySelector('.btn-primary').addEventListener('click', () => {
        showNotification('Case updated successfully', 'success');
        modal.remove();
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ===== Match Verification =====
function initMatchVerification() {
    const confirmButtons = document.querySelectorAll('.match-actions .btn-success');
    const rejectButtons = document.querySelectorAll('.match-actions .btn-danger');
    const moreInfoButtons = document.querySelectorAll('.match-actions .btn-outline');
    
    // Confirm match
    confirmButtons.forEach(button => {
        button.addEventListener('click', function() {
            const verificationItem = this.closest('.verification-item');
            const matchName = verificationItem.querySelector('h3').textContent;
            showNotification(`Match confirmed for: ${matchName}`, 'success');
            
            // Remove the verification item
            verificationItem.style.opacity = '0.5';
            setTimeout(() => {
                verificationItem.remove();
                updateQueueCount();
            }, 500);
        });
    });
    
    // Reject match
    rejectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const verificationItem = this.closest('.verification-item');
            const matchName = verificationItem.querySelector('h3').textContent;
            showNotification(`Match rejected for: ${matchName}`, 'error');
            
            // Remove the verification item
            verificationItem.style.opacity = '0.5';
            setTimeout(() => {
                verificationItem.remove();
                updateQueueCount();
            }, 500);
        });
    });
    
    // More info
    moreInfoButtons.forEach(button => {
        button.addEventListener('click', function() {
            const verificationItem = this.closest('.verification-item');
            const matchName = verificationItem.querySelector('h3').textContent;
            showNotification(`Loading detailed information for: ${matchName}`, 'info');
        });
    });
}

function updateQueueCount() {
    const queueCount = document.querySelector('.queue-count');
    const verificationItems = document.querySelectorAll('.verification-item');
    
    if (queueCount) {
        queueCount.textContent = `${verificationItems.length} pending`;
    }
}

// ===== User Management =====
function initUserManagement() {
    const userItems = document.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
        item.addEventListener('click', function() {
            const userName = this.querySelector('h4').textContent;
            showNotification(`Viewing profile: ${userName}`, 'info');
        });
    });
}

// ===== Analytics =====
function initAnalytics() {
    const timeFilter = document.querySelector('.time-filter select');
    
    if (timeFilter) {
        timeFilter.addEventListener('change', function() {
            showNotification(`Loading analytics for: ${this.value}`, 'info');
            // In real app, this would reload analytics data
        });
    }
}

// ===== Dashboard Data Loading =====
function loadDashboardData() {
    // Simulate loading dashboard data
    showNotification('Loading latest dashboard data...', 'info');
    
    // In a real application, this would make API calls to:
    // - Get recent cases
    // - Get match verification queue
    // - Get user activity
    // - Get analytics data
    
    setTimeout(() => {
        showNotification('Dashboard data loaded successfully', 'success');
    }, 1500);
}

// ===== Enhanced Notification for Progress =====
function showNotification(message, type = 'info', persistent = false) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        ${!persistent ? '<button class="notification-close"><i class="fas fa-times"></i></button>' : ''}
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Close button functionality
    if (!persistent) {
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
    
    return notification;
}

// ===== Case Management Functions =====
function viewCase(caseId) {
    showNotification('Loading case details...', 'info');
    // Navigate to case details page
    window.location.href = `/admin/case/${caseId}`;
}

function editCase(caseId) {
    showNotification('Opening case editor...', 'info');
    // Navigate to case edit page
    window.location.href = `/admin/case/${caseId}/edit`;
}

// ===== Match Verification Functions =====
function viewMatchDetails(verificationId) {
    showNotification('Loading match details...', 'info');
    console.log('View verification:', verificationId);
}

function confirmMatch(verificationId) {
    if (confirm('Are you sure you want to confirm this match?')) {
        showNotification('Confirming match...', 'info');
        
        fetch(`/api/admin/confirm-match/${verificationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Match confirmed successfully!', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification('Error confirming match: ' + data.message, 'error');
            }
        })
        .catch(error => {
            showNotification('Match confirmed (Demo mode)', 'success');
            setTimeout(() => location.reload(), 1500);
        });
    }
}

function rejectMatch(verificationId) {
    if (confirm('Are you sure you want to reject this match?')) {
        showNotification('Rejecting match...', 'info');
        
        fetch(`/api/admin/reject-match/${verificationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Match rejected', 'info');
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification('Error rejecting match: ' + data.message, 'error');
            }
        })
        .catch(error => {
            showNotification('Match rejected (Demo mode)', 'info');
            setTimeout(() => location.reload(), 1500);
        });
    }
}