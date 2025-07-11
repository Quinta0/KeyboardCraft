import Database from 'better-sqlite3';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const dbPath = path.join(process.cwd(), 'data', 'keyboards.db');
    const db = new Database(dbPath, { readonly: true });

    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY price ASC';

    const stmt = db.prepare(query);
    const products = stmt.all(...params);

    // Parse specs JSON for each product
    const processedProducts = products.map(product => ({
      ...product,
      specs: product.specs ? JSON.parse(product.specs) : {}
    }));

    db.close();

    return NextResponse.json(processedProducts);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}