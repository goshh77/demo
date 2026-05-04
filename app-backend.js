const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url} from ${req.ip}`);
  next();
});

app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: "GKE Cloud Shirt", price: 25 },
    { id: 2, name: "GitLab CI Hoodie", price: 50 },
    { id: 3, name: "Cloud Run Cap", price: 15 }
  ]);
});

// Health check for Kubernetes
app.get('/health', (req, res) => res.send('OK'));

app.listen(port, () => {
  console.log(`Backend service listening at http://localhost:${port}`);
});