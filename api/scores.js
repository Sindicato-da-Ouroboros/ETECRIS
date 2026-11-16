// API do ranking do ETECRIS (função serverless do Vercel)
//   GET  /api/scores  -> devolve o top 10
//   POST /api/scores  -> recebe { name, score } e grava no ranking
//
// Banco: Upstash Redis (instalado pela aba Storage do projeto no Vercel).
// A integração cria as variáveis de ambiente; aqui aceitamos os dois nomes usados.

const { Redis } = require('@upstash/redis');

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const KEY = 'ranking';              // sorted set: membro = "p:<nome>", pontuação = score
const MAX_ENTRIES = 100;            // só guarda os 100 melhores
const TOP_DEFAULT = 10;
const MAX_SCORE = 50000000;         // teto de segurança; ajuste se precisar
const MAX_POSTS_PER_MINUTE = 10;    // por IP

function cleanName(raw) {
    if (typeof raw !== 'string') return null;
    const name = raw
        .normalize('NFC')
        .replace(/[^\p{L}\p{N} _.!-]/gu, '')   // só letras, números, espaço e _ . ! -
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 12);
    return name.length >= 1 ? name : null;
}

function getIp(req) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
    return (req.socket && req.socket.remoteAddress) || 'desconhecido';
}

async function getTop(limit) {
    // Upstash devolve uma lista plana: [membro, score, membro, score, ...]
    const flat = await redis.zrange(KEY, 0, limit - 1, { rev: true, withScores: true });
    const top = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
        top.push({
            name: String(flat[i]).replace(/^p:/, ''),
            score: Number(flat[i + 1])
        });
    }
    return top;
}

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (!redis) {
        return res.status(500).json({ error: 'Banco de dados não configurado.' });
    }

    try {
        if (req.method === 'GET') {
            const limit = Math.min(Math.max(parseInt(req.query && req.query.limit, 10) || TOP_DEFAULT, 1), 20);
            return res.status(200).json({ top: await getTop(limit) });
        }

        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) { body = null; }
            }
            if (!body || typeof body !== 'object') {
                return res.status(400).json({ error: 'Pedido inválido.' });
            }

            const name = cleanName(body.name);
            const score = body.score;
            if (!name) {
                return res.status(400).json({ error: 'Nome inválido.' });
            }
            if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) {
                return res.status(400).json({ error: 'Pontuação inválida.' });
            }

            // limite simples de envios por IP
            const rlKey = `rl:${getIp(req)}`;
            const hits = await redis.incr(rlKey);
            if (hits === 1) await redis.expire(rlKey, 60);
            if (hits > MAX_POSTS_PER_MINUTE) {
                return res.status(429).json({ error: 'Muitos envios. Espere um minuto.' });
            }

            // cada nome guarda só a melhor pontuação
            const member = `p:${name}`;
            const previous = await redis.zscore(KEY, member);
            let best = score;
            let improved = true;
            if (previous !== null && previous !== undefined && Number(previous) >= score) {
                best = Number(previous);
                improved = false;
            } else {
                await redis.zadd(KEY, { score, member });
            }

            // mantém só os MAX_ENTRIES melhores
            await redis.zremrangebyrank(KEY, 0, -(MAX_ENTRIES + 1));

            const rank0 = await redis.zrevrank(KEY, member);
            return res.status(200).json({
                ok: true,
                improved,
                best,
                rank: rank0 === null || rank0 === undefined ? null : Number(rank0) + 1
            });
        }

        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    } catch (e) {
        console.error('Erro na API de ranking:', e);
        return res.status(500).json({ error: 'Erro interno.' });
    }
};
