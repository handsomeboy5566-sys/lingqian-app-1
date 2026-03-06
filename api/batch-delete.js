// Vercel Serverless Function - 批量删除 API
import { Pool } from '@neondatabase/serverless';

const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  try {
    checkDatabase();

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的签号列表' });
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    
    const result = await pool.query(
      `DELETE FROM qian WHERE id IN (${placeholders}) RETURNING *`,
      ids
    );

    return res.status(200).json({
      message: '批量删除成功',
      deletedCount: result.rowCount,
      deleted: result.rows
    });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}
