// server.js - Обновленный сервер с API роутами

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

// Импорты API функций
import {
  createInvitation,
  getInvitations,
  resendInvitation,
  deleteInvitation,
  getInvitationByToken,
  acceptInvitation
} from './src/api/invitations.js';

import {
  getOffices,
  createOffice,
  updateOffice,
  deleteOffice
} from './src/api/offices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes для приглашений
app.post('/api/invitations', createInvitation);
app.get('/api/invitations', getInvitations);
app.post('/api/invitations/:id/resend', resendInvitation);
app.delete('/api/invitations/:id', deleteInvitation);
app.get('/api/invitations/:token', getInvitationByToken);
app.post('/api/invitations/:token/accept', acceptInvitation);

// API Routes для офисов
app.get('/api/offices', getOffices);
app.post('/api/offices', createOffice);
app.put('/api/offices/:id', updateOffice);
app.delete('/api/offices/:id', deleteOffice);

// Serve static files from dist directory
app.use(express.static(join(__dirname, 'dist')));

// Handle React Router - send all requests to index.html (ВАЖНО: должно быть ПОСЛЕ API роутов)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at: http://localhost:${port}/api`);
});