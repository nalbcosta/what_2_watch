let movieNameRef = document.getElementById('movie-name');
let searchButton = document.getElementById('search-button');
let result = document.getElementById('result');
const suggestionsBox = document.getElementById('suggestions');
const btnSpinner = document.getElementById('btn-spinner');
const btnText = document.getElementById('btn-text');
// small SVG placeholder encoded at runtime
const PLACEHOLDER_POSTER = (() => {
    const svg = `
        <svg xmlns='http://www.w3.org/2000/svg' width='300' height='450'>
            <rect width='100%' height='100%' fill='#f3f3f3'/>
            <text x='50%' y='50%' font-size='20' text-anchor='middle' fill='#999' dy='.3em'>Sem imagem</text>
        </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
})();
const recentListEl = document.getElementById('recent-list');
const favoritesListEl = document.getElementById('favorites-list');
const watchedListEl = document.getElementById('watched-list');
const clearRecentBtn = document.getElementById('clear-recent');

// debounce helper
const debounce = (fn, wait = 300) => {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
};

let activeSuggestion = -1;
let currentSuggestions = [];

// Local storage keys
const LS_RECENT = 'w2w_recent';
const LS_FAV = 'w2w_favorites';
const LS_WATCHED = 'w2w_watched';

// Load lists from localStorage or init
let recent = JSON.parse(localStorage.getItem(LS_RECENT) || '[]');
let favorites = JSON.parse(localStorage.getItem(LS_FAV) || '[]');
let watched = JSON.parse(localStorage.getItem(LS_WATCHED) || '[]');

const saveState = () => {
    localStorage.setItem(LS_RECENT, JSON.stringify(recent));
    localStorage.setItem(LS_FAV, JSON.stringify(favorites));
    localStorage.setItem(LS_WATCHED, JSON.stringify(watched));
};

const addToRecent = (title, id) => {
    // avoid duplicates, keep max 12
    recent = [{ title, id }, ...recent.filter(r => r.id !== id)].slice(0, 12);
    saveState();
    renderRecent();
};

const toggleFavorite = (movie) => {
    const exists = favorites.find(f => f.id === movie.id);
    if (exists) favorites = favorites.filter(f => f.id !== movie.id);
    else favorites = [{ title: movie.title, id: movie.id }, ...favorites].slice(0, 40);
    saveState();
    renderFavorites();
};

const toggleWatched = (movie) => {
    const exists = watched.find(w => w.id === movie.id);
    if (exists) watched = watched.filter(w => w.id !== movie.id);
    else watched = [{ title: movie.title, id: movie.id }, ...watched].slice(0, 40);
    saveState();
    renderWatched();
};

const renderRecent = () => {
    if (!recentListEl) return;
    recentListEl.innerHTML = '';
    recent.forEach(r => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="meta">${r.title}</div>
            <div class="actions">
                <button class="icon-btn" data-id="${r.id}" data-title="${r.title}" title="Pesquisar novamente"><i class="fa-solid fa-arrow-rotate-right"></i></button>
            </div>
        `;
        li.querySelector('.icon-btn').addEventListener('click', (e) => {
            movieNameRef.value = r.title;
            getMovie();
        });
        recentListEl.appendChild(li);
    });
};

const renderFavorites = () => {
    if (!favoritesListEl) return;
    favoritesListEl.innerHTML = '';
    favorites.forEach(f => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="meta">${f.title}</div>
            <div class="actions">
                <button class="icon-btn" data-id="${f.id}" title="Abrir"><i class="fa-solid fa-up-right-from-square"></i></button>
                <button class="icon-btn" data-id="${f.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        li.querySelectorAll('.icon-btn')[0].addEventListener('click', () => {
            movieNameRef.value = f.title;
            getMovie();
        });
        li.querySelectorAll('.icon-btn')[1].addEventListener('click', () => {
            favorites = favorites.filter(x => x.id !== f.id);
            saveState();
            renderFavorites();
        });
        favoritesListEl.appendChild(li);
    });
};

