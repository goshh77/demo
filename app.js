const express = require('express');
const axios = require('axios'); // We need axios here
const fs = require('fs');
const app = express();
app.use(express.json());
const port = process.env.PORT || 8080;

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// This serves your HTML
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// NEW: This acts as a proxy bridge
app.get('/api/products', async (req, res) => {
  const response = await axios.get(`${BACKEND_URL}/api/products`);
  res.json(response.data);
});

app.get('/api/cart', async (req, res) => {
  const response = await axios.get(`${BACKEND_URL}/api/cart`);
  res.json(response.data);
});

app.post('/api/cart', async (req, res) => {
  const response = await axios.post(`${BACKEND_URL}/api/cart`, req.body);
  res.json(response.data);
});

app.delete('/api/cart', async (req, res) => {
  const response = await axios.delete(`${BACKEND_URL}/api/cart`);
  res.json(response.data);
});

app.listen(port);