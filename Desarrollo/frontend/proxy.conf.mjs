// Dev-server proxy for /api. The API runs on the host at port 8080 (`./gradlew bootRun` or the
// backend compose). Inside the frontend container "localhost" is the container itself, so the
// compose file sets API_TARGET to the host address instead.
const target = process.env.API_TARGET ?? 'http://localhost:8080';

export default {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
  },
};
