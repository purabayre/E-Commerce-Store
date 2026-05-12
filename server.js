const express = require("express");

const app = express(".src/app");

app.get("/", (req, res, next) => {
  res.send("server is healthy");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
