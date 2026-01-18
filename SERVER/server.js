const express = require('express');
const { main } = require('./ForestCarbonEstimation.js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/estimate-carbon', async (req, res) => {
  try {
    const { keyPath, coordinates, options } = req.body;
    const result =  await main(keyPath, coordinates, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});