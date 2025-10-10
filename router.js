const findMovieInYear = require('./findMovieInYear');
const findEpisode = require('./findEpisode');

async function CircleEnglish2(title, year, source) {
    const BASE_URL = 'http://index2.circleftp.net'; // Base domain
    const MOVIES_BASE_PATH = '/FILE/English%20Movies/'; // Base path for movies
    const movies = await findMovieInYear(title, year, BASE_URL, MOVIES_BASE_PATH, source);

    return movies;
}

async function CircleEnglish(title, year, source) {
    const BASE_URL = 'http://index.circleftp.net'; // Base domain
    const MOVIES_BASE_PATH = '/FILE/English%20Movies/'; // Base path for movies
    const movies = await findMovieInYear(title, year, BASE_URL, MOVIES_BASE_PATH, source);

    return movies;
}

async function CircleEnglishForeignDubbed2(title, year, source) {
    const BASE_URL = 'http://index2.circleftp.net'; // Base domain
    const MOVIES_BASE_PATH = '/FILE/English%20%26%20Foreign%20Dubbed%20Movies/'; // Base path for movies
    const movies = await findMovieInYear(title, year, BASE_URL, MOVIES_BASE_PATH, source);

    return movies;
}

async function CircleEnglishForeignDubbed(title, year, source) {
    const BASE_URL = 'http://index.circleftp.net'; // Base domain
    const MOVIES_BASE_PATH = '/FILE/English%20%26%20Foreign%20Dubbed%20Movies/'; // Base path for movies
    const movies = await findMovieInYear(title, year, BASE_URL, MOVIES_BASE_PATH, source);

    return movies;
}

async function samEnglishMovie(title, year, source) {
    const BASE_URL = 'http://172.16.50.14'; // Base domain
    const MOVIES_BASE_PATH = '/DHAKA-FLIX-14/English%20Movies%20%281080p%29/'; // Base path for movies
    const movies = await findMovieInYear(title, year, BASE_URL, MOVIES_BASE_PATH, source);

    return movies;
}

async function circleSeries16(title, year, season, episode) {
    const BASE_URL = 'http://ftp16.circleftp.net'; // Base domain
    const SERIES_BASE_PATH = '/FILE/Dubbed%20TV%20Series%20%26%20Shows/';
    
    const eps = await findEpisode(title, year, season, episode, BASE_URL, SERIES_BASE_PATH);
    
    return eps;
}

async function circleAnime15(title, year, season, episode) {
    const BASE_URL = 'http://ftp15.circleftp.net'; // Base domain
    const SERIES_BASE_PATH = '/FILE/English %26 Foreign Anime Series/';
    
    const eps = await findEpisode(title, year, season, episode, BASE_URL, SERIES_BASE_PATH);
    
    return eps;
}

async function movieRouter(title, year) {
    const movies = [];
    // const circleEnglish = await englishMovie(title, year, 'Circle');
    // movies.push(...circleEnglish);
    if (year >= "2016") {
        movies.push(...await CircleEnglish2(title, year, 'Circle'))
        movies.push(...await CircleEnglishForeignDubbed2(title, year, 'Circle'));
    } else {
        movies.push(...await CircleEnglish(title, year, 'Circle'))
        movies.push(...await CircleEnglishForeignDubbed(title, year, 'Circle'));
    }
    // movies.push(...await samEnglishMovie(title, year, 'Sam'));
    return movies;
}

async function seriesRouter(title, year, genre, season, episode) {
    const eps =[];
    // const gnr=genre;
    genre = genre.split(',')[0];
    if(genre==='Animation'){
        eps.push(...await circleAnime15(title, year, season,episode));
    }else{
        eps.push(...await circleSeries16(title, year, season,episode));
    }

    return eps;
}

module.exports = { movieRouter, seriesRouter };