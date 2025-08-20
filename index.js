let movieNameRef = document.getElementById('movie-name');
let searchButton = document.getElementById('search-button');
let result = document.getElementById('result');
const suggestionsBox = document.getElementById('suggestions');
const btnSpinner = document.getElementById('btn-spinner');
const btnText = document.getElementById('btn-text');
const API_KEY = config.API_KEY;

// debounce helper
const debounce = (fn, wait=300) => {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
};

let activeSuggestion = -1;
let currentSuggestions = [];

const renderSuggestions = (items) => {
    suggestionsBox.innerHTML = '';
    if(!items || !items.length){
        suggestionsBox.classList.remove('visible');
        suggestionsBox.setAttribute('aria-hidden','true');
        return;
    }
    items.forEach((m, idx) => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.dataset.index = idx;
        div.innerHTML = `
            <div class="suggestion-thumb" style="background-image: url(${m.poster_path ? 'https://image.tmdb.org/t/p/w92'+m.poster_path : 'placeholder.png'})"></div>
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
    suggestionsBox.setAttribute('aria-hidden','false');
};

const clearSuggestions = () => {
    suggestionsBox.innerHTML = '';
    suggestionsBox.classList.remove('visible');
    suggestionsBox.setAttribute('aria-hidden','true');
    activeSuggestion = -1;
    currentSuggestions = [];
};

const fetchSuggestions = async (query) => {
    if(!query || query.trim().length === 0) {
        clearSuggestions();
        return;
    }
    try {
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR&include_adult=false&page=1`;
        const resp = await fetch(url);
        const data = await resp.json();
        const items = (data.results || []).slice(0,7);
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
    if(items.length === 0) return;
    if(e.key === 'ArrowDown'){
        e.preventDefault();
        activeSuggestion = Math.min(activeSuggestion + 1, items.length -1);
        items.forEach(i => i.classList.remove('highlight'));
        items[activeSuggestion].classList.add('highlight');
        items[activeSuggestion].scrollIntoView({block: 'nearest'});
    } else if(e.key === 'ArrowUp'){
        e.preventDefault();
        activeSuggestion = Math.max(activeSuggestion - 1, 0);
        items.forEach(i => i.classList.remove('highlight'));
        items[activeSuggestion].classList.add('highlight');
        items[activeSuggestion].scrollIntoView({block: 'nearest'});
    } else if(e.key === 'Enter'){
        if(activeSuggestion >= 0){
            e.preventDefault();
            items[activeSuggestion].click();
        } else {
            clearSuggestions();
            getMovie();
        }
    } else if(e.key === 'Escape'){
        clearSuggestions();
    }
});

document.addEventListener('click', (e) => {
    if(!e.target.closest('.input-wrap')) clearSuggestions();
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
    if(loading){
        btnSpinner.classList.remove('hidden');
        btnText.textContent = 'Buscando...';
        searchButton.setAttribute('disabled','disabled');
        searchButton.style.opacity = '0.85';
    } else {
        btnSpinner.classList.add('hidden');
        btnText.textContent = 'Pesquisar';
        searchButton.removeAttribute('disabled');
        searchButton.style.opacity = '';
    }
};

let getMovie = async () =>{
    let movieName = movieNameRef.value.trim();

    if(movieName.length <= 0){
        result.innerHTML = `<h3 class= "msg">Por favor informe o nome de um filme</h3>`;
        return
    }

    result.innerHTML = `<h3 class="msg">Buscando "${movieName}"...</h3>`;
    setBtnLoading(true);
    showSkeleton();

    try {
        const searchURL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(movieName)}&language=pt-BR`;
        const searchResponse = await fetch(searchURL);
        const searchData = await searchResponse.json();

        if(!searchData.results || searchData.results.length === 0) {
            result.innerHTML = `<h3 class="msg">Nenhum filme encontrado com o nome "${movieName}"</h3>`;
            setBtnLoading(false);
            return;
        }

        const movie = searchData.results[0];
        const id = movie.id;

        const detailsUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=pt-BR`;
        const creditsUrl = `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${API_KEY}&language=pt-BR`;
        const videosUrl = `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${API_KEY}&language=pt-BR`;

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
        const elenco = (credits.cast || []).slice(0,6).map(c => c.name + (c.character ? ` (${c.character.split('/')[0]})` : '')).join(', ') || 'N/D';
        const diretor = (credits.crew || []).find(p => p.job === 'Director')?.name || 'N/D';
        const trailer = (videos.results || []).find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        const trailerLink = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

        result.innerHTML = `
        <div class="info fadeIn">
                <img src="${poster}" class="poster" alt="Poster de ${titulo}">
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
                </div>
            </div>

            <h3>Sinopse</h3>
            <p>${sinopse}</p>

            <h3>Elenco (principais)</h3>
            <p>${elenco}</p>

            ${trailerLink ? `<p><a href="${trailerLink}" target="_blank" rel="noopener">Assistir trailer</a></p>` : ''}
        `;
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
