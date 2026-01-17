import session from "express-session";

import { getSqlPool, sql } from "./sqlserver.js";

export class SqlServerSessionStore extends session.Store {
  constructor({ ttlMs = 1000 * 60 * 60 * 2, cleanupIntervalMs = 1000 * 60 * 30 } = {}) {
    super();
    this.ttlMs = ttlMs;
    this.cleanupIntervalMs = cleanupIntervalMs;

    this._cleanupTimer = null;
    if (Number.isFinite(this.cleanupIntervalMs) && this.cleanupIntervalMs > 0) {
      this._cleanupTimer = setInterval(() => {
        this.cleanupExpiredSessions().catch(() => {
          // best-effort; do not crash the process
        });
      }, this.cleanupIntervalMs);
      this._cleanupTimer.unref?.();
    }
  }

  async cleanupExpiredSessions() {
    const pool = await getSqlPool();
    await pool.request().query("DELETE FROM dbo.[SESSION] WHERE expire < SYSUTCDATETIME();");
  }

  async _getRow(sid) {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("sid", sql.NVarChar(128), sid)
      .query("SELECT sess, expire FROM dbo.[SESSION] WHERE sid = @sid;");

    return result.recordset?.[0] || null;
  }

  get(sid, callback) {
    this._getRow(sid)
      .then(async (row) => {
        if (!row) return callback(null, null);

        const expire = row.expire ? new Date(row.expire) : null;
        if (expire && expire.getTime() <= Date.now()) {
          await this.destroyAsync(sid);
          return callback(null, null);
        }

        try {
          const sess = JSON.parse(row.sess);
          return callback(null, sess);
        } catch {
          await this.destroyAsync(sid);
          return callback(null, null);
        }
      })
      .catch((err) => callback(err));
  }

  async destroyAsync(sid) {
    const pool = await getSqlPool();
    await pool
      .request()
      .input("sid", sql.NVarChar(128), sid)
      .query("DELETE FROM dbo.[SESSION] WHERE sid = @sid;");
  }

  destroy(sid, callback) {
    this.destroyAsync(sid)
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  async setAsync(sid, sess) {
    const json = JSON.stringify(sess);

    let expireAt = null;
    const cookieExpires = sess?.cookie?.expires ? new Date(sess.cookie.expires) : null;
    if (cookieExpires && !Number.isNaN(cookieExpires.getTime())) {
      expireAt = cookieExpires;
    } else {
      expireAt = new Date(Date.now() + this.ttlMs);
    }

    const pool = await getSqlPool();

    // Upsert
    await pool
      .request()
      .input("sid", sql.NVarChar(128), sid)
      .input("sess", sql.NVarChar(sql.MAX), json)
      .input("expire", sql.DateTime2, expireAt)
      .query(
        "MERGE dbo.[SESSION] AS target " +
          "USING (SELECT @sid AS sid) AS src " +
          "ON target.sid = src.sid " +
          "WHEN MATCHED THEN UPDATE SET sess = @sess, expire = @expire " +
          "WHEN NOT MATCHED THEN INSERT (sid, sess, expire) VALUES (@sid, @sess, @expire);"
      );
  }

  set(sid, sess, callback) {
    this.setAsync(sid, sess)
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  touch(sid, sess, callback) {
    const cookieExpires = sess?.cookie?.expires ? new Date(sess.cookie.expires) : null;
    const expireAt = cookieExpires && !Number.isNaN(cookieExpires.getTime())
      ? cookieExpires
      : new Date(Date.now() + this.ttlMs);

    getSqlPool()
      .then((pool) =>
        pool
          .request()
          .input("sid", sql.NVarChar(128), sid)
          .input("expire", sql.DateTime2, expireAt)
          .query("UPDATE dbo.[SESSION] SET expire = @expire WHERE sid = @sid;")
      )
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }
}
