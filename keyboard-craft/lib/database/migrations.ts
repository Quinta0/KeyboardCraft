// Database setup and migrations
import Database from 'better-sqlite3';
import path from 'path';

export function setupDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'keyboards.db');
  const db = new Database(dbPath);
  
  // Create products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT CHECK(category IN ('case', 'pcb', 'switches', 'keycaps', 'stabilizers')),
      price REAL,
      currency TEXT DEFAULT 'USD',
      availability INTEGER DEFAULT 1,
      image_url TEXT,
      product_url TEXT,
      retailer TEXT,
      specs TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create price history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT,
      price REAL,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  
  // Create indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_retailer ON products(retailer)');
  
  console.log('✅ Database setup completed');
  db.close();
}

if (require.main === module) {
  setupDatabase();
}