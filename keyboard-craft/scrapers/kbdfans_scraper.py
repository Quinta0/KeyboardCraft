from base_scraper import BaseScraper
from urllib.parse import urljoin
from typing import List, Dict
import re

class KBDfansScraper(BaseScraper):
    def __init__(self):
        super().__init__('https://kbdfans.com', 'KBDfans')
        self.category_urls = {
            'switches': '/collections/switches',
            'keycaps': '/collections/keycaps', 
            'case': '/collections/case',
            'pcb': '/collections/pcb',
            'stabilizers': '/collections/keyboard-stabilizer'  # Fixed URL
        }
        
        # Alternative URLs to try if primary fails
        self.alternative_urls = {
            'switches': ['/collections/cherry-switches'],
            'keycaps': ['/collections/cherry-profile', '/collections/oem-profile'],
            'case': ['/collections/diy-kit'],
            'pcb': ['/collections/diy-kit'],  # PCBs are often in DIY kits
            'stabilizers': []
        }
    
    def scrape_category(self, category: str) -> List[Dict]:
        """Scrape a specific category with fallback URLs"""
        if category not in self.category_urls:
            print(f"⚠️ Category '{category}' not supported for KBDfans")
            return []
        
        # Try primary URL first
        urls_to_try = [self.category_urls[category]]
        
        # Add alternative URLs
        if category in self.alternative_urls:
            urls_to_try.extend(self.alternative_urls[category])
        
        for url in urls_to_try:
            full_url = urljoin(self.base_url, url)
            print(f"🔍 Trying KBDfans {category} from {full_url}")
            
            products = self._scrape_url(full_url, category)
            if products:
                print(f"✅ Successfully scraped {len(products)} products from {full_url}")
                return products
            else:
                print(f"⚠️ No products found at {full_url}, trying next URL...")
        
        print(f"❌ Failed to scrape {category} from all KBDfans URLs")
        return []
    
    def _scrape_url(self, url: str, category: str) -> List[Dict]:
        """Scrape products from a specific URL"""
        soup = self.get_page(url)
        if not soup:
            return []
        
        products = []
        
        # KBDfans specific selectors based on the debug output
        selector_strategies = [
            # Strategy 1: KBDfans actual structure (from debug output)
            {
                'container': '.product-block',
                'title': '.product-block__title a, .product-block__title, h3 a, h3',
                'price': '.money, .price, [class*="price"]',
                'link': 'a',
                'image': '.product-block__image img, img'
            },
            # Strategy 2: Alternative KBDfans selectors
            {
                'container': '.grid-flex__item, .product-item',
                'title': '.product-title, .title, h3, h4',
                'price': '.money, .price, [data-price]',
                'link': 'a',
                'image': 'img'
            },
            # Strategy 3: Generic fallback
            {
                'container': '[class*="product-block"], [class*="grid-flex__item"]',
                'title': 'a[href*="/products"], h3, h4',
                'price': '.money, [class*="price"], [class*="cost"]',
                'link': 'a[href*="/products"]',
                'image': 'img'
            }
        ]
        
        for strategy in selector_strategies:
            print(f"🔍 Trying KBDfans selector strategy: {strategy['container']}")
            containers = soup.select(strategy['container'])
            
            if containers:
                print(f"📦 Found {len(containers)} product containers")
                products = self._extract_products(containers, strategy, category, url)
                if products:
                    return products
            else:
                print(f"⚠️ No containers found with selector: {strategy['container']}")
        
        # Debug the page if all strategies failed
        self.debug_page_structure(soup, url)
        return []
    
    def _extract_products(self, containers: list, strategy: dict, category: str, base_url: str) -> List[Dict]:
        """Extract product information using the given strategy"""
        products = []
        
        for container in containers:
            try:
                # Extract title - be more flexible with title selection
                title_elem = container.select_one(strategy['title'])
                if not title_elem:
                    # Try more fallback selectors
                    title_elem = (container.find('a', href=re.compile(r'/products/')) or
                                 container.find('h3') or
                                 container.find('h4') or
                                 container.find('a'))
                
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                if not title:
                    continue
                
                # Extract price - be more flexible
                price_elem = container.select_one(strategy['price'])
                if not price_elem:
                    # Try alternative price selectors
                    price_elem = (container.find('span', class_='money') or
                                 container.find('div', class_='price') or
                                 container.find('span', string=re.compile(r'\$\d+')) or
                                 container.find(text=re.compile(r'\$\d+')))
                
                if not price_elem:
                    continue
                
                # Handle price text extraction
                if hasattr(price_elem, 'get_text'):
                    price_text = price_elem.get_text(strip=True)
                else:
                    price_text = str(price_elem).strip()
                
                price = self.parse_price(price_text)
                
                if not self.is_valid_product(title, price):
                    continue
                
                # Extract link
                link_elem = container.select_one(strategy['link'])
                if not link_elem:
                    link_elem = container.find('a', href=re.compile(r'/products/'))
                
                product_url = None
                if link_elem and link_elem.get('href'):
                    product_url = urljoin(base_url, link_elem['href'])
                
                # Extract image
                img_elem = container.select_one(strategy['image'])
                image_url = None
                if img_elem:
                    img_src = (img_elem.get('src') or 
                              img_elem.get('data-src') or 
                              img_elem.get('data-original') or
                              img_elem.get('data-lazy'))
                    if img_src:
                        # Handle relative URLs and lazy loading placeholders
                        if img_src.startswith('//'):
                            img_src = 'https:' + img_src
                        elif img_src.startswith('/'):
                            img_src = urljoin(base_url, img_src)
                        
                        # Skip placeholder images
                        if 'placeholder' not in img_src.lower() and 'loading' not in img_src.lower():
                            image_url = img_src
                
                # Auto-categorize to ensure accuracy
                detected_category = self.categorize_product(title, [], product_url or '')
                if detected_category != 'unknown':
                    actual_category = detected_category
                else:
                    actual_category = category
                
                # Only include products that match our target category
                if actual_category == category:
                    # Extract specs
                    specs = self.extract_specs(title, '', product_url or '')
                    
                    # Check availability
                    availability = 1  # Default to available
                    availability_indicators = container.find_all(text=re.compile(r'sold out|out of stock|unavailable', re.I))
                    if availability_indicators or 'sold out' in price_text.lower():
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
                print(f"❌ Error parsing KBDfans product: {e}")
                continue
        
        print(f"📦 Found {len(products)} valid products in {category} from KBDfans")
        return products