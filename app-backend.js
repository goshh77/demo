const express = require('express');
const cors = require('cors'); // Essential for Cloud Run to talk to GKE
const app = express();
app.use(cors()); // Allow all origins
app.use(express.json()); // Allow the backend to read JSON data

const port = 5000;

// The "Database" (Temporary in-memory)
let cart = [];
const products = [
  { id: 1, name: "Cloud Expert Shirt", price: 25 },
  { id: 2, name: "Kubernetes Hoodie", price: 50 },
  { id: 3, name: "GitLab CI Cap", price: 15 }
];

// Route 1: Get all products
app.get('/api/products', (req, res) => res.json(products));

// Route 2: Get current cart
app.get('/api/cart', (req, res) => res.json(cart));

// Route 3: Add to cart
app.post('/api/cart', (req, res) => {
  const item = req.body;
  cart.push(item);
  console.log("Added to cart:", item);
  res.status(201).json(cart);
});

// Route 4: Clear cart
app.delete('/api/cart', (req, res) => {
  cart = [];
  res.json({ message: "Cart cleared" });
});

app.listen(port, () => console.log(`Backend running on port ${port}`));