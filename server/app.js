// api/app.js
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || "2";
import('./src/server.mjs').catch((err) => {
  console.error(err);
  process.exit(1);
});
