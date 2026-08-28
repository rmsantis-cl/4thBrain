const express = require("express");
const router = express.Router();
const { apiReference } = require("@scalar/express-api-reference");
const devOnly = require("../middleware/dev-only");

router.use(devOnly);

router.get("/openapi.json", (req, res) => {
  const spec = require("../openapi/spec");
  res.json(spec);
});

router.use(
  "/",
  apiReference({
    spec: {
      url: "/api/docs/openapi.json",
    },
  })
);

module.exports = router;