const renderWatched = () => {
    if (!watchedListEl) return;
    watchedListEl.innerHTML = '';
    watched.forEach(w => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="meta">${w.title}</div>
            <div class="actions">
                <button class="icon-btn" data-id="${w.id}" title="Pesquisar novamente"><i class="fa-solid fa-arrow-rotate-right"></i></button>
                <button class="icon-btn" data-id="${w.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        li.querySelectorAll('.icon-btn')[0].addEventListener('click', () => {
            movieNameRef.value = w.title;
            getMovie();
        });
        li.querySelectorAll('.icon-btn')[1].addEventListener('click', () => {
            watched = watched.filter(x => x.id !== w.id);
            saveState();
            renderWatched();
        });
        watchedListEl.appendChild(li);
    });
};

// clear recent handler
if (clearRecentBtn) clearRecentBtn.addEventListener('click', () => {
    recent = [];
    saveState();
    renderRecent();
});

// initial render
renderRecent();
renderFavorites();
renderWatched();

const renderSuggestions = (items) => {
    suggestionsBox.innerHTML = '';
    if (!items || !items.length) {
        suggestionsBox.classList.remove('visible');
        suggestionsBox.setAttribute('aria-hidden', 'true');
        return;
    }
    items.forEach((m, idx) => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.dataset.index = idx;
        div.innerHTML = `
            <div class="suggestion-thumb" style="background-image: url(${m.poster_path ? 'https://image.tmdb.org/t/p/w92' + m.poster_path : 'placeholder.png'})"></div>
            <div class="suggestion-meta">
                <div class="suggestion-title">${m.title}</div>
                <div class="suggestion-year">${m.release_date ? new Date(m.release_date).getFullYear() : 'N/D'}</div>
            </div>
        `;
        div.addEventListener('click', () => {
            movieNameRef.value = m.title;
            clearSuggestions();
            getMovie();
        });
        suggestionsBox.appendChild(div);
    });
    activeSuggestion = -1;
    currentSuggestions = items;
    suggestionsBox.classList.add('visible');
    suggestionsBox.setAttribute('aria-hidden', 'false');
};

const clearSuggestions = () => {
    suggestionsBox.innerHTML = '';
    suggestionsBox.classList.remove('visible');
    suggestionsBox.setAttribute('aria-hidden', 'true');
    activeSuggestion = -1;
    currentSuggestions = [];
};

const fetchSuggestions = async (query) => {
    if (!query || query.trim().length === 0) {
        clearSuggestions();
        return;
    }
    try {
    // use serverless proxy for suggestions too
    const url = `/api/tmdb?endpoint=search/movie&query=${encodeURIComponent(query)}&include_adult=false&page=1`;
    const resp = await fetch(url);
    const data = await resp.json();
        const items = (data.results || []).slice(0, 7);
        renderSuggestions(items);
    } catch (err) {
        console.error('Sugestões erro', err);
        clearSuggestions();
    }
};

movieNameRef.addEventListener('input', debounce((e) => {
    fetchSuggestions(e.target.value);
}, 250));

movieNameRef.addEventListener('keydown', (e) => {
    const items = suggestionsBox.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSuggestion = Math.min(activeSuggestion + 1, items.length - 1);
        items.forEach(i => i.classList.remove('highlight'));
        items[activeSuggestion].classList.add('highlight');
        items[activeSuggestion].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSuggestion = Math.max(activeSuggestion - 1, 0);
        items.forEach(i => i.classList.remove('highlight'));
        items[activeSuggestion].classList.add('highlight');
        items[activeSuggestion].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        if (activeSuggestion >= 0) {
            e.preventDefault();
            items[activeSuggestion].click();
        } else {
            clearSuggestions();
            getMovie();
        }
    } else if (e.key === 'Escape') {
        clearSuggestions();
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrap')) clearSuggestions();
});

