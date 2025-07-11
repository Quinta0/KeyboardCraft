"""
KeyboardCraft Main Scraper
Run this to scrape all keyboard retailers and update the database.
"""

import sys
import os
import argparse
from datetime import datetime
import json

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db_manager import DatabaseManager
from kbdfans_scraper import KBDfansScraper
from novelkeys_scraper import NovelKeysScraper

class KeyboardScraperManager:
    def __init__(self, dev_mode=False):
        self.db = DatabaseManager()
        self.dev_mode = dev_mode
        self.scrapers = {
            'kbdfans': KBDfansScraper(),
            'novelkeys': NovelKeysScraper(),
        }
        
        # In dev mode, only scrape a few categories
        if dev_mode:
            self.categories = ['switches', 'keycaps']
        else:
            self.categories = ['switches', 'keycaps', 'case', 'pcb', 'stabilizers']
    
    def scrape_all(self):
        """Scrape all sites and categories"""
        print(f"🚀 Starting scrape at {datetime.now()}")
        print(f"📊 Mode: {'Development' if self.dev_mode else 'Production'}")
        
        all_products = []
        
        for scraper_name, scraper in self.scrapers.items():
            print(f"\n🏪 === Scraping {scraper_name.upper()} ===")
            
            for category in self.categories:
                try:
                    print(f"📂 Category: {category}")
                    products = scraper.scrape_category(category)
                    
                    if products:
                        # Save to database immediately
                        saved_count = self.db.save_products(products)
                        print(f"💾 Saved {saved_count}/{len(products)} {category} products from {scraper_name}")
                        all_products.extend(products)
                    else:
                        print(f"⚠️ No products found for {category} from {scraper_name}")
                    
                    # Be respectful - wait between categories
                    if not self.dev_mode:
                        import time
                        time.sleep(3)
                    
                except Exception as e:
                    print(f"❌ Error scraping {category} from {scraper_name}: {e}")
        
        print(f"\n✅ Scraping completed!")
        print(f"📊 Total products processed: {len(all_products)}")
        
        # Export latest data
        export_file = self.db.export_to_json('latest-export.json')
        print(f"📄 Latest data exported to: {export_file}")
        
        return all_products
    
    def scrape_category(self, category: str):
        """Scrape a specific category from all retailers"""
        print(f"🎯 Scraping category: {category}")
        
        all_products = []
        for scraper_name, scraper in self.scrapers.items():
            try:
                products = scraper.scrape_category(category)
                if products:
                    saved_count = self.db.save_products(products)
                    print(f"💾 Saved {saved_count} {category} products from {scraper_name}")
                    all_products.extend(products)
            except Exception as e:
                print(f"❌ Error scraping {category} from {scraper_name}: {e}")
        
        return all_products

def main():
    parser = argparse.ArgumentParser(description='Scrape keyboard component data')
    parser.add_argument('--dev', action='store_true', help='Run in development mode (fewer categories)')
    parser.add_argument('--category', help='Scrape specific category only')
    parser.add_argument('--retailer', help='Scrape specific retailer only')
    args = parser.parse_args()
    
    try:
        scraper_manager = KeyboardScraperManager(dev_mode=args.dev)
        
        if args.category:
            scraper_manager.scrape_category(args.category)
        else:
            scraper_manager.scrape_all()
            
    except KeyboardInterrupt:
        print("\n🛑 Scraping interrupted by user")
    except Exception as e:
        print(f"💥 Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()