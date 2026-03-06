// Vercel Serverless Function - 签文数据 API
import { Pool } from '@neondatabase/serverless';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 设置 CORS 头
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req, res) {
  // 设置 CORS
  setCorsHeaders(res);

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const { id } = req.query;

  try {
    switch (method) {
      case 'GET':
        if (id) {
          // 获取单个签文
          const result = await pool.query(
            'SELECT * FROM qian WHERE id = $1',
            [id]
          );
          if (result.rows.length === 0) {
            return res.status(404).json({ error: '签文不存在' });
          }
          return res.status(200).json(result.rows[0]);
        } else {
          // 获取所有签文（支持搜索和筛选）
          const { search, luck, page = 1, limit = 10 } = req.query;
          
          let whereClause = '';
          const params = [];
          let paramIndex = 1;

          if (search) {
            whereClause += `WHERE (id ILIKE $${paramIndex} OR story ILIKE $${paramIndex} OR poem ILIKE $${paramIndex}) `;
            params.push(`%${search}%`);
            paramIndex++;
          }

          if (luck) {
            whereClause += whereClause ? 'AND ' : 'WHERE ';
            whereClause += `luck = $${paramIndex} `;
            params.push(luck);
            paramIndex++;
          }

          // 获取总数
          const countResult = await pool.query(
            `SELECT COUNT(*) FROM qian ${whereClause}`,
            params
          );
          const total = parseInt(countResult.rows[0].count);

          // 获取分页数据
          const offset = (parseInt(page) - 1) * parseInt(limit);
          const dataParams = [...params, parseInt(limit), offset];
          
          const result = await pool.query(
            `SELECT * FROM qian ${whereClause}ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            dataParams
          );

          return res.status(200).json({
            data: result.rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
          });
        }

      case 'POST':
        // 创建新签文
        const { id: newId, luck, story, poem, summary, advice } = req.body;
        
        if (!newId || !luck || !story || !poem || !summary || !advice) {
          return res.status(400).json({ error: '所有字段都是必填的' });
        }

        try {
          const result = await pool.query(
            `INSERT INTO qian (id, luck, story, poem, summary, advice) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [newId, luck, story, poem, summary, advice]
          );
          return res.status(201).json(result.rows[0]);
        } catch (error) {
          if (error.code === '23505') {
            return res.status(409).json({ error: '签号已存在' });
          }
          throw error;
        }

      case 'PUT':
        // 更新签文
        if (!id) {
          return res.status(400).json({ error: '缺少签号参数' });
        }

        const { luck: updateLuck, story: updateStory, poem: updatePoem, 
                summary: updateSummary, advice: updateAdvice } = req.body;

        if (!updateLuck || !updateStory || !updatePoem || !updateSummary || !updateAdvice) {
          return res.status(400).json({ error: '所有字段都是必填的' });
        }

        const updateResult = await pool.query(
          `UPDATE qian 
           SET luck = $1, story = $2, poem = $3, summary = $4, advice = $5, updated_at = CURRENT_TIMESTAMP
           WHERE id = $6 
           RETURNING *`,
          [updateLuck, updateStory, updatePoem, updateSummary, updateAdvice, id]
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({ error: '签文不存在' });
        }

        return res.status(200).json(updateResult.rows[0]);

      case 'DELETE':
        // 删除签文
        if (!id) {
          return res.status(400).json({ error: '缺少签号参数' });
        }

        const deleteResult = await pool.query(
          'DELETE FROM qian WHERE id = $1 RETURNING *',
          [id]
        );

        if (deleteResult.rows.length === 0) {
          return res.status(404).json({ error: '签文不存在' });
        }

        return res.status(200).json({ message: '删除成功', deleted: deleteResult.rows[0] });

      default:
        return res.status(405).json({ error: '不支持的请求方法' });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
}
