const axios = require('axios');
const cheerio = require('cheerio');

async function getAllSeasons(BASE_URL, folderLink, episode) {
    const seasonsFolderUrl = BASE_URL + folderLink;
    console.log(`Scanning folder: ${seasonsFolderUrl}`);
    const response = await axios.get(seasonsFolderUrl);
    const $ = cheerio.load(response.data);
    let foundSeasons = [];
    $('a').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();

        // Skip if no href or text
        if (!href || !text) return;

        // Skip navigation links
        if (text === 'Parent Directory' ||
            text === 'modern browsers' ||
            text === 'powered by h5ai') {
            return;
        }

        // Check if it's a folder (ends with /)
        if (href.endsWith('/')) {
            foundSeasons.push({
                href: href,
            })
        }
    });

    let foundEpisodes = [];

    for (const season of foundSeasons) {
        console.log(`Scanning folder: ${BASE_URL}${season.href}`);
        const response = await axios.get(BASE_URL + season.href);
        const $folder = cheerio.load(response.data);

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

                let matched = true;
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

                    foundEpisodes.push({
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

    return foundEpisodes;
}

module.exports = getAllSeasons;