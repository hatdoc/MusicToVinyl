async function test() {
    const query = "beatles";
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    const html = await res.text();
    
    // Sometimes it's var ytInitialData =, sometimes window["ytInitialData"] =
    let match = html.match(/var ytInitialData = (\{.+?\});<\/script>/) || html.match(/window\["ytInitialData"\] = (\{.+?\});\n/);
    if (!match) { 
        console.log("Still NO MATCH. Printing a snippet:"); 
        console.log(html.substring(html.indexOf("ytInitialData"), html.indexOf("ytInitialData") + 200));
        return; 
    }
    const data = JSON.parse(match[1]);
    try {
        const contents = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        const results = [];
        for (const item of contents) {
            if (item.videoRenderer) {
                const v = item.videoRenderer;
                results.push({
                    id: v.videoId,
                    title: v.title.runs[0].text,
                    thumbnail: v.thumbnail.thumbnails[0].url,
                    author: v.ownerText.runs[0].text
                });
                if (results.length >= 3) break;
            }
        }
        console.log("Success:", results);
    } catch(e) {
        console.log("JSON parsing structure changed inside ytInitialData:");
        console.log(e);
    }
}
test();
