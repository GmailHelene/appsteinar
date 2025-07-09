// ========================================
// STEINID PRO - MAIN APP JAVASCRIPT
// ========================================

// PWA Installation
let deferredPrompt;
let installButton;

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/js/sw.js')
            .then((registration) => {
                console.log('Service Worker registrert:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch((err) => {
                console.log('Service Worker registrering feilet:', err);
            });
    });
}

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA installasjonsprompt klar');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install banner
    const installBanner = document.getElementById('install-banner');
    if (installBanner) {
        installBanner.classList.remove('d-none');
    }
    
    // Show floating install button
    installButton = document.getElementById('install-button');
    if (installButton) {
        installButton.classList.remove('d-none');
    }
});

// Install PWA function
function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') {
                console.log('PWA installasjon akseptert');
                trackEvent('pwa_install', 'accepted');
                
                // Hide install elements
                const installBanner = document.getElementById('install-banner');
                if (installBanner) installBanner.classList.add('d-none');
                
                if (installButton) installButton.classList.add('d-none');
                
                showToast('App installert!', 'SteinID Pro er nå installert på enheten din.', 'success');
            } else {
                console.log('PWA installasjon avvist');
                trackEvent('pwa_install', 'declined');
            }
            deferredPrompt = null;
        });
    }
}

// Online/Offline Status
window.addEventListener('online', () => {
    console.log('Tilbake online');
    updateConnectionStatus(true);
    showToast('Tilbake online!', 'Internettforbindelse gjenopprettet.', 'success');
    
    // Sync offline data if any
    syncOfflineData();
});

window.addEventListener('offline', () => {
    console.log('Offline');
    updateConnectionStatus(false);
    showToast('Du er offline', 'Noen funksjoner kan være begrenset.', 'warning');
});

function updateConnectionStatus(isOnline) {
    const onlineIndicator = document.getElementById('online-indicator');
    const offlineIndicator = document.getElementById('offline-indicator');
    
    if (onlineIndicator && offlineIndicator) {
        if (isOnline) {
            onlineIndicator.classList.remove('d-none');
            offlineIndicator.classList.add('d-none');
        } else {
            onlineIndicator.classList.add('d-none');
            offlineIndicator.classList.remove('d-none');
        }
    }
    
    // Update body class for styling
    document.body.classList.toggle('offline', !isOnline);
}

// Toast Notifications
function showToast(title, message, type = 'info', duration = 5000) {
    const toastContainer = getOrCreateToastContainer();
    
    const toastId = 'toast-' + Date.now();
    const iconClass = {
        'success': 'fas fa-check-circle text-success',
        'error': 'fas fa-exclamation-triangle text-danger',
        'warning': 'fas fa-exclamation-circle text-warning',
        'info': 'fas fa-info-circle text-info'
    }[type] || 'fas fa-info-circle text-info';
    
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.id = toastId;
    toast.innerHTML = `
        <div class="toast-header">
            <i class="${iconClass} me-2"></i>
            <strong class="me-auto">${title}</strong>
            <small class="text-muted">nå</small>
            <button type="button" class="btn-close" onclick="removeToast('${toastId}')"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        removeToast(toastId);
    }, duration);
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.add('fade');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

function getOrCreateToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        container.style.top = '100px';
        document.body.appendChild(container);
    }
    return container;
}

// Loading Overlay
function showLoading(message = 'Laster...') {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('d-none');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('d-none');
    }
}

// Update Notification
function showUpdateNotification() {
    const updateToast = document.createElement('div');
    updateToast.className = 'toast show position-fixed';
    updateToast.style.top = '100px';
    updateToast.style.right = '20px';
    updateToast.style.zIndex = '9999';
    updateToast.innerHTML = `
        <div class="toast-header bg-primary text-white">
            <i class="fas fa-sync-alt me-2"></i>
            <strong class="me-auto">Oppdatering tilgjengelig</strong>
        </div>
        <div class="toast-body">
            En ny versjon av appen er tilgjengelig. Last inn siden på nytt for å oppdatere.
            <div class="mt-2">
                <button class="btn btn-primary btn-sm" onclick="window.location.reload()">
                    <i class="fas fa-sync"></i> Oppdater nå
                </button>
                <button class="btn btn-outline-secondary btn-sm ms-2" onclick="this.closest('.toast').remove()">
                    Senere
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(updateToast);
}

// Share API
async function shareResult(title, text, url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: title || 'SteinID Pro Resultat',
                text: text || 'Se denne steinanalysen fra SteinID Pro',
                url: url || window.location.href
            });
            console.log('Deling vellykket');
            trackEvent('share', 'native_share');
        } catch (err) {
            console.log('Deling feilet:', err);
            fallbackShare(title, text, url);
        }
    } else {
        fallbackShare(title, text, url);
    }
}

function fallbackShare(title, text, url) {
    if (navigator.clipboard) {
        const shareText = `${title}\n${text}\n${url}`;
        navigator.clipboard.writeText(shareText)
            .then(() => {
                showToast('Kopiert!', 'Innholdet er kopiert til utklippstavlen.', 'success');
                trackEvent('share', 'clipboard');
            });
    } else {
        // Show share modal as last resort
        showShareModal(title, text, url);
    }
}

function showShareModal(title, text, url) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-share"></i> Del resultat</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Kopier lenken nedenfor:</p>
                    <div class="input-group">
                        <input type="text" class="form-control" value="${url}" readonly id="shareUrl">
                        <button class="btn btn-outline-secondary" onclick="copyToClipboard('shareUrl')">
                            <i class="fas fa-copy"></i> Kopier
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    showToast('Kopiert!', 'Lenke kopiert til utklippstavlen.', 'success');
}

