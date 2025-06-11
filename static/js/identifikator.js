// ========================================
// STEINID PRO - IDENTIFIKATOR SPECIFIC
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeIdentifikator();
});

function initializeIdentifikator() {
    setupDragAndDrop();
    setupFormHandling();
    setupProgressTracking();
    loadIdentificationTips();
}

// Drag and Drop functionality
function setupDragAndDrop() {
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');
    
    if (!uploadZone || !imageInput) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    uploadZone.addEventListener('drop', handleDrop, false);
    
    // Handle file input change
    imageInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        uploadZone.classList.add('dragover');
    }
    
    function unhighlight() {
        uploadZone.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                processImageFile(file);
            } else {
                showToast('Ugyldig fil', 'Vennligst last opp en bildefil.', 'error');
            }
        }
    }
}

function processImageFile(file) {
    if (file.size > 16 * 1024 * 1024) {
        showToast('Fil for stor', 'Bildet må være mindre enn 16MB.', 'error');
        return;
    }
    
    showLoading('Behandler bilde...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        hideLoading();
        displayImagePreview(e.target.result);
        updateProgressStep(2);
        trackEvent('image', 'uploaded', file.type);
    };
    reader.onerror = function() {
        hideLoading();
        showToast('Feil', 'Kunne ikke lese bildefil.', 'error');
    };
    reader.readAsDataURL(file);
}

// Form handling
function setupFormHandling() {
    const form = document.getElementById('identificationForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        analyzeStone();
    });
    
    // Auto-save form data
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('change', saveFormData);
        input.addEventListener('input', debounce(saveFormData, 1000));
    });
    
    // Load saved form data
    loadFormData();
}

function saveFormData() {
    const formData = getFormData();
    saveToStorage('steinid_current_form', formData);
}

function loadFormData() {
    const savedData = loadFromStorage('steinid_current_form');
    if (savedData) {
        Object.keys(savedData).forEach(key => {
            const field = document.getElementById(key);
            if (field && savedData[key]) {
                field.value = savedData[key];
            }
        });
    }
}

function getFormData() {
    const form = document.getElementById('identificationForm');
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    return data;
}

// Stone Analysis
async function analyzeStone() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const originalText = analyzeBtn.innerHTML;
    
    try {
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Update UI
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Analyserer...';
        updateProgressStep(3);
        showLoading('AI analyserer steinen din...');
        
        // Prepare data
        const formData = getFormData();
        const imageData = getImageData();
        
        // Add image to form data if available
        if (imageData) {
            formData.bilde = imageData;
        }
        
        // Make API call
        const response = await fetch('/api/identifiser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayResult(result);
            saveAnalysisToHistory(formData, result);
            trackEvent('analysis', 'completed', 'success');
        } else {
            throw new Error(result.error || 'Ukjent feil');
        }
        
    } catch (error) {
        console.error('Analyse feilet:', error);
        
        if (navigator.onLine) {
            showToast('Analyse feilet', error.message || 'Kunne ikke analysere steinen. Prøv igjen.', 'error');
        } else {
            // Save for offline processing
            saveOfflineAnalysis(getFormData(), getImageData());
            showToast('Lagret offline', 'Analysen vil bli utført når du kommer online igjen.', 'info');
        }
        
        trackEvent('analysis', 'failed', error.message);
        
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalText;
        hideLoading();
    }
}

function validateForm() {
    const formData = getFormData();
    const imageData = getImageData();
    
    // Check if at least some data is provided
    const hasFormData = Object.values(formData).some(value => value && value.trim() !== '');
    const hasImage = !!imageData;
    
    if (!hasFormData && !hasImage) {
        showToast('Manglende data', 'Vennligst oppgi minst én egenskap eller last opp et bilde.', 'warning');
        return false;
    }
    
    return true;
}

function getImageData() {
    const previewImg = document.getElementById('previewImg');
    return previewImg && previewImg.src && !previewImg.src.includes('data:') ? previewImg.src : null;
}

