const express = require('express');
const axios = require('axios');

const app = express();

app.use(express.json());

const port = process.env.PORT || 8080;

// Backend service URL from Kubernetes environment variable
const BACKEND_URL = process.env.BACKEND_URL;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Get products
app.get('/api/products', async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/products`);
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({ error: "Backend unavailable" });
  }
});

// Get cart
app.get('/api/cart', async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/cart`);
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching cart:", err.message);
    res.status(500).json({ error: "Backend unavailable" });
  }
});

// Add to cart
app.post('/api/cart', async (req, res) => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/cart`,
      req.body
    );

    res.json(response.data);

  } catch (err) {
    console.error("Error adding to cart:", err.message);
    res.status(500).json({ error: "Backend unavailable" });
  }
});

// Clear cart
app.delete('/api/cart', async (req, res) => {
  try {
    const response = await axios.delete(`${BACKEND_URL}/api/cart`);
    res.json(response.data);

  } catch (err) {
    console.error("Error clearing cart:", err.message);
    res.status(500).json({ error: "Backend unavailable" });
  }
});

app.listen(port, () => {
  console.log(`Frontend running on port ${port}`);
});