// Analytics/Tracking (placeholder)
function trackEvent(category, action, label = null) {
    console.log('Track event:', category, action, label);
    // Implement analytics tracking here (Google Analytics, etc.)
}

// Local Storage Management
const STORAGE_KEYS = {
    OFFLINE_DATA: 'steinid_offline_data',
    SAVED_RESULTS: 'steinid_saved_results',
    USER_PREFERENCES: 'steinid_preferences',
    ANALYSIS_HISTORY: 'steinid_history'
};

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Lagring feilet:', error);
        showToast('Lagringsfeil', 'Kunne ikke lagre data lokalt.', 'error');
        return false;
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Lasting feilet:', error);
        return defaultValue;
    }
}

// Offline Data Sync
function syncOfflineData() {
    const offlineData = loadFromStorage(STORAGE_KEYS.OFFLINE_DATA, []);
    const unsyncedData = offlineData.filter(item => !item.synced);
    
    if (unsyncedData.length === 0) return;
    
    console.log(`Synkroniserer ${unsyncedData.length} offline analyser`);
    
    unsyncedData.forEach(async (data, index) => {
        try {
            const response = await fetch('/api/identifiser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                data.synced = true;
                data.result = result;
                data.syncedAt = new Date().toISOString();
                
                // Update storage
                saveToStorage(STORAGE_KEYS.OFFLINE_DATA, offlineData);
                
                console.log(`Synkronisert offline analyse ${index + 1}/${unsyncedData.length}`);
            }
        } catch (error) {
            console.error('Synkronisering feilet for item:', data.id, error);
        }
    });
    
    if (unsyncedData.length > 0) {
        showToast('Synkronisering fullført', `${unsyncedData.length} offline analyser er synkronisert.`, 'success');
    }
}

function handleImageFile(file) {
    if (file.size > 16 * 1024 * 1024) { // 16MB limit
        showToast('Fil for stor', 'Bildet må være mindre enn 16MB.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        displayImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
}

function displayImagePreview(imageSrc) {
    const previewContainer = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const uploadZone = document.getElementById('uploadZone');
    
    if (previewContainer && previewImg && uploadZone) {
        previewImg.src = imageSrc;
        previewContainer.classList.remove('d-none');
        uploadZone.style.display = 'none';
    }
}

// Image utilities
function rotateImage() {
    const img = document.getElementById('previewImg');
    if (img) {
        const currentRotation = parseInt(img.dataset.rotation || '0');
        const newRotation = (currentRotation + 90) % 360;
        img.style.transform = `rotate(${newRotation}deg)`;
        img.dataset.rotation = newRotation;
    }
}

function removeImage() {
    const previewContainer = document.getElementById('imagePreview');
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');
    
    if (previewContainer && uploadZone) {
        previewContainer.classList.add('d-none');
        uploadZone.style.display = 'block';
    }
    
    if (imageInput) {
        imageInput.value = '';
    }
}

// Quick options selection
function selectQuickOption(fieldName, value) {
    const field = document.getElementById(fieldName);
    if (field) {
        field.value = value;
        field.focus();
        
        // Add visual feedback
        const quickOption = event.target;
        quickOption.style.background = '#e67e22';
        quickOption.style.color = 'white';
        
        setTimeout(() => {
            quickOption.style.background = '';
            quickOption.style.color = '';
        }, 1000);
    }
}

// Form utilities
function clearForm() {
    const form = document.getElementById('identificationForm');
    if (form) {
        form.reset();
        removeImage();
        hideResults();
    }
}

function hideResults() {
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        resultsContainer.classList.add('d-none');
    }
}

// Progress steps
function updateProgressStep(stepNumber) {
    const steps = document.querySelectorAll('.progress-step');
    
    steps.forEach((step, index) => {
        const number = index + 1;
        if (number < stepNumber) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (number === stepNumber) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
    
    // Update help visibility if function exists (identifikator page)
    if (typeof updateHelpVisibility === 'function') {
        updateHelpVisibility(stepNumber);
    }
}

// Notification permissions
function requestNotificationPermission() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification tillatelse gitt');
                    trackEvent('notifications', 'permission_granted');
                    
                    // Show welcome notification
                    setTimeout(() => {
                        showNotification('SteinID Pro', 'Notifikasjoner er aktivert! Du vil få beskjed om analyseresultater.');
                    }, 1000);
                } else {
                    trackEvent('notifications', 'permission_denied');
                }
            });
        }
    }
}

function showNotification(title, body, icon = '/static/icon-192x192.png') {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: body,
                icon: icon,
                badge: icon,
                vibrate: [100, 50, 100],
                data: {
                    dateOfArrival: Date.now(),
                    primaryKey: 1
                },
                actions: [
                    {
                        action: 'explore',
                        title: 'Åpne app',
                        icon: icon
                    }
                ]
            });
        });
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('SteinID Pro initialiserer...');
    
    // Check initial connection status
    updateConnectionStatus(navigator.onLine);
    
    // Request notification permission after a delay
    setTimeout(requestNotificationPermission, 3000);
    
    // Initialize tooltips if Bootstrap is loaded
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    // Auto-focus first form input
    const firstInput = document.querySelector('input[type="text"], input[type="email"], textarea');
    if (firstInput && !window.location.hash) {
        setTimeout(() => firstInput.focus(), 500);
    }
    
    trackEvent('app', 'initialized');
});

// Export functions for global use
window.SteinID = {
    installPWA,
    showToast,
    shareResult,
    trackEvent,
    saveToStorage,
    loadFromStorage,
    selectQuickOption,
    clearForm,
    updateProgressStep
};