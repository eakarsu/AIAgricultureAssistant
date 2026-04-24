const pool = require('../config/database');

const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          await pool.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              req.user.id,
              action,
              entityType,
              body?.record?.id || body?.id || req.params?.id || null,
              JSON.stringify({
                body: req.body,
                params: req.params
              }),
              req.ip
            ]
          );
        }
      } catch (err) {
        console.error('Audit log error:', err.message);
      }
      return originalJson(body);
    };

    next();
  };
};

module.exports = { auditLog };
