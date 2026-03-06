// Vercel Serverless Function - 统计数据 API
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    // 获取总数
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM qian');
    const total = parseInt(totalResult.rows[0].total);

    // 获取各运势统计
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

    // 计算大吉/上上签数量
    const goodLuckResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM qian 
      WHERE luck IN ('大吉', '上上')
    `);
    const goodLuckCount = parseInt(goodLuckResult.rows[0].count);

    // 计算上吉签数量
    const bestLuckResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM qian 
      WHERE luck = '上吉'
    `);
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
    return res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
}
