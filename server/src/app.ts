import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';

import authRouter          from './modules/auth/auth.router';
import usersRouter         from './modules/users/users.router';
import projectsRouter      from './modules/projects/projects.router';
import workLogsRouter      from './modules/workLogs/workLogs.router';
import approvalsRouter     from './modules/approvals/approvals.router';
import notificationsRouter from './modules/notifications/notifications.router';
import dashboardRouter     from './modules/dashboard/dashboard.router';
import reportsRouter       from './modules/reports/reports.router';
import settingsRouter      from './modules/settings/settings.router';
import invitesRouter       from './modules/invites/invites.router';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// ─── Security & Logging ───────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
const allowedOrigins = env.clientUrl.split(',').map((url) => url.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, origin); // fallback to echo origin in dev/testing or log
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check & Root Routes ──────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'ok', message: 'Timesheet API Server Running (MySQL WAMP)', version: '1.0.0' }));
app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/users',         usersRouter);
app.use('/api/projects',      projectsRouter);
app.use('/api/work-logs',     workLogsRouter);
app.use('/api/approvals',     approvalsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/dashboard',     dashboardRouter);
app.use('/api/reports',       reportsRouter);
app.use('/api/settings',      settingsRouter);
app.use('/api/invites',       invitesRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
