// Vercel Serverless Function - 统计数据 API
import { Pool } from '@neondatabase/serverless';

const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const checkDatabase = () => {
  if (!pool) {
    throw new Error('数据库未配置，请在 Vercel 环境变量中添加 DATABASE_URL');
  }
};

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '仅支持 GET 请求' });
  }

  try {
    checkDatabase();

    const totalResult = await pool.query('SELECT COUNT(*) as total FROM qian');
    const total = parseInt(totalResult.rows[0].total);

    const luckResult = await pool.query(`
      SELECT luck, COUNT(*) as count 
      FROM qian 
      GROUP BY luck 
      ORDER BY 
        CASE luck 
          WHEN '上上' THEN 1 
          WHEN '大吉' THEN 2 
          WHEN '上吉' THEN 3 
          WHEN '中吉' THEN 4 
          WHEN '中平' THEN 5 
          WHEN '下吉' THEN 6 
          ELSE 7 
        END
    `);

    const goodLuckResult = await pool.query(`SELECT COUNT(*) as count FROM qian WHERE luck IN ('大吉', '上上')`);
    const goodLuckCount = parseInt(goodLuckResult.rows[0].count);

    const bestLuckResult = await pool.query(`SELECT COUNT(*) as count FROM qian WHERE luck = '上吉'`);
    const bestLuckCount = parseInt(bestLuckResult.rows[0].count);

    return res.status(200).json({
      total,
      goodLuckCount,
      bestLuckCount,
      goodLuckPercent: total > 0 ? Math.round(goodLuckCount / total * 100) : 0,
      bestLuckPercent: total > 0 ? Math.round(bestLuckCount / total * 100) : 0,
      luckDistribution: luckResult.rows
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}
