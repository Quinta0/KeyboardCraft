"""
Specific test for KBDfans scraper to debug the issue
"""

import sys
import os

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kbdfans_scraper import KBDfansScraper

def test_kbdfans_detailed():
    """Detailed test of KBDfans scraper"""
    print("🧪 Testing KBDfans Scraper - Detailed Debug")
    print("=" * 60)
    
    scraper = KBDfansScraper()
    
    # Test switches category first (it had 154 elements detected)
    category = 'switches'
    url = 'https://kbdfans.com/collections/switches'
    
    print(f"🔍 Testing {category} from {url}")
    print("-" * 40)
    
    # Get the page and examine its structure
    soup = scraper.get_page(url)
    if not soup:
        print("❌ Failed to get page")
        return
    
    print(f"✅ Got page successfully")
    print(f"📄 Page title: {soup.title.string if soup.title else 'None'}")
    
    # Check for product blocks specifically
    product_blocks = soup.select('.product-block')
    print(f"📦 Found {len(product_blocks)} .product-block elements")
    
    if product_blocks:
        # Examine the first product block in detail
        first_block = product_blocks[0]
        print(f"\n🔍 Examining first product block:")
        print(f"📝 HTML structure (first 500 chars):")
        print(str(first_block)[:500] + "...")
        
        # Try to find title
        title_selectors = [
            '.product-block__title a',
            '.product-block__title',
            'h3 a',
            'h3',
            'a[href*="/products"]'
        ]
        
        for selector in title_selectors:
            title_elem = first_block.select_one(selector)
            if title_elem:
                title = title_elem.get_text(strip=True)
                print(f"✅ Found title with '{selector}': {title}")
                break
        else:
            print("❌ No title found with any selector")
            
        # Try to find price
        price_selectors = [
            '.money',
            '.price',
            '[class*="price"]',
            'span[class*="money"]'
        ]
        
        for selector in price_selectors:
            price_elem = first_block.select_one(selector)
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                print(f"✅ Found price with '{selector}': {price_text}")
                break
        else:
            print("❌ No price found with any selector")
            
        # Try to find link
        link_elem = first_block.find('a', href=True)
        if link_elem:
            href = link_elem['href']
            print(f"✅ Found link: {href}")
        else:
            print("❌ No link found")
    
    # Now test the actual scraping
    print(f"\n🚀 Testing actual scraping...")
    print("-" * 40)
    
    products = scraper.scrape_category(category)
    
    if products:
        print(f"🎉 SUCCESS! Found {len(products)} products")
        for i, product in enumerate(products[:3]):
            print(f"   {i+1}. {product['name']} - ${product['price']}")
        if len(products) > 3:
            print(f"   ... and {len(products) - 3} more")
    else:
        print(f"❌ FAILED: No products extracted")

if __name__ == "__main__":
    test_kbdfans_detailed()