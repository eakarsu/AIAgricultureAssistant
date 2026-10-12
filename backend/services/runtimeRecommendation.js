"use strict";
const jwt = require('jsonwebtoken');
const failure = (status, message) => Object.assign(new Error(message), { status });

function createRecommendationHandlers({ pool, env = process.env, fetchImpl = (...args) => fetch(...args), timeoutMs = 45000 }) {
  async function freshActor(req, client = pool, lock = false) {
    let actor;
    try { actor = jwt.verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), env.JWT_SECRET); }
    catch { throw failure(401, 'Invalid or expired token'); }
    if (!Number.isInteger(Number(actor.id)) || Number(actor.id) <= 0) throw failure(401, 'Authentication required');
    const row = (await client.query('SELECT id,email,role FROM users WHERE id=$1' + (lock ? ' FOR SHARE' : ''), [actor.id])).rows[0];
    if (!row || row.email !== actor.email || (row.role ?? null) !== (actor.role ?? null)) throw failure(401, 'Your account identity has changed. Please sign in again.');
    return row;
  }
  const history = async (req, res) => {
    try {
      const user = await freshActor(req);
      const rows = (await pool.query('SELECT id,provider,provider_request_id,model,prompt,content,created_at FROM runtime_ai_provider_receipts WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 50', [user.id])).rows;
      res.json({ history: rows });
    } catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : 'Saved recommendations are unavailable. Please retry.' }); }
  };
  const generate = async (req, res) => {
    const controller = new AbortController();
    let timedOut = false, timer, upstream, client, committed = false, clientEnd;
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    const ensureActive = () => {
      if (timedOut) throw failure(504, 'OpenRouter recommendation timed out. Please try again.');
      if (controller.signal.aborted || req.aborted || res.destroyed) throw failure(499, 'Request cancelled');
    };
    const interruptSave = () => { if (client && !committed && !clientEnd) clientEnd = client.end().catch(() => {}); };
    req.on('aborted', disconnect); res.on('close', disconnect);
    try {
      const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
      if (!prompt || prompt.length > 4000) return res.status(400).json({ error: 'prompt must contain 1 to 4000 characters' });
      const user = await freshActor(req);
      ensureActive();
      const apiKey = String(env.OPENROUTER_API_KEY || '').trim(), model = String(env.OPENROUTER_MODEL || '').trim(), baseUrl = String(env.OPENROUTER_BASE_URL || '').replace(/\/+$/, '');
      if (!apiKey || !model || baseUrl !== 'https://openrouter.ai/api/v1') return res.status(503).json({ error: 'The configured OpenRouter model, key, and exact HTTPS endpoint are required' });
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      try {
        upstream = await fetchImpl(baseUrl + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: 'Give concise agricultural operations guidance based only on the supplied non-sensitive facts. State uncertainty and require a qualified human for chemical, safety, or high-impact decisions.' }, { role: 'user', content: prompt }], max_tokens: 1200 }), signal: controller.signal });
      } catch { ensureActive(); throw failure(502, 'OpenRouter could not be reached. Please try again.'); }
      ensureActive();
      if (!upstream.ok) throw failure(502, 'OpenRouter rejected the recommendation (' + upstream.status + ')');
      let payload;
      try { payload = await upstream.json(); } catch { ensureActive(); throw failure(502, 'OpenRouter returned an unreadable response'); }
      ensureActive();
      const content = typeof payload?.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content.trim() : '';
      if (typeof payload?.id !== 'string' || !payload.id.trim() || !content || payload.choices[0].finish_reason === 'length') throw failure(502, 'OpenRouter returned an incomplete answer or missing provider receipt');
      client = await pool.connect();
      controller.signal.addEventListener('abort', interruptSave, { once: true });
      let receipt;
      try {
        ensureActive(); await client.query('BEGIN');
        const fresh = await freshActor(req, client, true);
        if (fresh.id !== user.id) throw failure(401, 'Authentication required');
        ensureActive();
        receipt = (await client.query("INSERT INTO runtime_ai_provider_receipts(user_id,provider,provider_request_id,model,prompt,content) VALUES($1,'openrouter',$2,$3,$4,$5) RETURNING id,provider,provider_request_id,model,created_at", [fresh.id, String(payload.id), String(payload.model || model), prompt, content])).rows[0];
        ensureActive(); await freshActor(req, client, true); ensureActive();
        await client.query('COMMIT'); committed = true;
      } catch (error) {
        if (!controller.signal.aborted && !clientEnd) await client.query('ROLLBACK').catch(() => {});
        ensureActive(); throw error;
      } finally {
        controller.signal.removeEventListener('abort', interruptSave);
        if (clientEnd) await clientEnd;
        client.release(Boolean(clientEnd)); client = null;
      }
      if (!res.destroyed) res.json({ content, receipt });
    } catch (error) {
      if (res.destroyed || req.aborted || (controller.signal.aborted && !timedOut)) return;
      res.status(error.status || 503).json({ error: error.status ? error.message : 'The recommendation could not be saved. Please try again.' });
    } finally {
      clearTimeout(timer); req.removeListener('aborted', disconnect); res.removeListener('close', disconnect);
      if (upstream?.body && !upstream.bodyUsed) await upstream.body.cancel().catch(() => {});
      controller.abort();
    }
  };
  return { history, generate };
}
module.exports = { createRecommendationHandlers };
