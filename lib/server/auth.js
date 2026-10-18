import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { prisma } from './db.js';

export const SESSION_COOKIE = 'fp_session';
const SESSION_DAYS = 30;

export const hashPassword = (password) => bcrypt.hash(password, 10);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

// What the browser gets to see about an account
export const publicUser = (u) => u && ({
  email: u.email,
  name: u.name,
  orgName: u.orgName,
  isSuperAdmin: u.isSuperAdmin,
  createdBy: u.createdBy || null,
  createdAt: u.createdAt
});

export const createSession = async (userId) => {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
};

// Secure (https-only) in production. COOKIE_SECURE=false allows sign-in over plain http, e.g. a server
// reached by IP address before its domain and SSL are set up.
const secureCookies = () => process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';

export const sessionCookie = (token, expiresAt) =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secureCookies() ? '; Secure' : ''}`;

export const clearedCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

const readCookie = (cookieHeader, name) => {
  for (const part of (cookieHeader || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
};

export const tokenFromCookies = (cookieHeader) => readCookie(cookieHeader, SESSION_COOKIE);

export const userFromToken = async (token) => {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  return session.user;
};

// Signed-in user for a route handler request (null when signed out)
export const getRequestUser = (request) => userFromToken(tokenFromCookies(request.headers.get('cookie')));

export const normaliseEmail = (email) => String(email || '').trim().toLowerCase();

export const validateNewAccount = ({ name, email, password }) => {
  if (!String(name || '').trim()) return 'Please enter a name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normaliseEmail(email))) return 'Please enter a valid email address.';
  if (String(password || '').length < 8) return 'Password must be at least 8 characters.';
  return null;
};

// Creates the Force Pulse admin from ADMIN_EMAIL / ADMIN_PASSWORD on first start
export const ensureAdminFromEnv = async () => {
  const email = normaliseEmail(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) {
    console.warn('[force-pulse] ADMIN_EMAIL / ADMIN_PASSWORD not set in .env: no Force Pulse admin account was created.');
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.isSuperAdmin) await prisma.user.update({ where: { email }, data: { isSuperAdmin: true } });
    return;
  }
  await prisma.user.create({
    data: { email, name: process.env.ADMIN_NAME || 'Force Pulse Admin', orgName: 'Force Pulse', passwordHash: await hashPassword(password), isSuperAdmin: true }
  });
  console.log(`[force-pulse] Created Force Pulse admin account ${email}`);
};
