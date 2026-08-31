let inflight = 0;

function inflightMiddleware(req, res, next) {
  inflight += 1;
  res.once('close', () => {
    inflight -= 1;
  });
  next();
}

function getInflight() {
  return inflight;
}

module.exports = { inflightMiddleware, getInflight };
