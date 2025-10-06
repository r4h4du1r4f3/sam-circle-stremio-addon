const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const env = require('dotenv');
const { movieRouter, seriesRouter, } = require('./router')

env.config();

// Configuration
const OMDB_API_KEY = process.env.OMDB_API_KEY; // Get free key from http://www.omdbapi.com/apikey.aspx
const PORT = process.env.PORT || 7000;

// Manifest - describes the addon
const manifest = {
    id: 'com.index.movies',
    version: '1.0.0',
    name: 'HTTP Index Movies',
    description: 'Streams movies from an HTTP directory index',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: [], // Empty catalog - we only provide streams
    idPrefixes: ['tt', 'tmdb'] // Support IMDB and TMDB IDs
};

const builder = new addonBuilder(manifest);

// Normalize string for matching
// function normalize(str) {
//     return str.toLowerCase()
//         .replace(/[._-]/g, ' ')
//         .replace(/[^a-z0-9\s]/g, '')
//         .replace(/\s+/g, ' ')
//         .trim();
// }

// Fetch movie metadata from OMDB
async function getMetadata(imdbId) {
    try {
        const response = await axios.get(`http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
        if (response.data.Response === 'True') {
            return {
                title: response.data.Title,
                year: response.data.Year,
                genre: response.data.Genre
            };
        }
    } catch (error) {
        console.error('Error fetching metadata:', error.message);
    }
    return null;
}


// Define stream handler
builder.defineStreamHandler(async ({ type, id }) => {
    if (type !== 'movie' && type !== 'series') {
        console.log(type, id);
        return { streams: [] };
    }

    console.log(`Stream request for ID: ${id}`);

    // Fetch movie metadata
    let metadata = null;
    if (type === 'movie') {
        metadata = await getMetadata(id);
    } else {
        metadata = await getMetadata(id.split(':')[0])
    }

    if (!metadata) {
        console.log(`Could not fetch metadata for: ${id}`);
        return { streams: [] };
    }

    console.log(`Looking for: ${metadata.title} (${metadata.year})`);

    const season = id.split(':')[1];
    const episode = id.split(':')[2];
    // Find movie directly by matching folder name
    let movies = null;
    let eps = null;
    if (type === 'movie') {
        movies = await movieRouter(metadata.title, metadata.year);
        if (!movies) {
            console.log(`No match found for: ${metadata.title}`);
            return { streams: [] };
        }
    } else {
        console.log(metadata);
        eps = await seriesRouter(metadata.title, metadata.year, metadata.genre, season, episode);
        if (!eps) {
            console.log(`No match found for: ${metadata.title}`);
            return { streams: [] };
        }
    }
    console.log(movies)
    console.log(eps)

    const streams = [];
    if (type === 'movie') {
        for (const movie of movies) {
            if (!movie) {
                continue;
            }
            console.log(`Found match: ${movie.originalName}`);
            console.log(`Stream URL: ${movie.url}`);

            // Build stream title with quality and size
            let streamTitle = movie.originalName || metadata.title;
            if (movie.size) {
                streamTitle += `\n💾 ${movie.size}`;
            }
            const source = movie.source;
            streams.push({
                name: source,
                title: streamTitle,
                url: movie.url
            })
        }
    } else {
        for (const ep of eps) {
            if (!ep) {
                continue;
            }
            console.log(`Found match: ${ep.originalName}`);
            console.log(`Stream URL: ${ep.url}`);

            // Build stream title with quality and size
            let streamTitle = ep.originalName || metadata.title;
            if (ep.size) {
                streamTitle += `\n💾 ${ep.size}`;
            }
            const source = ep.source;
            streams.push({
                name: source,
                title: streamTitle,
                url: ep.url
            })
        }
    }

    console.log(streams);
    console.log(`found ${streams.length} streams`);
    return {
        streams: streams
    };
});

// Start the addon server
serveHTTP(builder.getInterface(), { port: PORT });

console.log(`Stremio addon running at http://localhost:${PORT}/manifest.json`);