function displayResult(result) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultContent = document.getElementById('resultContent');
    const confidenceFill = document.getElementById('confidenceFill');
    const confidenceText = document.getElementById('confidenceText');
    
    if (!resultsContainer || !resultContent) return;
    
    // Show results container
    resultsContainer.classList.remove('d-none');
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Display content
    resultContent.innerHTML = formatAnalysisResult(result.resultat);
    
    // Animate confidence indicator
    const confidence = estimateConfidence(result.resultat);
    animateConfidence(confidenceFill, confidenceText, confidence);
    
    // Clear saved form data
    localStorage.removeItem('steinid_current_form');
}

function formatAnalysisResult(text) {
    // Convert AI text to HTML with better formatting
    const sections = text.split('\n\n');
    let formattedText = '';
    
    sections.forEach(section => {
        if (section.trim()) {
            // Check if section is a header (starts with number or capital letter + colon)
            if (/^[\d\w]+[:.]\s/.test(section.trim())) {
                const [header, ...content] = section.split('\n');
                formattedText += `<h5 class="text-primary mt-3 mb-2">${header}</h5>`;
                if (content.length > 0) {
                    formattedText += `<p>${content.join('<br>').replace(/[•-]\s*/g, '<br>• ')}</p>`;
                }
            } else {
                formattedText += `<p>${section.replace(/\n/g, '<br>').replace(/[•-]\s*/g, '<br>• ')}</p>`;
            }
        }
    });
    
    return formattedText;
}

function estimateConfidence(text) {
    // Simple confidence estimation based on text content
    const indicators = {
        high: ['sannsynligvis', 'mest trolig', 'typisk', 'karakteristisk', 'definitivt'],
        medium: ['muligens', 'kan være', 'trolig', 'indikerer'],
        low: ['usikker', 'vanskelig', 'uklar', 'flere muligheter', 'alternativt']
    };
    
    const lowerText = text.toLowerCase();
    
    const highCount = indicators.high.filter(word => lowerText.includes(word)).length;
    const mediumCount = indicators.medium.filter(word => lowerText.includes(word)).length;
    const lowCount = indicators.low.filter(word => lowerText.includes(word)).length;
    
    if (highCount > lowCount && highCount > 0) return 85;
    if (lowCount > highCount && lowCount > 0) return 45;
    return 65; // Default medium confidence
}

function animateConfidence(fillElement, textElement, confidence) {
    if (!fillElement || !textElement) return;
    
    let currentWidth = 0;
    const targetWidth = confidence;
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = targetWidth / steps;
    const interval = duration / steps;
    
    const timer = setInterval(() => {
        currentWidth += increment;
        if (currentWidth >= targetWidth) {
            currentWidth = targetWidth;
            clearInterval(timer);
        }
        
        fillElement.style.width = currentWidth + '%';
        textElement.textContent = Math.round(currentWidth) + '%';
    }, interval);
}

// Progress tracking
function setupProgressTracking() {
    // Track form progress
    const form = document.getElementById('identificationForm');
    if (form) {
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            field.addEventListener('input', checkFormProgress);
            field.addEventListener('change', checkFormProgress);
        });
    }
}

function checkFormProgress() {
    const formData = getFormData();
    const filledFields = Object.values(formData).filter(value => value && value.trim() !== '').length;
    const totalFields = Object.keys(formData).length;
    const imageUploaded = !!getImageData();
    
    if (filledFields > 0 || imageUploaded) {
        updateProgressStep(2);
    }
}

// Offline analysis storage
function saveOfflineAnalysis(formData, imageData) {
    const offlineData = loadFromStorage(STORAGE_KEYS.OFFLINE_DATA, []);
    
    const analysis = {
        id: Date.now(),
        formData: formData,
        imageData: imageData,
        timestamp: new Date().toISOString(),
        synced: false
    };
    
    offlineData.push(analysis);
    saveToStorage(STORAGE_KEYS.OFFLINE_DATA, offlineData);
}

