const axios = require('axios');
const cheerio = require('cheerio');

function normalize(str) {
    return str.toLowerCase()
        .replace(/[._-]/g, ' ')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getName(str){
    return str.match(/^(.+?)\s*\(/)[1].trim().toLowerCase();
}

async function findEpisode(seriesTitle, year, season, episode, BASE_URL, SERIES_BASE_PATH) {
    try {
        const mainFolderUrl = BASE_URL + SERIES_BASE_PATH;
        console.log(`Searching in: ${mainFolderUrl}`);
        const response = await axios.get(mainFolderUrl);
        const $ = cheerio.load(response.data);
        console.log(episode);
        const normalizedSearch = normalize(seriesTitle);
        console.log(`Normalized search: "${normalizedSearch}"`);

        const len = normalizedSearch.split(' ').length;
        console.log('len:',len);
        
        const yr = year.replace('–', '-');
        console.log(yr);

        // Find matching movie folder
        let matchedFolder = null;
        $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();

            // Skip if no href or text
            if (!href || !text) return;

            // Check if it's a folder (ends with /)
            if (href.endsWith('/')) {
                // let normalizedFolderName = getName(text);
                let normalizedFolderName = normalize(text);
                // normalizedFolderName = normalizedFolderName.split(' ').splice(0, len).join(' ');
                console.log('before norm:',text);
                console.log(`Normalized folder: "${normalizedFolderName}"`);
                // Try to match the folder name with movie seriesTitle
                if ((normalizedFolderName.includes(normalizedSearch) ||
                    normalizedSearch.includes(normalizedFolderName)) &&
                    text.includes(yr)) {
                    console.log(`Found matching folder: ${text}`);
                    console.log('normalized folder:', normalizedFolderName);
                    matchedFolder = {
                        href: href,
                        name: text
                    };
                    return false; // Break the loop
                }
            }
        });

        if (!matchedFolder) {
            console.log(`No matching folder found for: ${seriesTitle}`);
            return [];
        }

        // Now scan the matched folder for video files
        let folderResponse = null;
        try {
            const episodeFolderUrl = BASE_URL + matchedFolder.href + `Season%20${season}%201080p/`;
            console.log(`Scanning folder: ${episodeFolderUrl}`);
            folderResponse = await axios.get(episodeFolderUrl);
        } catch (err) {
            console.log('Folder not found. Trying another pattern');

            const episodeFolderUrl = BASE_URL + matchedFolder.href + `Season%20${season}/`;
            console.log(`Scanning folder: ${episodeFolderUrl}`);
            folderResponse = await axios.get(episodeFolderUrl);
        } finally {
            if(!folderResponse){
                throw new Error('Error in 2nd pattern also');
            }
            const $folder = cheerio.load(folderResponse.data);

            let foundEpisode = [];
            $folder('a').each((i, elem) => {
                const href = $(elem).attr('href');
                const label = $(elem).text().trim();

                console.log(`Processing: href="${href}", label="${label}"`);

                if (!href || !label) return;

                // Check if it's a video file
                if (label.match(/\.(mp4|mkv|avi|mov|webm)$/i)) {
                    const displayName = label;

                    // console.log(`looking for eps: ${episode}`, 'E'+episode, season);
                    let epNumber = Number(episode);
                    if (epNumber < 10) {
                        epNumber = '0' + epNumber;
                    }
                    console.log(epNumber);

                    let matched = false;
                    if (displayName.includes('E' + epNumber)) {
                        matched = true;
                    } else if (displayName.includes(epNumber) && !displayName.includes('S' + epNumber)) {
                        matched = true;
                    }
                    if (matched) {
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

                        // Build full URL
                        const fullUrl = BASE_URL + href;

                        foundEpisode.push({
                            filename: displayName,
                            url: fullUrl,
                            originalName: displayName,
                            size: fileSize || 'Unknown',
                            source: 'Circle'
                        });
                    }

                    // console.log(`Selected video: ${displayName}`);
                    // }
                }
            });

            console.log(`found ${foundEpisode.length} video(s) in Cicrle`);
            for (let video of foundEpisode) {
                console.log(`Found video: ${video.originalName} (${video.size})`);
            }


            return foundEpisode;
        }
    } catch (error) {
        console.error(`Error searching in ${seriesTitle}:`, error.message);
        return [];
    }
}

module.exports = findEpisode;
