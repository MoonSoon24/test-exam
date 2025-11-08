// This function runs on Vercel's secure servers.
export default async function handler(req, res) {
    // 1. Load sensitive data from Vercel's secure Environment Variables
    const { GAS_API_URL, GAS_SECRET_KEY } = process.env;

    if (!GAS_API_URL || !GAS_SECRET_KEY) {
        return res.status(500).json({ 
            success: false, 
            error: 'Server misconfigured: Missing environment variables.' 
        });
    }

    // 2. Get query parameters from the frontend request (e.g., ?action=getProducts)
    const query = req.query;

    try {
        // 3. Construct the REAL URL for Google Apps Script
        const targetUrl = new URL(GAS_API_URL);
        
        // INJECT THE SECRET KEY HERE (Safe because it happens on the server)
        targetUrl.searchParams.append('secret', GAS_SECRET_KEY);

        // Forward all other parameters from the frontend (like 'action', 'nama', etc.)
        Object.keys(query).forEach(key => {
            targetUrl.searchParams.append(key, query[key]);
        });

        console.log("Proxying to Google..."); // Visible only in Vercel logs

        // 4. Call Google
        const googleResponse = await fetch(targetUrl.toString(), {
            method: req.method, // Forward GET or POST method
            // If you need to forward POST body data later for adding scores:
            // body: req.method === 'POST' ? JSON.stringify(req.body) : null,
        });

        if (!googleResponse.ok) {
            throw new Error(`Google API responded with ${googleResponse.status}`);
        }

        // 5. Get data from Google and send it back to our frontend
        const data = await googleResponse.json();
        res.status(200).json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ 
            success: false, 
            error: 'Proxy failed to contact Google Server.' 
        });
    }
}