const LEVELS = { info: 0, warning: 1, error: 2 };

function createLogger(configuredLevel) {
  const threshold = LEVELS[configuredLevel] ?? LEVELS.info;

  function emit(level, event, message, fields = {}) {
    if (LEVELS[level] < threshold) return;
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      message,
      ...fields
    }));
  }

  const base = {
    info: (event, message, fields) => emit("info", event, message, fields),
    warning: (event, message, fields) => emit("warning", event, message, fields),
    error: (event, message, fields) => emit("error", event, message, fields),
  };

  base.forDocument = (documentId, jobId = null) => {
    const bound = {};
    for (const lvl of Object.keys(LEVELS)) {
      bound[lvl] = (event, message, fields = {}) =>
        emit(lvl, event, message, { documentId, jobId, ...fields });
    }
    return bound;
  };

  return base;
}

module.exports = { createLogger, LEVELS };
