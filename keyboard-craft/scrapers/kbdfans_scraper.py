from base_scraper import BaseScraper
from urllib.parse import urljoin
from typing import List, Dict

class KBDfansScraper(BaseScraper):
    def __init__(self):
        super().__init__('https://kbdfans.com', 'KBDfans')
        self.category_urls = {
            'switches': '/collections/switches',
            'keycaps': '/collections/keycaps',
            'case': '/collections/case',
            'pcb': '/collections/pcb',
            'stabilizers': '/collections/stabilizers'
        }
    
    def scrape_category(self, category: str) -> List[Dict]:
        """Scrape a specific category"""
        if category not in self.category_urls:
            print(f"⚠️ Category '{category}' not supported for KBDfans")
            return []
        
        products = []
        url = urljoin(self.base_url, self.category_urls[category])
        
        print(f"🔍 Scraping KBDfans {category} from {url}")
        
        soup = self.get_page(url)
        if not soup:
            return products
        
        # KBDfans uses grid layout with product items
        product_items = soup.find_all('div', class_='product-item')
        
        if not product_items:
            # Try alternative selectors
            product_items = soup.find_all('div', class_='grid-product')
            
        if not product_items:
            print(f"⚠️ No products found on {url} - site structure may have changed")
            return products
        
        for item in product_items:
            try:
                # Extract product info - try multiple selectors
                title_elem = (item.find('h3', class_='product-item__title') or 
                             item.find('a', class_='grid-product__title') or
                             item.find('h3') or
                             item.find('a'))
                
                price_elem = (item.find('span', class_='price') or 
                             item.find('span', class_='money') or
                             item.find('div', class_='price'))
                
                link_elem = item.find('a')
                img_elem = item.find('img')
                
                if not (title_elem and price_elem):
                    continue
                
                title = title_elem.get_text(strip=True)
                price_text = price_elem.get_text(strip=True)
                price = self.parse_price(price_text)
                
                if price == 0:  # Skip if we couldn't parse the price
                    continue
                
                product_url = urljoin(self.base_url, link_elem['href']) if link_elem else None
                image_url = img_elem.get('src') or img_elem.get('data-src') if img_elem else None
                
                # Make sure image URL is absolute
                if image_url and not image_url.startswith('http'):
                    image_url = urljoin(self.base_url, image_url)
                
                # Get additional details from product page
                specs = self.extract_specs(title)
                
                product = {
                    'name': title,
                    'category': category,
                    'price': price,
                    'retailer': self.retailer_name,
                    'product_url': product_url,
                    'image_url': image_url,
                    'specs': specs,
                    'availability': 1 if 'sold out' not in price_text.lower() else 0
                }
                
                products.append(product)
                print(f"✅ Found: {title} - ${price}")
                
            except Exception as e:
                print(f"❌ Error parsing KBDfans product: {e}")
                continue
        
        print(f"📦 Found {len(products)} products in {category} from KBDfans")
        return products