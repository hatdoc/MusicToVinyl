export async function onRequestGet({ request }) {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    if (!query) {
        return new Response(JSON.stringify({ error: "No query provided" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
            }
        });
        const html = await res.text();
        
        let match = html.match(/var ytInitialData = (\{.+?\});<\/script>/) || html.match(/window\["ytInitialData"\] = (\{.+?\});\n/);
        
        if (!match) { 
            return new Response(JSON.stringify([]), {
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        const data = JSON.parse(match[1]);
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
                if (results.length >= 5) break; // Return 5 results for the modal
            }
        }
        
        return new Response(JSON.stringify(results), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch(e) {
        return new Response(JSON.stringify({ error: "Failed to parse YouTube results." }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
             }
        });
    }
}
