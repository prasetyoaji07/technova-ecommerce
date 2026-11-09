import { app } from './src/app.js';
import { config } from './src/config.js';

app.listen(config.port, () => {
  console.info(`TechNova berjalan di http://localhost:${config.port}`);
});
