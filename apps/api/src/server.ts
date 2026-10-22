import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 MiniLedger Backend Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT} (Accessible by physical mobile devices)`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`======================================================\n`);
});
