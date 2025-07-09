// ========================================
// STEINID PRO - KATEGORIER SPECIFIC
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeKategorier();
});

function initializeKategorier() {
    setupCategoryFilter();
    loadCategoryContent();
    handleUrlHash();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleUrlHash);
}

// Category filtering
function setupCategoryFilter() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const category = this.dataset.category;
            filterCategories(category);
        });
    });
}

function filterCategories(category) {
    console.log('Filtering categories for:', category);
    
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        }
    });
    
    // Show/hide categories
    const categoryDetails = document.querySelectorAll('.category-detail');
    console.log('Found category details:', categoryDetails.length);
    
    categoryDetails.forEach(detail => {
        const detailCategory = detail.dataset.category;
        console.log('Processing detail:', detailCategory, 'target:', category);
        
        if (category === 'alle' || detailCategory === category) {
            detail.classList.add('show');
            detail.style.display = 'block';
            console.log('Showing category:', detailCategory);
        } else {
            detail.classList.remove('show');
            detail.style.display = 'none';
            console.log('Hiding category:', detailCategory);
        }
    });
    
    // Update URL hash
    if (category !== 'alle') {
        window.history.replaceState(null, null, `#${category}`);
    } else {
        window.history.replaceState(null, null, '/kategorier');
    }
    
    // Track event
    if (typeof trackEvent === 'function') {
        trackEvent('category', 'filtered', category);
    }
}

