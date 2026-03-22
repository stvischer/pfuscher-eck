import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

import ApiError from '../lib/errors/ApiError.js';

/**
 * @module controller/Auth
 * @description Authentication controller: registration, login, and token management.
 */

/**
 * A pair of JWT access token and opaque refresh token.
 *
 * @typedef {Object} TokenPair
 * @property {string} accessToken  - Short-lived JWT (15 min).
 * @property {string} refreshToken - Long-lived opaque token (30 days).
 */

/**
 * The payload returned to the client after a successful auth operation.
 *
 * @typedef {Object} AuthResult
 * @property {string} accessToken  - Short-lived JWT.
 * @property {string} refreshToken - Long-lived opaque token.
 * @property {{ id: number, username: string, email: string, role: string }} user
 *   Public user fields safe to expose to the client.
 */

/**
 * Compute the SHA-256 hex digest of a string.
 *
 * @param {string} str
 * @returns {string}
 */
function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Generate a cryptographically random 40-byte hex string suitable for use as
 * an opaque refresh token.
 *
 * @returns {string}
 */
function generateRefreshToken() {
  return randomBytes(40).toString('hex');
}

/**
 * Handles user authentication: registration, login, and JWT / refresh-token
 * issuance. Intended to be instantiated once per Fastify instance.
 */
export default class Auth {
  /** @type {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB }} */
  #fastify;

  /**
   * Sign a new access token and persist a hashed refresh token in the database.
   *
   * @param {object} connection
   *   An active transaction (or pool query helper) to use for the INSERT.
   * @param {number} userId
   * @param {string} role - The role string to embed in the JWT payload.
   * @returns {Promise<TokenPair>}
   */
  async #issueTokens(connection, userId, role) {
    const { access, refresh } = this.#fastify.config.auth.token;
    const accessToken = this.#fastify.jwt.sign({ id: userId, role }, { expiresIn: access.expires });

    const rawRefresh = generateRefreshToken();
    const tokenHash = sha256(rawRefresh);
    const expiresAtMs = this.#parseExpiry(refresh.expires);
    const expiresAt = new Date(Date.now() + expiresAtMs);

    await connection.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt],
    );

    return { accessToken, refreshToken: rawRefresh };
  }

  /**
   * @param {import('fastify').FastifyInstance & { db: import('../plugins/mariadb.js').FastifyDB }} fastify
   */
  constructor(fastify) {
    this.#fastify = fastify;
  }

  /**
   * Parse a duration string (e.g. '30d', '15m') into milliseconds.
   *
   * @param {string} value
   * @returns {number}
   */
  #parseExpiry(value) {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 0;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return num * multipliers[unit];
  }

  /**
   * Create a new user account and immediately issue auth tokens.
   *
   * @param {string} username
   * @param {string} email
   * @param {string} password - Plain-text password; hashed with bcrypt before storage.
   * @returns {Promise<AuthResult>}
   * @throws {ApiError} 409 – if the username or e-mail is already taken.
   */
  async register(username, email, password) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const existing = await transaction.query(
        'SELECT id FROM user WHERE email = ? OR username = ? LIMIT 1',
        [email, username],
      );
      if (existing.length > 0) {
        throw new ApiError(409, 'Username or email already in use');
      }

      const hash = await bcrypt.hash(password, 12);
      const result = await transaction.query(
        'INSERT INTO user (username, email,password) VALUES (?, ?, ?)',
        [username, email, hash],
      );

      const userId = Number(result.insertId);
      const { accessToken, refreshToken } = await this.#issueTokens(transaction, userId, 'user');

      await transaction.commit();

      return {
        accessToken,
        refreshToken,
        user: { id: userId, username, email, role: 'user' },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Verify credentials and issue auth tokens for an existing user.
   *
   * @param {string} email
   * @param {string} password - Plain-text password to verify against the stored hash.
   * @returns {Promise<AuthResult>}
   * @throws {ApiError} 401 – if the credentials are invalid.
   */
  async login(email, password) {
    const user = await this.#fastify.db.queryOne(
      'SELECT id, username, email, password, role FROM user WHERE email = ? LIMIT 1',
      [email],
    );

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const transaction = await this.#fastify.db.transaction();

    try {
      const userId = Number(user.id);
      const { accessToken, refreshToken } = await this.#issueTokens(transaction, userId, user.role);

      await transaction.commit();

      return {
        accessToken,
        refreshToken,
        user: { id: userId, username: user.username, email: user.email, role: user.role },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Rotate a refresh token: validate the stored token, delete it, and issue a
   * fresh token pair (token rotation prevents replay attacks).
   *
   * @param {string} refreshToken - The opaque refresh token received from the client.
   * @returns {Promise<TokenPair>}
   * @throws {ApiError} 401 – if the token is not found or has expired.
   */
  async refresh(refreshToken) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const hash = sha256(refreshToken);
      const stored = await transaction.queryOne(
        `SELECT rt.id, rt.user_id, rt.expires_at, u.role
           FROM refresh_tokens rt
           JOIN user u ON u.id = rt.user_id
           WHERE rt.token_hash = ? LIMIT 1`,
        [hash],
      );

      if (!stored || new Date(stored.expires_at) < new Date()) {
        if (stored) {
          await transaction.query('DELETE FROM refresh_tokens WHERE id = ?', [stored.id]);
        }
        throw new ApiError(401, 'Refresh token invalid or expired');
      }

      await transaction.query('DELETE FROM refresh_tokens WHERE id = ?', [stored.id]);

      const userId = Number(stored.user_id);
      const { accessToken, refreshToken: newRefreshToken } = await this.#issueTokens(
        transaction,
        userId,
        stored.role,
      );

      await transaction.commit();

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Invalidate a refresh token so it can no longer be used.
   * A missing or unknown token is silently ignored.
   *
   * @param {string | undefined} refreshToken - The opaque refresh token to revoke.
   * @returns {Promise<void>}
   */
  async logout(refreshToken) {
    if (refreshToken) {
      const nHash = sha256(refreshToken);
      await this.#fastify.db.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [nHash]);
    }
    return;
  }

  /**
   * Update the password for an authenticated user after verifying the current one.
   *
   * @param {number} userId          - ID of the user whose password should be changed.
   * @param {string} currentPassword - The user's existing plain-text password.
   * @param {string} newPassword     - The new plain-text password; hashed before storage.
   * @returns {Promise<void>}
   * @throws {ApiError} 404 – if no user with the given ID exists.
   * @throws {ApiError} 401 – if `currentPassword` does not match the stored hash.
   */
  async changePassword(userId, currentPassword, newPassword) {
    const transaction = await this.#fastify.db.transaction();

    try {
      const row = await transaction.queryOne('SELECT password FROM user WHERE id = ? LIMIT 1', [
        userId,
      ]);

      if (!row) {
        throw new ApiError(404, 'User not found');
      }

      const match = await bcrypt.compare(currentPassword, row.password);
      if (!match) {
        throw new ApiError(401, 'Current password is incorrect');
      }

      const hash = await bcrypt.hash(newPassword, 12);
      await transaction.query('UPDATE user SET password = ? WHERE id = ?', [hash, userId]);

      // Invalidate all refresh tokens for this user (force re-login on other devices)
      await transaction.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
