// Simple proxy to TheMovieDB to avoid exposing the API key in the client
// This file is intended for serverless platforms (Vercel/Netlify functions).
// Expects a query parameter `endpoint`, for example: endpoint=search/movie&query=Inception
// The function forwards any other query parameters to TMDB and forces language=pt-BR

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    const { endpoint } = req.query || {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint query parameter is required' });

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'TMDB API key not configured on server' });

    // sanitize endpoint (remove leading slashes)
    const ep = endpoint.replace(/^\/+/, '');

    const url = new URL(`https://api.themoviedb.org/3/${ep}`);

    // copy other query params
    Object.keys(req.query || {}).forEach(k => {
      if (k === 'endpoint') return;
      url.searchParams.set(k, req.query[k]);
    });

    url.searchParams.set('api_key', apiKey);
    // prefer pt-BR unless caller overrides
    if (!url.searchParams.has('language')) url.searchParams.set('language', 'pt-BR');

    const resp = await fetch(url.toString());
    const contentType = resp.headers.get('content-type') || '';
    const body = await resp.text();

    // forward status and body
    if (contentType.includes('application/json')) {
      try {
        return res.status(resp.status).json(JSON.parse(body));
      } catch (e) {
        return res.status(resp.status).send(body);
      }
    }

    return res.status(resp.status).send(body);
  } catch (err) {
    console.error('tmdb proxy error', err);
    return res.status(500).json({ error: 'internal server error' });
  }
};
