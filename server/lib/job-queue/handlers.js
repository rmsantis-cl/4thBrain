const ingestHandler = require("./handlers/ingest");
const convertHandler = require("./handlers/convert");
const indexHandler = require("./handlers/index");
const classifyHandler = require("./handlers/classify");

module.exports = {
  ingest: ingestHandler,
  convert: convertHandler,
  index: indexHandler,
  classify: classifyHandler,
};
