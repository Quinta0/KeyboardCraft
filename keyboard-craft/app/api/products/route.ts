import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Define the product interface to match the scraped data
interface ScrapedProduct {
  id: string;
  name: string;
  category: 'case' | 'pcb' | 'switches' | 'keycaps' | 'stabilizers';
  price: number;
  currency: string;
  availability: number;
  image_url?: string;
  product_url?: string;
  retailer: string;
  specs: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Transform scraped product to our frontend format
function transformProduct(scrapedProduct: ScrapedProduct) {
  return {
    id: scrapedProduct.id,
    name: scrapedProduct.name,
    category: scrapedProduct.category,
    price: scrapedProduct.price,
    retailer: scrapedProduct.retailer,
    image_url: scrapedProduct.image_url,
    product_url: scrapedProduct.product_url,
    specs: {
      layout: scrapedProduct.specs.layout,
      pins: scrapedProduct.specs.pins,
      facing: scrapedProduct.specs.facing,
      switch_type: scrapedProduct.specs.switch_type,
      material: scrapedProduct.specs.material,
      ...scrapedProduct.specs // Include any other specs
    },
    availability: scrapedProduct.availability === 1,
    updated_at: scrapedProduct.updated_at
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const retailer = searchParams.get('retailer');

    // Try to read from JSON file first (latest scraped data)
    const jsonPath = path.join(process.cwd(), 'data', 'products', 'latest-export.json');
    let products: ScrapedProduct[] = [];

    if (fs.existsSync(jsonPath)) {
      console.log('📄 Loading products from JSON file:', jsonPath);
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      products = JSON.parse(jsonData);
    } else {
      // Fallback to database if JSON doesn't exist
      console.log('📄 JSON file not found, falling back to database');
      try {
        const Database = require('better-sqlite3');
        const dbPath = path.join(process.cwd(), 'data', 'keyboards.db');
        
        if (fs.existsSync(dbPath)) {
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

          if (retailer) {
            query += ' AND retailer = ?';
            params.push(retailer);
          }

          query += ' ORDER BY price ASC';

          const stmt = db.prepare(query);
          const dbProducts = stmt.all(...params);

          // Transform database products to match our format
          products = dbProducts.map((product: any) => ({
            ...product,
            specs: product.specs ? JSON.parse(product.specs) : {}
          }));

          db.close();
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Return empty array if both JSON and DB fail
        return NextResponse.json([]);
      }
    }

    // Apply filters to JSON data
    let filteredProducts = products;

    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower)
      );
    }

    if (retailer) {
      filteredProducts = filteredProducts.filter(p => p.retailer === retailer);
    }

    // Sort by price
    filteredProducts.sort((a, b) => a.price - b.price);

    // Transform to frontend format
    const transformedProducts = filteredProducts.map(transformProduct);

    console.log(`📦 Returning ${transformedProducts.length} products for category: ${category || 'all'}`);

    return NextResponse.json(transformedProducts);
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error.message }, 
      { status: 500 }
    );
  }
}