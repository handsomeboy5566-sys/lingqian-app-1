// Vercel Serverless Function - 随机求签 API
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
    
    const result = await pool.query('SELECT * FROM qian ORDER BY RANDOM() LIMIT 1');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '暂无签文数据' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}
