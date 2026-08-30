const express = require("express");
const devOnly = require("../middleware/dev-only");
const { renderAdminMenuPage } = require("../ui/page");

const router = express.Router();

router.use(devOnly);

router.get("/admin", (req, res) => {
  res.type("html").send(renderAdminMenuPage());
});

module.exports = router;
