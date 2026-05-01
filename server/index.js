const { createApp } = require('./app');
const PORT = process.env.PORT || 3001;

const { app, server } = createApp({ withStaticClient: true });

server.listen(PORT, () => {
  console.log(`Monkeybook API running on http://localhost:${PORT}`);
});

module.exports = { app, server };
