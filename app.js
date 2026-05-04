const express = require('express');
const axios = require('axios');
const app = express();

// Cloud Run provides the PORT environment variable (usually 8080)
const port = process.env.PORT || 8080;

// This will be the Public IP of your GKE Backend (we will set this in GitLab)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

app.get('/', async (req, res) => {
  try {
    console.log(`Attempting to contact backend at: ${BACKEND_URL}/api/products`);
    
    // Calling the GKE Backend over the public internet
    const response = await axios.get(`${BACKEND_URL}/api/products`);
    const products = response.data;
    
    let html = `
      <body style="font-family: sans-serif; background: #f4f4f4; padding: 50px;">
        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #333;">🚀 Cloud Run Frontend</h1>
          <p style="color: #666;">This frontend is running on <b>Cloud Run</b>.</p>
          <hr>
          <h3>Products from GKE Backend:</h3>
          <ul>
            ${products.map(p => `<li><b>${p.name}</b> - $${p.price}</li>`).join('')}
          </ul>
          <p style="font-size: 0.8em; color: #999;">Connected to: ${BACKEND_URL}</p>
        </div>
      </body>
    `;
    res.send(html);
  } catch (error) {
    console.error("Error connecting to backend:", error.message);
    res.status(500).send(`
      <h1>Store is temporarily down!</h1>
      <p>Frontend (Cloud Run) could not reach Backend (GKE).</p>
      <p>Error: ${error.message}</p>
    `);
  }
});

app.listen(port, () => {
  console.log(`Frontend listening at http://localhost:${port}`);
});