// Handle URL hash for direct linking
function handleUrlHash() {
    const hash = window.location.hash.substring(1);
    console.log('Handling URL hash:', hash);
    
    if (hash) {
        const validCategories = ['magmatiske', 'sedimentære', 'metamorfe', 'edelstener', 'mineraler', 'meteoritter'];
        if (validCategories.includes(hash)) {
            console.log('Valid category found, filtering:', hash);
            filterCategories(hash);
            
            // Scroll to category after a delay
            setTimeout(() => {
                const categoryElement = document.getElementById(hash);
                if (categoryElement) {
                    categoryElement.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        }
    } else {
        // No hash, show all categories
        filterCategories('alle');
    }
}

// Load category content from API
function loadCategoryContent() {
    const categories = [
        'magmatiske', 'sedimentære', 'metamorfe', 
        'edelstener', 'mineraler', 'meteoritter'
    ];
    
    categories.forEach(category => {
        loadCategoryInfo(category);
    });
}

async function loadCategoryInfo(category) {
    const contentElement = document.getElementById(`${category}-content`);
    if (!contentElement) {
        console.error('Content element not found for:', category);
        return;
    }
    
    console.log('Loading category info for:', category);
    
    try {
        const response = await fetch('/api/kategori', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ kategori: category })
        });
        
        console.log('API response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('API result:', result);
            
            if (result.success) {
                contentElement.innerHTML = formatCategoryContent(result.resultat);
                console.log('Content loaded successfully for:', category);
            } else {
                console.error('API returned error:', result.error);
                contentElement.innerHTML = `<p class="text-muted">Kunne ikke laste innhold for ${category}: ${result.error}</p>`;
            }
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
    } catch (error) {
        console.error(`Feil ved lasting av ${category}:`, error);
        
        // Load fallback content
        const fallbackContent = getFallbackContent(category);
        contentElement.innerHTML = fallbackContent;
        console.log('Fallback content loaded for:', category);
    }
}

function formatCategoryContent(text) {
    // Format AI-generated content to HTML
    const paragraphs = text.split('\n\n');
    let formattedContent = '';
    
    paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
            // Check if it's a header
            if (/^[\d\w\s]+:/.test(paragraph.trim())) {
                const [header, ...content] = paragraph.split(':');
                formattedContent += `<h6 class="text-primary mt-3 mb-2">${header}:</h6>`;
                if (content.length > 0) {
                    formattedContent += `<p>${content.join(':').replace(/\n/g, '<br>')}</p>`;
                }
            } else {
                formattedContent += `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
            }
        }
    });
    
    return formattedContent;
}

function getFallbackContent(category) {
    const fallbackContent = {
        'magmatiske': `
            <p>Magmatiske bergarter dannes når magma eller lava avkjøles og størkner. De deles inn i to hovedtyper:</p>
            <h6 class="text-primary">Plutoniske bergarter</h6>
            <p>Dannet dypt i jordskorpen hvor magmaet avkjøles langsomt. Eksempler: granitt, gabbro, dioritt.</p>
            <h6 class="text-primary">Vulkanske bergarter</h6>
            <p>Dannet på jordoverflaten hvor lava avkjøles raskt. Eksempler: basalt, andesitt, obsidian.</p>
        `,
        'sedimentære': `
            <p>Sedimentære bergarter dannes av avleiringer som komprimeres og sementeres over tid. De deles inn i tre typer:</p>
            <h6 class="text-primary">Klastiske bergarter</h6>
            <p>Dannet av fragmenter fra andre bergarter. Eksempler: sandstein, konglomerat, mudderstein.</p>
            <h6 class="text-primary">Kjemiske bergarter</h6>
            <p>Dannet ved utfelling fra løsninger. Eksempler: kalkstein, gips, steinsalt.</p>
            <h6 class="text-primary">Organiske bergarter</h6>
            <p>Dannet av organisk materiale. Eksempler: kull, noen kalksteiner.</p>
        `,
        'metamorfe': `
            <p>Metamorfe bergarter dannes når eksisterende bergarter forandres av varme, trykk eller kjemiske prosesser.</p>
            <h6 class="text-primary">Kontaktmetamorfose</h6>
            <p>Forandring på grunn av varme fra magma. Eksempel: marmor fra kalkstein.</p>
            <h6 class="text-primary">Regional metamorfose</h6>
            <p>Forandring på grunn av trykk og varme over store områder. Eksempler: gneis, skifer.</p>
        `,
        'edelstener': `
            <p>Edelstener er sjeldne og verdifulle mineraler som brukes i smykker og samleobjekter.</p>
            <h6 class="text-primary">De fire store</h6>
            <p>Diamant, rubin, safir og smaragd regnes som de mest verdifulle edelsteinene.</p>
            <h6 class="text-primary">Halvedelstener</h6>
            <p>Inkluderer ametyst, citrin, turmalin, granater og mange andre.</p>
        `,
        'mineraler': `
            <p>Mineraler er naturlig forekommende uorganiske faste stoffer med bestemt kjemisk sammensetning og krystallstruktur.</p>
            <h6 class="text-primary">Vanlige mineraler</h6>
            <p>Kvarts, feltspat og glimmer er de mest vanlige mineralene i jordskorpen.</p>
            <h6 class="text-primary">Mineralegenskaper</h6>
            <p>Hardhet, spalting, glans og farge er viktige egenskaper for identifikasjon.</p>
        `,
        'meteoritter': `
            <p>Meteoritter er steinmateriale fra verdensrommet som har nådd jordoverflaten.</p>
            <h6 class="text-primary">Steinmeteoritter</h6>
            <p>Utgjør 90% av alle meteoritter. Inneholder silikater og ligner jordiske bergarter.</p>
            <h6 class="text-primary">Jernmeteoritter</h6>
            <p>Består hovedsakelig av jern og nikkel. Ofte magnetiske og tunge.</p>
            <h6 class="text-primary">Stein-jernmeteoritter</h6>
            <p>Sjeldne meteoritter med både stein og metallkomponenter.</p>
        `
    };
    
    return fallbackContent[category] || `<p class="text-muted">Innhold ikke tilgjengelig for ${category}.</p>`;
}

// Example card interactions
document.addEventListener('click', function(e) {
    if (e.target.closest('.example-card')) {
        const card = e.target.closest('.example-card');
        const title = card.querySelector('h6').textContent;
        
        // Animate card
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
        
        // Show info about the specific stone/mineral
        showStoneInfo(title);
        
        trackEvent('category', 'example_clicked', title);
    }
});

function showStoneInfo(stoneName) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-gradient text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-info-circle"></i>
                        ${stoneName}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Laster...</span>
                        </div>
                        <p class="mt-2">Henter informasjon om ${stoneName}...</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        Lukk
                    </button>
                    <button type="button" class="btn btn-primary" onclick="searchForStone('${stoneName}')">
                        <i class="fas fa-search"></i>
                        Identifiser lignende stein
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Load stone information
    loadStoneInformation(stoneName, modal.querySelector('.modal-body'));
    
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

async function loadStoneInformation(stoneName, container) {
    try {
        const response = await fetch('/api/kategori', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                kategori: `Detaljert informasjon om ${stoneName} stein/mineral` 
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                container.innerHTML = formatCategoryContent(result.resultat);
            } else {
                container.innerHTML = `<p>Kunne ikke laste informasjon om ${stoneName}.</p>`;
            }
        } else {
            throw new Error('API feil');
        }
        
    } catch (error) {
        container.innerHTML = getStoneInfoFallback(stoneName);
    }
}

function getStoneInfoFallback(stoneName) {
    const stoneInfo = {
        'Granitt': `
            <h6>Granitt</h6>
            <p>En plutonisk magmatisk bergart sammensatt av kvarts, feltspat og glimmer. Vanlig i kontinental jordskorpe.</p>
            <p><strong>Egenskaper:</strong> Middels til grov kornstørrelse, lys farge, hard (6-7 på Mohs skala).</p>
            <p><strong>Bruksområder:</strong> Byggemateriale, monumenter, benkeblater.</p>
        `,
        'Basalt': `
            <h6>Basalt</h6>
            <p>En vulkansk magmatisk bergart med fin kornstørrelse. Den vanligste bergarten på havbunnen.</p>
            <p><strong>Egenskaper:</strong> Mørk farge, fin kornstørrelse, kan være porøs.</p>
            <p><strong>Bruksområder:</strong> Veimateriale, betongaggregat.</p>
        `,
        'Marmor': `
            <h6>Marmor</h6>
            <p>En metamorf bergart dannet fra kalkstein eller dolomitt under varme og trykk.</p>
            <p><strong>Egenskaper:</strong> Middels hardhet (3-4), ofte året, kan være mange farger.</p>
            <p><strong>Bruksområder:</strong> Skulpturer, byggemateriale, dekorasjon.</p>
        `
        // Add more stone information as needed
    };
    
    return stoneInfo[stoneName] || `
        <h6>${stoneName}</h6>
        <p>Detaljert informasjon om ${stoneName} er ikke tilgjengelig offline.</p>
        <p>Bruk identifikasjonsfunksjonen for å lære mer om lignende steiner.</p>
    `;
}

function searchForStone(stoneName) {
    // Navigate to identifikator with pre-filled information
    const url = new URL('/identifikator', window.location.origin);
    url.searchParams.set('stone_type', stoneName);
    window.location.href = url.toString();
}

// Smooth scrolling for category navigation
function scrollToCategory(categoryId) {
    const element = document.getElementById(categoryId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Search functionality within categories
function setupCategorySearch() {
    const searchInput = document.getElementById('categorySearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const categoryDetails = document.querySelectorAll('.category-detail');
        
        categoryDetails.forEach(detail => {
            const content = detail.textContent.toLowerCase();
            const examples = detail.querySelectorAll('.example-card');
            
            let hasMatch = content.includes(searchTerm);
            
            examples.forEach(example => {
                const exampleText = example.textContent.toLowerCase();
                if (exampleText.includes(searchTerm)) {
                    hasMatch = true;
                    example.style.backgroundColor = '#fff3cd';
                } else {
                    example.style.backgroundColor = '';
                }
            });
            
            detail.style.display = hasMatch || searchTerm === '' ? 'block' : 'none';
        });
    });
}

// Export functions
window.KategorierApp = {
    filterCategories,
    scrollToCategory,
    searchForStone
};