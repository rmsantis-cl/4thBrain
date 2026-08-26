const express = require("express");
const { renderChatPage } = require("../ui/page");

const router = express.Router();

// The only GET route in the entire app.
router.get("/chat", (req, res) => {
  res.type("html").send(renderChatPage());
});

module.exports = router;
