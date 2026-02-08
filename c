const express = require("express");
const leadRoutes = require("./routes/lead.cjs");

const app = express();
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Lead routes
app.use("/lead", leadRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