// Analysis history
function saveAnalysisToHistory(formData, result) {
    const history = loadFromStorage(STORAGE_KEYS.ANALYSIS_HISTORY, []);
    
    const analysis = {
        id: Date.now(),
        formData: formData,
        result: result,
        timestamp: new Date().toISOString()
    };
    
    history.unshift(analysis); // Add to beginning
    
    // Keep only last 50 analyses
    if (history.length > 50) {
        history.splice(50);
    }
    
    saveToStorage(STORAGE_KEYS.ANALYSIS_HISTORY, history);
}

// Identification tips
function loadIdentificationTips() {
    fetch('/api/forslag')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.tips) {
                window.identificationTips = data.tips;
            }
        })
        .catch(error => {
            console.error('Kunne ikke laste tips:', error);
            // Fallback tips
            window.identificationTips = [
                'Ta et tydelig bilde i god belysning',
                'Mål steinens dimensjoner nøyaktig',
                'Test hardhet med en mynt eller glass',
                'Noter om steinen er magnetisk',
                'Beskriv glansen (metallisk, glassaktig, matt)',
                'Sjekk transparens (gjennomsiktig, gjennomskinelig, ugjennomsiktig)',
                'Noter hvor steinen ble funnet',
                'Observer eventuelle krystallformer',
                'Test reaksjon med eddiksyre hvis mulig',
                'Noter om steinen har særlig tyngde'
            ];
        });
}

function showIdentificationTips() {
    const modal = document.getElementById('tipsModal');
    const tipsList = document.getElementById('tipsList');
    
    if (!modal || !tipsList) return;
    
    // Clear existing tips
    tipsList.innerHTML = '';
    
    // Add tips to modal
    const tips = window.identificationTips || [];
    tips.forEach((tip, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div class="tip-icon">
                <i class="fas fa-lightbulb"></i>
            </div>
            <div class="tip-content">
                <div class="tip-title">Tips ${index + 1}</div>
                <div class="tip-description">${tip}</div>
            </div>
        `;
        tipsList.appendChild(listItem);
    });
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    trackEvent('tips', 'viewed');
}

// Action buttons
function analyzeAgain() {
    clearForm();
    updateProgressStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveResult() {
    const resultContent = document.getElementById('resultContent');
    if (!resultContent) return;
    
    const savedResults = loadFromStorage(STORAGE_KEYS.SAVED_RESULTS, []);
    
    const result = {
        id: Date.now(),
        content: resultContent.innerHTML,
        timestamp: new Date().toISOString(),
        title: 'Steinanalyse ' + new Date().toLocaleDateString('no-NO')
    };
    
    savedResults.unshift(result);
    
    // Keep only last 20 saved results
    if (savedResults.length > 20) {
        savedResults.splice(20);
    }
    
    saveToStorage(STORAGE_KEYS.SAVED_RESULTS, savedResults);
    showToast('Resultat lagret', 'Analyseresultatet er lagret lokalt på enheten din.', 'success');
    trackEvent('result', 'saved');
}

function exploreCategory() {
    // Extract category from result (simple text analysis)
    const resultContent = document.getElementById('resultContent');
    if (!resultContent) return;
    
    const text = resultContent.textContent.toLowerCase();
    
    let category = 'alle';
    if (text.includes('magmatisk') || text.includes('granitt') || text.includes('basalt')) {
        category = 'magmatiske';
    } else if (text.includes('sedimentær') || text.includes('sandstein') || text.includes('kalkstein')) {
        category = 'sedimentære';
    } else if (text.includes('metamorf') || text.includes('marmor') || text.includes('gneis')) {
        category = 'metamorfe';
    } else if (text.includes('edelsten') || text.includes('diamant') || text.includes('rubin')) {
        category = 'edelstener';
    } else if (text.includes('meteoritt')) {
        category = 'meteoritter';
    } else if (text.includes('mineral') || text.includes('kvarts') || text.includes('feltspat')) {
        category = 'mineraler';
    }
    
    window.location.href = `/kategorier#${category}`;
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}