const axios = require('axios');
const cheerio = require('cheerio');
const getAllSeasons =require('./getAll');

function normalize(str) {
    return str.toLowerCase()
        .replace(/[._-]/g, ' ')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getName(str) {
    const match = str.match(/^(.+?)\s*\(/);
    return match ? match[1] : str;
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
        console.log('len:', len);

        const yr = year.split('–')[0];
        console.log(yr);

        // Find matching movie folder
        let matchedFolders = [];
        $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();

            // Skip if no href or text
            if (!href || !text) return;

            // Check if it's a folder (ends with /)
            if (href.endsWith('/')) {
                let normalizedFolderName = normalize(getName(text));
                // let normalizedFolderName = normalize(text);
                // normalizedFolderName = normalizedFolderName.split(' ').splice(0, len).join(' ');
                // console.log('before norm:',text);
                // console.log(`Normalized folder: "${normalizedFolderName}"`);
                // Try to match the folder name with movie seriesTitle
                if ((normalizedFolderName.includes(normalizedSearch) ||
                    normalizedSearch.includes(normalizedFolderName)) &&
                    text.includes(yr)) {
                    console.log(`Found matching folder: ${text}`);
                    console.log('normalized folder:', normalizedFolderName);
                    matchedFolders.push({
                        href: href,
                        name: text
                    });
                    // return false; // Break the loop
                }
            }
        });

        if (matchedFolders.length === 0) {
            console.log(`No matching folder found for: ${seriesTitle}`);
            return [];
        }

        let foundEpisode = [];
        // Now scan the matched folder for video files
        for (let matchedFolder of matchedFolders) {
            let folderResponse = null;
            const patterns = [`Season%20${season}%201080p/`, `Season%20${season}/`];
            for (const pattern of patterns) {
                try {
                    const episodeFolderUrl = BASE_URL + matchedFolder.href + pattern;
                    console.log(`Scanning folder: ${episodeFolderUrl}`);
                    folderResponse = await axios.get(episodeFolderUrl);
                } catch (err) {
                    console.log('Folder not found. Trying another pattern');
                }
            }


            if (!folderResponse) {
                foundEpisode.push(...await getAllSeasons(BASE_URL, matchedFolder.href, episode));
                // throw new Error('Error in 2nd pattern also');
                // break;
            } else {
                const $folder = cheerio.load(folderResponse.data);

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
                    }
                });
            }
        }
        console.log(`found ${foundEpisode.length} video(s) in Cicrle`);
        for (let video of foundEpisode) {
            console.log(`Found video: ${video.originalName} (${video.size})`);
        }


        return foundEpisode;
    } catch (error) {
        console.error(`Error searching in ${seriesTitle}:`, error.message);
        return [];
    }
}

module.exports = findEpisode;
