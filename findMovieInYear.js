const axios = require('axios');
const cheerio = require('cheerio');

function normalize(str) {
    return str.toLowerCase()
        .replace(/[._-]/g, ' ')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function findMovieInYear(movieTitle, year, BASE_URL, MOVIES_BASE_PATH, source) {
    try {
        if (source==="Sam") {
            if (Number(year) <= 1995) {
                year = `%281995%29%201080p%20%26%20Before`;
            } else {
                year = `%28${year}%29%201080p`;
            }
        } else{
            if(Number(year)<=1995){
                if(MOVIES_BASE_PATH.includes('Foreign')){
                    year='1995%20%26%20before';
                } else{
                    year='%281995%29%20%26%20Before';
                }
            }
        }
        const yearFolderUrl = BASE_URL + MOVIES_BASE_PATH + year + '/';
        console.log(`Searching in: ${yearFolderUrl}`);
        const response = await axios.get(yearFolderUrl);
        const $ = cheerio.load(response.data);

        const normalizedSearch = normalize(movieTitle);
        console.log(`Normalized search: "${normalizedSearch}"`);
        const len = normalizedSearch.split(' ').length;
        // Find matching movie folder
        let matchedFolder = null;
        $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();

            // Skip if no href or text
            if (!href || !text) return;

            // Skip navigation links
            // if (text === 'Parent Directory' ||
            //     text === 'modern browsers' ||
            //     text === 'powered by h5ai') {
            //     return;
            // }

            // Check if it's a folder (ends with /)
            if (href.endsWith('/')) {
                let normalizedFolderName = normalize(text);
                normalizedFolderName = normalizedFolderName.split(' ').splice(0,len).join(' ');
                // Try to match the folder name with movie title
                // || normalizedSearch.includes(normalizedFolderName.split(' ').slice(0, -2).join(' '))
                if (normalizedFolderName.includes(normalizedSearch)) {
                    console.log(`Found matching folder: ${text}`);
                    console.log('normalized folder:',normalizedFolderName);
                    matchedFolder = {
                        href: href,
                        name: text
                    };
                    return false; // Break the loop
                }
            }
        });

        if (!matchedFolder) {
            console.log(`No matching folder found for: ${movieTitle}`);
            return [];
        }

        // Now scan the matched folder for video files
        const folderUrl = BASE_URL + matchedFolder.href;
        console.log(`Scanning folder: ${folderUrl}`);
        const folderResponse = await axios.get(folderUrl);
        const $folder = cheerio.load(folderResponse.data);

        // Find video files
        let foundVideos = [];

        $folder('a').each((i, elem) => {
            const href = $(elem).attr('href');
            const label = $(elem).text().trim();
            // const $link = $(elem);

            // Get the label (filename) - try multiple methods
            // let label = $link.find('span.label').text().trim();

            // If span.label is empty, try getting text directly from link
            // if (!label) {
            //     // console.log('found in 1');
            //     label = $link.text().trim();
            // }

            // // If still empty, try title attribute
            // if (!label) {
            //     // console.log('found in 2');
            //     label = $link.attr('title') || '';
            // }

            console.log(`Processing: href="${href}", label="${label}"`);

            if (!href || !label) return;

            // Check if it's a video file
            if (label.match(/\.(mp4|mkv|avi|mov|webm)$/i)) {
                const displayName = label;

                // Get file size
                // const fileSize = $link.find('span.size').text().trim();
                let fileSize = '';
                const parentTr = $(elem).closest('tr');
                if (parentTr.length) {
                    const sizeCell = parentTr.find('td').eq(3); // Size is in 4th column
                    if (sizeCell.length) {
                        fileSize = sizeCell.text().trim();
                    }
                }
                fileSize = Number(fileSize.slice(0, fileSize.length - 2));
                fileSize = (fileSize / (1000000)).toFixed(2) + ' GB';

                console.log(`Video file found: ${displayName}, size: ${fileSize}`);

                // Take the first video file found (skip if we already found one)
                // if (!foundVideo) {
                // Extract quality info from filename
                let quality = '';
                if (displayName.match(/2160p|4K/i)) quality = '4K';
                else if (displayName.match(/1080p/i)) quality = '1080p';
                else if (displayName.match(/720p/i)) quality = '720p';
                else if (displayName.match(/480p/i)) quality = '480p';

                // Build full URL
                const fullUrl = BASE_URL + href;

                foundVideos.push({
                    filename: displayName,
                    url: fullUrl,
                    originalName: displayName,
                    quality: quality,
                    size: fileSize || 'Unknown',
                    source: source
                });

                // console.log(`Selected video: ${displayName}`);
                // }
            }
        });

        console.log(`found ${foundVideos.length} video(s) in ${source}`);
        for (let video of foundVideos) {
            console.log(`Found video: ${video.originalName} (${video.size})`);
        }


        return foundVideos;
    } catch (error) {
        console.error(`Error searching in year ${year}:`, error.message);
        return [];
    }
}

module.exports = findMovieInYear;