const API_BASE_URL = 'http://localhost:8000';
let currentContext = null;
let chatMessages = [];

// ---------- Toast ----------
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container') ||
        document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toast-container', className: 'toast-container' }));
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    if (type === 'error') toast.style.borderLeftColor = '#E74C3C';
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3800);
}

// ---------- Navigation ----------
function navigateToPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (!page) {
        console.error(`Page ${pageId} introuvable`);
        return;
    }
    page.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (activeLink) activeLink.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Recharger les contenus dynamiques de l'accueil
    if (pageId === 'home') {
        loadTrendingWordCloud();
        loadTrendingHashtags();
    }
}

// ---------- API ----------
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `Erreur ${res.status}`);
    }
    return await res.json();
}

// ---------- Initialisation ----------
document.addEventListener('DOMContentLoaded', () => {
    // Liens navbar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            navigateToPage(link.dataset.page);
        });
    });

    // Boutons
    document.getElementById('load-news-btn')?.addEventListener('click', loadMosaiqueNews);
    document.getElementById('analyze-btn')?.addEventListener('click', analyzeProduct);
    document.getElementById('send-message-btn')?.addEventListener('click', sendChatMessage);
    document.getElementById('chat-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendChatMessage();
    });
    document.getElementById('load-suggestions-btn')?.addEventListener('click', loadSuggestions);

    // Compteur API (optionnel)
    const counterSpan = document.createElement('span');
    counterSpan.id = 'api-counter';
    counterSpan.style.cssText = 'margin-left:12px; font-size:0.8rem; color:var(--gold);';
    document.querySelector('.navbar-brand')?.appendChild(counterSpan);

    // Chargements initiaux de l'accueil
    loadTrendingWordCloud();
    loadTrendingHashtags();
});