// show skeleton while loading details
const showSkeleton = () => {
    result.innerHTML = `
        <div class="skeleton-card">
            <div class="skeleton-thumb skeleton"></div>
            <div class="skeleton-lines">
                <div class="skeleton-line skeleton" style="width:60%"></div>
                <div class="skeleton-line skeleton" style="width:40%"></div>
                <div class="skeleton-line skeleton" style="width:90%"></div>
                <div class="skeleton-line skeleton" style="width:80%"></div>
            </div>
        </div>
    `;
};

// toggle search button spinner
const setBtnLoading = (loading) => {
    if (loading) {
        btnSpinner.classList.remove('hidden');
        btnText.textContent = 'Buscando...';
        searchButton.setAttribute('disabled', 'disabled');
        searchButton.style.opacity = '0.85';
    } else {
        btnSpinner.classList.add('hidden');
        btnText.textContent = 'Pesquisar';
        searchButton.removeAttribute('disabled');
        searchButton.style.opacity = '';
    }
};

let getMovie = async () => {
    let movieName = movieNameRef.value.trim();

    if (movieName.length <= 0) {
        result.innerHTML = `<h3 class= "msg">Por favor informe o nome de um filme</h3>`;
        return
    }

    result.innerHTML = `<h3 class="msg">Buscando "${movieName}"...</h3>`;
    setBtnLoading(true);
    showSkeleton();

    try {
        // use serverless proxy to avoid exposing API key
        const searchURL = `/api/tmdb?endpoint=search/movie&query=${encodeURIComponent(movieName)}&include_adult=false&page=1`;
        const searchResponse = await fetch(searchURL);
        const searchData = await searchResponse.json();

        if (!searchData.results || searchData.results.length === 0) {
            result.innerHTML = `<h3 class="msg">Nenhum filme encontrado com o nome "${movieName}"</h3>`;
            setBtnLoading(false);
            return;
        }

        const movie = searchData.results[0];
        const id = movie.id;

        const detailsUrl = `/api/tmdb?endpoint=movie/${id}`;
        const creditsUrl = `/api/tmdb?endpoint=movie/${id}/credits`;
        const videosUrl = `/api/tmdb?endpoint=movie/${id}/videos`;

        const [detailsResp, creditsResp, videosResp] = await Promise.all([
            fetch(detailsUrl),
            fetch(creditsUrl),
            fetch(videosUrl)
        ]);

        const details = await detailsResp.json();
        const credits = await creditsResp.json();
        const videos = await videosResp.json();

        const poster = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : 'placeholder.png';
        const titulo = details.title || details.original_title || movie.title;
        const avaliacao = details.vote_average ? `${details.vote_average.toFixed(1)} / 10 (${details.vote_count || 0} votos)` : 'Sem avaliação';
        const generos = (details.genres || []).map(g => g.name).join(' • ') || 'N/D';
        const duracao = details.runtime ? `${details.runtime} min` : 'N/D';
        const lancamento = details.release_date ? new Date(details.release_date).toLocaleDateString('pt-BR') : 'N/D';
        const sinopse = details.overview || 'Sinopse não disponível.';
        const elenco = (credits.cast || []).slice(0, 6).map(c => c.name + (c.character ? ` (${c.character.split('/')[0]})` : '')).join(', ') || 'N/D';
        const diretor = (credits.crew || []).find(p => p.job === 'Director')?.name || 'N/D';
        const trailer = (videos.results || []).find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        const trailerLink = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

        result.innerHTML = `
        <div class="info fadeIn">
                <img src="${poster || PLACEHOLDER_POSTER}" class="poster" alt="Poster de ${titulo}" onerror="this.src='${PLACEHOLDER_POSTER}'"/>
                <div>
                    <h2>${titulo}</h2>
                    <div class="rating">
                        <img src="star.svg" alt="estrela">
                        <h4>${avaliacao}</h4>
                    </div>
                    <div class="details">
                        <span>${generos}</span>
                        <span>•</span>
                        <span>${duracao}</span>
                        <span>•</span>
                        <span>${lancamento}</span>
                    </div>
                    <div class="details" style="margin-top:0.4em;font-weight:300;">
                        <span>Direção: ${diretor}</span>
                    </div>
                    <div class="controls" style="margin-top:0.8rem; display:flex; gap:0.6rem; align-items:center">
                        <button id="fav-btn" class="icon-btn" title="Favoritar"><i class="fa-solid fa-heart"></i> Favoritar</button>
                        <button id="watched-btn" class="icon-btn" title="Marcar como assistido"><i class="fa-solid fa-eye"></i> Assistido</button>
                        ${trailerLink ? `<a class="small-link" href="${trailerLink}" target="_blank" rel="noopener">Assistir trailer</a>` : ''}
                    </div>
                </div>
            </div>

            <h3>Sinopse</h3>
            <p>${sinopse}</p>

            <h3>Elenco (principais)</h3>
            <p>${elenco}</p>
        `;

        // add to recent searches
        try { addToRecent(titulo, id); } catch (e) { console.warn('addToRecent failed', e); }

        // attach handlers to new buttons and reflect persistent state
        const favBtn = document.getElementById('fav-btn');
        const watchedBtn = document.getElementById('watched-btn');

        const isFav = favorites.find(x => x.id === id);
        const isWatched = watched.find(x => x.id === id);
        if (favBtn) {
            if (isFav) favBtn.classList.add('toggled');
            favBtn.addEventListener('click', () => {
                toggleFavorite({ id, title: titulo });
                favBtn.classList.toggle('toggled');
            });
        }
        if (watchedBtn) {
            if (isWatched) watchedBtn.classList.add('toggled');
            watchedBtn.addEventListener('click', () => {
                toggleWatched({ id, title: titulo });
                watchedBtn.classList.toggle('toggled');
            });
        }

        // open modal with full details on poster click
        const posterEl = document.querySelector('.poster');
        if (posterEl) {
            posterEl.style.cursor = 'pointer';
            posterEl.addEventListener('click', () => openModal(details, credits, videos));
        }

        // Modal functions
        const modal = document.getElementById('modal');
        const modalBackdrop = document.getElementById('modal-backdrop');
        const modalContent = document.getElementById('modal-content');
        const modalClose = document.getElementById('modal-close');

        const openModal = (details, credits, videos) => {
            if (!modal) return;
            modal.setAttribute('aria-hidden', 'false');
            // build modal content
            const poster = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : PLACEHOLDER_POSTER;
            const elencoFull = (credits.cast || []).slice(0, 12).map(c => `${c.name} ${c.character ? `— ${c.character.split('/')[0]}` : ''}`).join(', ');
            const trailer = (videos.results || []).find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
            const trailerEmbed = trailer ? `<iframe width="560" height="315" src="https://www.youtube.com/embed/${trailer.key}" title="Trailer" frameborder="0" allowfullscreen></iframe>` : '';

            modalContent.innerHTML = `
                <div class="modal-header">
                    <img src="${poster}" alt="Poster">
                    <div>
                        <h2 id="modal-title">${details.title}</h2>
                        <p style="margin:0.3rem 0; color:#4b2e6f">${details.tagline || ''}</p>
                        <p style="font-weight:600">${details.vote_average ? `Avaliação: ${details.vote_average.toFixed(1)} / 10` : ''}</p>
                        <p style="margin-top:0.6rem">${details.overview || ''}</p>
                    </div>
                </div>
                <hr style="margin:0.8rem 0">
                <div><strong>Elenco:</strong> ${elencoFull}</div>
                <div style="margin-top:0.8rem">${trailerEmbed}</div>
            `;
        };

        const closeModal = () => {
            if (!modal) return;
            modal.setAttribute('aria-hidden', 'true');
            modalContent.innerHTML = '';
        };

        if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
        if (modalClose) modalClose.addEventListener('click', closeModal);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    }
    catch (error) {
        console.error(error);
        result.innerHTML = `<h3 class="msg">Erro ao buscar informações do filme. Por favor, tente novamente mais tarde.</h3>`;
    } finally {
        setBtnLoading(false);
        clearSuggestions();
    }
};

searchButton.addEventListener("click", getMovie);
window.addEventListener("load", getMovie);
