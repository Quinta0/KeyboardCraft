from base_scraper import BaseScraper
from urllib.parse import urljoin
from typing import List, Dict

class NovelKeysScraper(BaseScraper):
    def __init__(self):
        super().__init__('https://novelkeys.com', 'NovelKeys')
        self.category_urls = {
            'switches': '/collections/switches',
            'keycaps': '/collections/keycaps',
            'case': '/collections/keyboards',  # NovelKeys groups cases with keyboards
            'stabilizers': '/collections/switches'  # Often in switches section
        }
    
    def scrape_category(self, category: str) -> List[Dict]:
        """Scrape NovelKeys category"""
        if category not in self.category_urls:
            print(f"⚠️ Category '{category}' not supported for NovelKeys")
            return []
        
        products = []
        url = urljoin(self.base_url, self.category_urls[category])
        
        print(f"🔍 Scraping NovelKeys {category} from {url}")
        
        soup = self.get_page(url)
        if not soup:
            return products
        
        # NovelKeys uses different class names
        product_items = soup.find_all('div', class_='product-card')
        
        if not product_items:
            # Try alternative selectors
            product_items = soup.find_all('div', class_='grid-product') or soup.find_all('div', class_='product-item')
        
        if not product_items:
            print(f"⚠️ No products found on {url} - site structure may have changed")
            return products
        
        for item in product_items:
            try:
                title_elem = (item.find('h3', class_='product-card__title') or 
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
                
                # Skip if not relevant to category
                if category == 'case' and any(word in title.lower() for word in ['switch', 'key', 'stab']):
                    continue
                
                price = self.parse_price(price_elem.get_text(strip=True))
                
                if price == 0:
                    continue
                
                product_url = urljoin(self.base_url, link_elem['href']) if link_elem else None
                image_url = img_elem.get('src') or img_elem.get('data-src') if img_elem else None
                
                if image_url and not image_url.startswith('http'):
                    image_url = urljoin(self.base_url, image_url)
                
                specs = self.extract_specs(title)
                
                # Auto-categorize if we're in a mixed category
                detected_category = self.categorize_product(title)
                if detected_category != 'unknown':
                    actual_category = detected_category
                else:
                    actual_category = category
                
                product = {
                    'name': title,
                    'category': actual_category,
                    'price': price,
                    'retailer': self.retailer_name,
                    'product_url': product_url,
                    'image_url': image_url,
                    'specs': specs,
                    'availability': 1
                }
                
                # Only add if it matches our target category or is close enough
                if actual_category == category or (category == 'case' and actual_category in ['pcb']):
                    products.append(product)
                    print(f"✅ Found: {title} - ${price}")
                
            except Exception as e:
                print(f"❌ Error parsing NovelKeys product: {e}")
                continue
        
        print(f"📦 Found {len(products)} products in {category} from NovelKeys")
        return products