// ---------- Accueil : nuage de mots-clés ----------
async function loadTrendingWordCloud() {
    const container = document.getElementById('wordcloud-container');
    if (!container) return;
    try {
        const data = await apiCall('/api/trending-keywords');
        const keywords = data.keywords || [];
        if (!keywords.length) {
            container.innerHTML = '<p style="text-align:center; color:var(--text);">Aucun mot-clé tendance disponible.</p>';
            return;
        }
        const maxWeight = Math.max(...keywords.map(k => k.weight), 1);
        let html = '<div class="wordcloud">';
        keywords.sort(() => Math.random() - 0.5);
        keywords.forEach(k => {
            const size = 0.9 + (k.weight / maxWeight) * 1.3;
            const rotation = Math.floor(Math.random() * 10) - 5;
            html += `<span class="wordcloud-item" style="font-size:${size.toFixed(1)}rem; transform:rotate(${rotation}deg)">${k.word}</span>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p style="text-align:center; color:#E74C3C;">Erreur de chargement des mots-clés.</p>';
        console.error(e);
    }
}

// ---------- Accueil : hashtags dynamiques ----------
async function loadTrendingHashtags() {
    const container = document.getElementById('hashtags-container');
    if (!container) return;
    try {
        const data = await apiCall('/api/trending-hashtags');
        const hashtags = data.hashtags || [];
        if (!hashtags.length) {
            container.innerHTML = '<p style="text-align:center; color:var(--text);">Aucun hashtag disponible.</p>';
            return;
        }
        container.innerHTML = hashtags.map(tag =>
            `<span class="keyword-tag">#${tag.replace(/^#/, '')}</span>`
        ).join('');
    } catch (e) {
        container.innerHTML = '<p style="text-align:center; color:#E74C3C;">Erreur de chargement des hashtags.</p>';
        console.error(e);
    }
}

// ---------- Actualités ----------
async function loadMosaiqueNews() {
    const btn = document.getElementById('load-news-btn');
    if (!btn) return;
    const container = document.getElementById('news-container');
    if (!container) return;
    btn.disabled = true;
    btn.textContent = 'Chargement...';
    try {
        const data = await apiCall('/api/news/mosaique');
        container.innerHTML = data.articles.map(article => `
            <div class="article-block">
                <h3>${article.title}</h3>
                <p>${article.snippet || ''}</p>
                <div style="display:flex; gap:12px; margin-top:12px;">
                    <button class="btn btn-secondary btn-verify" data-url="${article.link}" onclick="verifyArticle(this.dataset.url, this)">Vérifier source</button>
                </div>
                <div class="verify-result" style="display:none; margin-top:12px;"></div>
            </div>
        `).join('');
        showToast(`${data.count} actualités chargées`);
    } catch (e) {
        container.innerHTML = `<div class="card" style="color:#E74C3C;">Erreur : ${e.message}</div>`;
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Charger les dernières actualités';
    }
}

async function verifyArticle(url, btnElement) {
    const block = btnElement.closest('.article-block');
    if (!block) return;
    const verifyDiv = block.querySelector('.verify-result');
    if (!verifyDiv) return;
    btnElement.disabled = true;
    btnElement.textContent = 'Vérification...';
    verifyDiv.style.display = 'none';
    const trustedSources = ['mosaiquefm.net', 'mosaique.tn', 'bbc.com', 'reuters.com', 'france24.com', 'aljazeera.com'];
    try {
        const domain = new URL(url).hostname.replace('www.', '');
        const trusted = trustedSources.some(s => domain.includes(s));
        verifyDiv.innerHTML = trusted ?
            `<div style="padding:12px; border-left:4px solid #2E7D32; background:rgba(0,0,0,0.02); border-radius:0 8px 8px 0; margin-top:8px;">
                <strong style="color:#2E7D32;">✓ Source vérifiée: ${domain}</strong>
                <p style="margin:8px 0 0;">Cette source est dans notre liste de sources fiables.</p>
            </div>` :
            `<div style="padding:12px; border-left:4px solid #F59E0B; background:rgba(0,0,0,0.02); border-radius:0 8px 8px 0; margin-top:8px;">
                <strong style="color:#F59E0B;">⚠ Source non vérifiée</strong>
                <p style="margin:8px 0 0;">Cette source ne figure pas dans notre liste.</p>
            </div>`;
        verifyDiv.style.display = 'block';
    } catch (e) {
        verifyDiv.innerHTML = `<div style="color:#C62828;">Erreur: ${e.message}</div>`;
        verifyDiv.style.display = 'block';
    } finally {
        btnElement.disabled = false;
        btnElement.textContent = 'Vérifier';
    }
}

// ---------- Promotion ----------
async function analyzeProduct() {
    const domainEl = document.getElementById('product-domain');
    const themeEl = document.getElementById('product-theme');
    const targetEl = document.getElementById('target-audience');
    const budgetEl = document.getElementById('budget');
    const formatEl = document.getElementById('content-format');
    const objectiveEl = document.getElementById('objective');
    if (!domainEl || !themeEl || !targetEl || !budgetEl || !formatEl || !objectiveEl) {
        showToast('Formulaire incomplet', 'error'); return;
    }
    const domain = domainEl.value;
    const theme = themeEl.value.trim();
    const target = targetEl.value;
    const budget = budgetEl.value;
    const format = formatEl.value;
    const objective = objectiveEl.value;
    if (!domain || !theme || !target || !budget || !format || !objective) {
        showToast('Veuillez remplir tous les champs', 'error'); return;
    }

    const btn = document.getElementById('analyze-btn');
    const progress = document.getElementById('analyze-progress');
    const fill = document.getElementById('progress-fill');
    if (!btn || !progress || !fill) { showToast('Problème d\'interface', 'error'); return; }

    btn.disabled = true;
    btn.textContent = 'Analyse en cours...';
    progress.style.display = 'block';
    fill.style.width = '0%';
    let width = 0;
    const interval = setInterval(() => {
        width += 15;
        fill.style.width = width + '%';
        if (width >= 100) clearInterval(interval);
    }, 200);

    try {
        const result = await apiCall('/api/promote', 'POST', {
            domain: `${domain} - Public: ${target}, Budget: ${budget}, Format: ${format}, Objectif: ${objective}`,
            theme
        });
        currentContext = {
            domain: result.domain, theme: result.theme,
            strategy: result.strategy, contextId: result.context_id,
            details: { target, budget, format, objective }
        };
        chatMessages = [];

        const resultsDiv = document.getElementById('promote-results');
        if (resultsDiv) resultsDiv.style.display = 'block';

        const kwEl = document.getElementById('keywords-list');
        if (kwEl) kwEl.innerHTML = result.keywords.split(',').map(k => `<span class="keyword-tag">${k.trim()}</span>`).join('');

        const stratEl = document.getElementById('strategy-text');
        if (stratEl) stratEl.textContent = result.strategy;

        const chatEl = document.getElementById('chat-messages');
        if (chatEl) chatEl.innerHTML = '';

        loadInfluencers(domain, theme);
        showToast('Stratégie générée avec succès');
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        clearInterval(interval);
        if (fill) fill.style.width = '100%';
        if (progress) setTimeout(() => { progress.style.display = 'none'; }, 400);
        if (btn) { btn.disabled = false; btn.textContent = 'Analyser et générer la stratégie'; }
    }
}

async function loadInfluencers(domain, theme) {
    const card = document.getElementById('influencers-card');
    const content = document.getElementById('influencers-content');
    if (!card || !content) return;
    try {
        const data = await apiCall(`/api/influencers?domain=${encodeURIComponent(domain)}&theme=${encodeURIComponent(theme)}`);
        if (!data.influencers || !data.influencers.length) {
            content.innerHTML = '<p>Aucun influenceur trouvé.</p>';
            card.style.display = 'block';
            return;
        }
        let html = '<div class="influencer-grid">';
        data.influencers.forEach(inf => {
            html += `
                <div class="influencer-card">
                    <span class="platform-badge">${inf.plateforme || 'Réseau social'}</span>
                    <h3>${inf.nom || 'Influenceur'}</h3>
                    <div class="reach">👥 ${inf.abonnes || 'N/A'} abonnés</div>
                    <div class="content-type">${inf.type_contenu || ''}</div>
                    <div class="relevance">💡 ${inf.pertinence || ''}</div>
                </div>
            `;
        });
        html += '</div>';
        content.innerHTML = html;
        card.style.display = 'block';
    } catch (e) {
        content.innerHTML = '<p>Influenceurs non disponibles.</p>';
        card.style.display = 'block';
        showToast('Erreur influenceurs', 'error');
    }
}

// ---------- Chat ----------
function displayChatMessage(role, content) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = `<div class="bubble">${content.replace(/\n/g, '<br>')}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const btn = document.getElementById('send-message-btn');
    const container = document.getElementById('chat-messages');
    if (!input || !btn || !container) return;
    const msg = input.value.trim();
    if (!msg || !currentContext) { showToast('Générez d\'abord une stratégie', 'error'); return; }

    chatMessages.push({ role: 'user', content: msg });
    displayChatMessage('user', msg);
    input.value = '';
    btn.disabled = true;

    const loader = document.createElement('div');
    loader.className = 'chat-msg assistant';
    loader.innerHTML = '<div class="bubble"><div class="spinner"></div> Analyse...</div>';
    container.appendChild(loader);

    try {
        const resp = await apiCall('/api/chat', 'POST', {
            domain: currentContext.domain,
            theme: currentContext.theme,
            product_context: currentContext.strategy,
            messages: chatMessages
        });
        chatMessages.push({ role: 'assistant', content: resp.response });
        loader.remove();
        displayChatMessage('assistant', resp.response);
    } catch (e) {
        loader.remove();
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function loadSuggestions() {
    const btn = document.getElementById('load-suggestions-btn');
    if (!btn) return;
    const container = document.getElementById('suggestions-container');
    const textDiv = document.getElementById('suggestions-text');
    if (!container || !textDiv) return;

    btn.disabled = true;
    btn.textContent = 'Analyse en cours...';
    try {
        const data = await apiCall('/api/products/suggested');
        if (!data.suggestions) {
            textDiv.innerHTML = '<p>Aucune suggestion disponible.</p>';
            container.style.display = 'block';
            return;
        }

        // Si les suggestions sont un tableau d'objets → cartes
        if (Array.isArray(data.suggestions)) {
            if (data.suggestions.length === 0) {
                textDiv.innerHTML = '<p>Aucune suggestion générée.</p>';
                container.style.display = 'block';
                return;
            }
            let html = '<div class="suggestions-grid">';
            data.suggestions.forEach(s => {
                html += `
                    <div class="suggestion-card">
                        <h3>${s.nom || 'Produit'}</h3>
                        <div class="reason">${s.pourquoi || ''}</div>
                        <span class="audience">🎯 ${s.public_cible || 'Public large'}</span>
                        <span class="potential">📈 ${s.potentiel || 'N/A'}</span>
                    </div>
                `;
            });
            html += '</div>';
            textDiv.innerHTML = html;
        } else {
            // Sinon, on affiche le texte brut (cas d'une vieille version du backend)
            textDiv.innerHTML = `<div style="white-space: pre-wrap; line-height:1.7;">${data.suggestions}</div>`;
        }

        container.style.display = 'block';
        showToast('Suggestions prêtes');
    } catch (e) {
        textDiv.innerHTML = `<div class="card" style="color:#E74C3C;">Erreur : ${e.message}</div>`;
        container.style.display = 'block';
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Analyser les tendances';
    }
}