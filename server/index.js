import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT, DATABASE_URL } from './config.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import leadsRoutes from './routes/leads.js';
import interactionsRoutes from './routes/interactions.js';
import signalsRoutes from './routes/signals.js';
import followupsRoutes from './routes/followups.js';
import exportRoutes from './routes/export.js';
import projectsRoutes from './routes/projects.js';
import patientsRoutes from './routes/patients.js';
import complianceRoutes from './routes/compliance.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VIGIL',
    database_configured: Boolean(DATABASE_URL),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/signals', signalsRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/compliance', complianceRoutes);

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  res.status(status).json({
    error: status >= 500 ? 'Unexpected server error.' : error.message,
    detail: process.env.NODE_ENV === 'production' ? undefined : error.message,
  });
});

app.listen(PORT, () => {
  console.log(`VIGIL API listening on ${PORT}`);
});
