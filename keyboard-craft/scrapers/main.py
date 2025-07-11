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
from mechanicalkeyboards_scraper import MechanicalKeyboardsScraper

class KeyboardScraperManager:
    def __init__(self, dev_mode=False):
        self.db = DatabaseManager()
        self.dev_mode = dev_mode
        self.scrapers = {
            'novelkeys': NovelKeysScraper(),
            'kbdfans': KBDfansScraper(),
            'mechanicalkeyboards': MechanicalKeyboardsScraper(),
        }
        
        # In dev mode, only scrape a few categories and fewer retailers
        if dev_mode:
            self.categories = ['switches', 'keycaps']
            # Only use NovelKeys in dev mode as it's most reliable
            self.scrapers = {'novelkeys': NovelKeysScraper()}
        else:
            self.categories = ['switches', 'keycaps', 'case', 'pcb', 'stabilizers']
    
    def test_scraper(self, scraper_name: str):
        """Test a single scraper"""
        if scraper_name not in self.scrapers:
            print(f"❌ Scraper '{scraper_name}' not found")
            return
        
        scraper = self.scrapers[scraper_name]
        print(f"🧪 Testing {scraper_name} scraper...")
        
        # Test with switches category
        try:
            products = scraper.scrape_category('switches')
            if products:
                print(f"✅ {scraper_name} test successful: {len(products)} products found")
                # Show first product as example
                print(f"   Example: {products[0]['name']} - ${products[0]['price']}")
            else:
                print(f"⚠️ {scraper_name} test returned no products")
        except Exception as e:
            print(f"❌ {scraper_name} test failed: {e}")
    
    def scrape_retailer(self, retailer_name: str):
        """Scrape a specific retailer"""
        if retailer_name not in self.scrapers:
            print(f"❌ Retailer '{retailer_name}' not found")
            return []
        
        scraper = self.scrapers[retailer_name]
        print(f"\n🏪 === Scraping {retailer_name.upper()} ===")
        
        all_products = []
        
        for category in self.categories:
            try:
                print(f"📂 Category: {category}")
                products = scraper.scrape_category(category)
                
                if products:
                    # Save to database immediately
                    saved_count = self.db.save_products(products)
                    print(f"💾 Saved {saved_count}/{len(products)} {category} products from {retailer_name}")
                    all_products.extend(products)
                else:
                    print(f"⚠️ No products found for {category} from {retailer_name}")
                
                # Be respectful - wait between categories
                if not self.dev_mode:
                    import time
                    time.sleep(3)
                
            except Exception as e:
                print(f"❌ Error scraping {category} from {retailer_name}: {e}")
                import traceback
                traceback.print_exc()
        
        return all_products
    
    def scrape_all(self):
        """Scrape all sites and categories"""
        print(f"🚀 Starting scrape at {datetime.now()}")
        print(f"📊 Mode: {'Development' if self.dev_mode else 'Production'}")
        print(f"🏪 Retailers: {', '.join(self.scrapers.keys())}")
        print(f"📂 Categories: {', '.join(self.categories)}")
        
        all_products = []
        retailer_stats = {}
        
        for scraper_name in self.scrapers.keys():
            try:
                products = self.scrape_retailer(scraper_name)
                retailer_stats[scraper_name] = len(products)
                all_products.extend(products)
                
            except Exception as e:
                print(f"💥 Fatal error scraping {scraper_name}: {e}")
                retailer_stats[scraper_name] = 0
                import traceback
                traceback.print_exc()
        
        # Print summary
        print(f"\n✅ Scraping completed!")
        print(f"📊 Summary by retailer:")
        for retailer, count in retailer_stats.items():
            print(f"   - {retailer}: {count} products")
        print(f"📊 Total products processed: {len(all_products)}")
        
        # Export latest data
        if all_products:
            export_file = self.db.export_to_json('latest-export.json')
            print(f"📄 Latest data exported to: {export_file}")
        else:
            print("⚠️ No products to export")
        
        return all_products
    
    def scrape_category(self, category: str):
        """Scrape a specific category from all retailers"""
        print(f"🎯 Scraping category: {category}")
        
        all_products = []
        for scraper_name, scraper in self.scrapers.items():
            try:
                print(f"\n🏪 {scraper_name} - {category}")
                products = scraper.scrape_category(category)
                if products:
                    saved_count = self.db.save_products(products)
                    print(f"💾 Saved {saved_count} {category} products from {scraper_name}")
                    all_products.extend(products)
                else:
                    print(f"⚠️ No {category} products from {scraper_name}")
            except Exception as e:
                print(f"❌ Error scraping {category} from {scraper_name}: {e}")
        
        return all_products

def main():
    parser = argparse.ArgumentParser(description='Scrape keyboard component data')
    parser.add_argument('--dev', action='store_true', help='Run in development mode (fewer categories)')
    parser.add_argument('--category', help='Scrape specific category only')
    parser.add_argument('--retailer', help='Scrape specific retailer only')
    parser.add_argument('--test', help='Test a specific scraper')
    parser.add_argument('--list', action='store_true', help='List available scrapers')
    args = parser.parse_args()
    
    try:
        scraper_manager = KeyboardScraperManager(dev_mode=args.dev)
        
        if args.list:
            print("Available scrapers:")
            for name in scraper_manager.scrapers.keys():
                print(f"  - {name}")
            return
        
        if args.test:
            scraper_manager.test_scraper(args.test)
            return
        
        if args.retailer:
            if args.retailer not in scraper_manager.scrapers:
                print(f"❌ Unknown retailer: {args.retailer}")
                print(f"Available: {', '.join(scraper_manager.scrapers.keys())}")
                return
            scraper_manager.scrape_retailer(args.retailer)
            return
        
        if args.category:
            if args.category not in scraper_manager.categories:
                print(f"❌ Unknown category: {args.category}")
                print(f"Available: {', '.join(scraper_manager.categories)}")
                return
            scraper_manager.scrape_category(args.category)
            return
        
        # Default: scrape everything
        scraper_manager.scrape_all()
            
    except KeyboardInterrupt:
        print("\n🛑 Scraping interrupted by user")
    except Exception as e:
        print(f"💥 Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()