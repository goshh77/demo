const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();
app.use(express.json());

const port = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Improved Proxy routes with logging
app.get('/api/products', async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/products`, { timeout: 5000 });
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(503).json([]);
  }
});

app.get('/api/cart', async (req, res) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/cart`, { timeout: 5000 });
    res.json(response.data);
  } catch (err) {
    console.error("Error fetching cart:", err.message);
    res.status(503).json([]);
  }
});

app.post('/api/cart', async (req, res) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/cart`, req.body, { timeout: 5000 });
    res.json(response.data);
  } catch (err) {
    console.error("Error adding to cart:", err.message);
    res.status(503).json({ error: "Backend failure" });
  }
});

app.delete('/api/cart', async (req, res) => {
  try {
    const response = await axios.delete(`${BACKEND_URL}/api/cart`);
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ error: "Backend failure" });
  }
});

app.listen(port);