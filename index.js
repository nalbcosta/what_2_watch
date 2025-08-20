let movieNameRef = document.getElementById('movie-name');
let searchButton = document.getElementById('search-button');
let result = document.getElementById('result');
const API_KEY = config.API_KEY;

let getMovie = async () =>{
    let movieName = movieNameRef.value.trim();

    if(movieName.length <= 0){
        result.innerHTML = `<h3 class= "msg">Por favor informe o nome de um filme</h3>`;
        return
    }

    result.innerHTML = `<h3 class="msg">Buscando "${movieName}"...</h3>`;

    try {
        const searchURL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(movieName)}&language=pt-BR`;
        const searchResponse = await fetch(searchURL);
        const searchData = await searchResponse.json();

        if(!searchData.results || searchData.results.length === 0) {
            result.innerHTML = `<h3 class="msg">Nenhum filme encontrado com o nome "${movieName}"</h3>`;
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
        const trailer = (videos.results || []).find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        const trailerLink = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

        result.innerHTML = `
        <div class="info">
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
    }
};

searchButton.addEventListener("click", getMovie);
window.addEventListener("load", getMovie);
