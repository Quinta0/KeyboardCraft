import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Optional
import os

class DatabaseManager:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Get the project root directory
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.db_path = os.path.join(project_root, 'data', 'keyboards.db')
        else:
            self.db_path = db_path
            
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database with tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Products table
        cursor.execute('''
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
                specs TEXT,  -- JSON string
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Price history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT,
                price REAL,
                recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_retailer ON products(retailer)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at)')
        
        conn.commit()
        conn.close()
        print(f"✅ Database initialized at {self.db_path}")
    
    def save_products(self, products: List[Dict]) -> int:
        """Save products to database, return count of saved items"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        saved_count = 0
        for product in products:
            try:
                # Generate ID from retailer and name
                product_id = f"{product['retailer'].lower()}-{product['name'].lower().replace(' ', '-').replace('/', '-')}"
                product_id = ''.join(c for c in product_id if c.isalnum() or c in '-_')[:50]  # Limit length
                
                # Convert specs to JSON string
                specs_json = json.dumps(product.get('specs', {}))
                
                cursor.execute('''
                    INSERT OR REPLACE INTO products 
                    (id, name, category, price, availability, image_url, product_url, retailer, specs, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    product_id,
                    product['name'],
                    product['category'],
                    product['price'],
                    product.get('availability', 1),
                    product.get('image_url'),
                    product.get('product_url'),
                    product['retailer'],
                    specs_json,
                    datetime.now().isoformat()
                ))
                
                # Save price history
                cursor.execute('''
                    INSERT INTO price_history (product_id, price)
                    VALUES (?, ?)
                ''', (product_id, product['price']))
                
                saved_count += 1
                
            except Exception as e:
                print(f"❌ Error saving product {product.get('name', 'Unknown')}: {e}")
        
        conn.commit()
        conn.close()
        return saved_count
    
    def get_products_json(self, category: Optional[str] = None) -> str:
        """Get products as JSON string"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if category:
            cursor.execute('SELECT * FROM products WHERE category = ? ORDER BY price ASC', (category,))
        else:
            cursor.execute('SELECT * FROM products ORDER BY category, price ASC')
        
        columns = [description[0] for description in cursor.description]
        products = []
        
        for row in cursor.fetchall():
            product = dict(zip(columns, row))
            # Parse specs JSON
            if product['specs']:
                try:
                    product['specs'] = json.loads(product['specs'])
                except:
                    product['specs'] = {}
            products.append(product)
        
        conn.close()
        return json.dumps(products, indent=2)

    def export_to_json(self, filename: str = None) -> str:
        """Export all products to JSON file"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"keyboard_products_{timestamp}.json"
        
        # Save to data/products directory
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        export_path = os.path.join(project_root, 'data', 'products', filename)
        os.makedirs(os.path.dirname(export_path), exist_ok=True)
        
        products_json = self.get_products_json()
        
        with open(export_path, 'w') as f:
            f.write(products_json)
        
        print(f"📄 Products exported to {export_path}")
        return export_path