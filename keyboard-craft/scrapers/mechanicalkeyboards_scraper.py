from base_scraper import BaseScraper
from urllib.parse import urljoin
from typing import List, Dict

class MechanicalKeyboardsScraper(BaseScraper):
    def __init__(self):
        super().__init__('https://mechanicalkeyboards.com', 'MechanicalKeyboards')
        self.category_urls = {
            'switches': '/shop/index.php?l=product_list&c=107',
            'keycaps': '/shop/index.php?l=product_list&c=40',
            'case': '/shop/index.php?l=product_list&c=6',
            'pcb': '/shop/index.php?l=product_list&c=300',
            'stabilizers': '/shop/index.php?l=product_list&c=306'
        }
    
    def scrape_category(self, category: str) -> List[Dict]:
        """Scrape MechanicalKeyboards.com category"""
        if category not in self.category_urls:
            print(f"⚠️ Category '{category}' not supported for MechanicalKeyboards")
            return []
        
        products = []
        url = urljoin(self.base_url, self.category_urls[category])
        
        print(f"🔍 Scraping MechanicalKeyboards {category} from {url}")
        
        soup = self.get_page(url)
        if not soup:
            return products
        
        # MechanicalKeyboards.com uses a specific structure
        product_containers = soup.find_all('div', class_='product_listing_container')
        
        if not product_containers:
            # Try alternative selectors
            product_containers = soup.find_all('div', class_='product')
            
        if not product_containers:
            print(f"⚠️ No products found on {url} - trying alternative selectors")
            # Try more generic selectors
            product_containers = soup.select('.product-item, .item, [class*="product"]')
        
        if not product_containers:
            self.debug_page_structure(soup, url)
            return products
        
        print(f"📦 Found {len(product_containers)} product containers")
        
        for container in product_containers:
            try:
                # Extract title - try multiple selectors
                title_elem = (container.find('a', class_='product_listing_name') or
                             container.find('h3') or
                             container.find('h4') or
                             container.find('a'))
                
                if not title_elem:
                    continue
                    
                title = title_elem.get_text(strip=True)
                if not title:
                    continue
                
                # Extract price
                price_elem = (container.find('span', class_='product_listing_price') or
                             container.find('span', class_='price') or
                             container.find('div', class_='price'))
                
                if not price_elem:
                    continue
                
                price_text = price_elem.get_text(strip=True)
                price = self.parse_price(price_text)
                
                if not self.is_valid_product(title, price):
                    continue
                
                # Extract product URL
                product_url = None
                if title_elem and title_elem.get('href'):
                    product_url = urljoin(self.base_url, title_elem['href'])
                
                # Extract image
                img_elem = container.find('img')
                image_url = None
                if img_elem:
                    img_src = img_elem.get('src') or img_elem.get('data-src')
                    if img_src:
                        image_url = urljoin(self.base_url, img_src)
                
                # Get additional details from description if available
                desc_elem = container.find('div', class_='product_listing_description')
                description = desc_elem.get_text(strip=True) if desc_elem else ''
                
                # Extract specs
                specs = self.extract_specs(title, description, product_url or '')
                
                # Auto-categorize to ensure accuracy
                detected_category = self.categorize_product(title, [], product_url or '')
                if detected_category != 'unknown':
                    actual_category = detected_category
                else:
                    actual_category = category
                
                # Check availability
                availability = 1
                availability_elem = container.find('span', class_='product_listing_stock')
                if availability_elem:
                    stock_text = availability_elem.get_text(strip=True).lower()
                    if any(phrase in stock_text for phrase in ['out of stock', 'sold out', 'unavailable']):
                        availability = 0
                
                product = {
                    'name': title,
                    'category': actual_category,
                    'price': price,
                    'retailer': self.retailer_name,
                    'product_url': product_url,
                    'image_url': image_url,
                    'specs': specs,
                    'availability': availability
                }
                
                products.append(product)
                print(f"✅ Found: {title} - ${price}")
                
            except Exception as e:
                print(f"❌ Error parsing MechanicalKeyboards product: {e}")
                continue
        
        print(f"📦 Found {len(products)} products in {category} from MechanicalKeyboards")
        return products