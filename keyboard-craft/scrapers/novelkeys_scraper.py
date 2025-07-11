from base_scraper import BaseScraper
from urllib.parse import urljoin
from typing import List, Dict

class NovelKeysScraper(BaseScraper):
    def __init__(self):
        super().__init__('https://novelkeys.com', 'NovelKeys')
        self.category_urls = {
            'switches': '/collections/switches',
            'keycaps': '/collections/keycaps',
            'case': '/collections/keyboards',
            'pcb': '/collections/pcbs',  # Added PCB collection
            'stabilizers': '/collections/accessories'  # Try accessories for stabilizers
        }
        
        # Alternative URLs for better coverage
        self.alternative_urls = {
            'stabilizers': ['/collections/switches', '/collections/accessories', '/collections/parts'],
            'pcb': ['/collections/keyboards', '/collections/diy'],
            'case': ['/collections/diy', '/collections/kits']
        }
    
    def scrape_category(self, category: str) -> List[Dict]:
        """Scrape NovelKeys category with improved error handling"""
        if category not in self.category_urls:
            print(f"⚠️ Category '{category}' not supported for NovelKeys")
            return []
        
        # Try primary URL first
        urls_to_try = [self.category_urls[category]]
        
        # Add alternative URLs
        if category in self.alternative_urls:
            urls_to_try.extend(self.alternative_urls[category])
        
        all_products = []
        
        for url in urls_to_try:
            full_url = urljoin(self.base_url, url)
            print(f"🔍 Trying NovelKeys {category} from {full_url}")
            
            products = self._scrape_url(full_url, category)
            
            # Filter products to match target category
            filtered_products = []
            for product in products:
                detected_category = self.categorize_product(product['name'], [], product.get('product_url', ''))
                
                # Only include if it matches our target category or is close enough
                if detected_category == category or (category == 'case' and detected_category in ['pcb']) or \
                   (category == 'stabilizers' and 'stab' in product['name'].lower()):
                    filtered_products.append(product)
            
            if filtered_products:
                print(f"✅ Found {len(filtered_products)} {category} products from {full_url}")
                all_products.extend(filtered_products)
            
        # Remove duplicates based on name and price
        unique_products = []
        seen = set()
        for product in all_products:
            key = (product['name'], product['price'])
            if key not in seen:
                seen.add(key)
                unique_products.append(product)
        
        print(f"📦 Total unique {category} products from NovelKeys: {len(unique_products)}")
        return unique_products
    
    def _scrape_url(self, url: str, category: str) -> List[Dict]:
        """Scrape products from a specific URL"""
        soup = self.get_page(url)
        if not soup:
            return []
        
        products = []
        
        # NovelKeys selector strategies
        selector_strategies = [
            # Strategy 1: Modern NovelKeys product cards
            {
                'container': '.product-card, .grid-product, .product-item',
                'title': '.product-card__title, .grid-product__title, h3, h4',
                'price': '.price, .money, .product-card__price',
                'link': 'a',
                'image': 'img'
            },
            # Strategy 2: Alternative structure
            {
                'container': 'div[data-product-id], article, .product',
                'title': '.product-title, .title, h2, h3',
                'price': '.price, .cost, [class*="price"]',
                'link': 'a',
                'image': 'img'
            },
            # Strategy 3: Generic Shopify structure
            {
                'container': '.grid__item, .collection-product, li[class*="product"]',
                'title': '.product-name, .grid-product__title, h3, h4',
                'price': '.price, .money, [data-price]',
                'link': 'a',
                'image': 'img'
            }
        ]
        
        for strategy in selector_strategies:
            print(f"🔍 Trying NovelKeys selector strategy: {strategy['container']}")
            containers = soup.select(strategy['container'])
            
            if containers:
                print(f"📦 Found {len(containers)} product containers")
                products = self._extract_products(containers, strategy, category, url)
                if products:
                    return products
            else:
                print(f"⚠️ No containers found with selector: {strategy['container']}")
        
        # Debug if no products found
        self.debug_page_structure(soup, url)
        return []
    
    def _extract_products(self, containers: list, strategy: dict, category: str, base_url: str) -> List[Dict]:
        """Extract product information using the given strategy"""
        products = []
        
        for container in containers:
            try:
                # Extract title
                title_elem = container.select_one(strategy['title'])
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                if not title:
                    continue
                
                # Extract price
                price_elem = container.select_one(strategy['price'])
                if not price_elem:
                    continue
                
                price_text = price_elem.get_text(strip=True)
                price = self.parse_price(price_text)
                
                if not self.is_valid_product(title, price):
                    continue
                
                # Extract link
                link_elem = container.select_one(strategy['link'])
                product_url = None
                if link_elem and link_elem.get('href'):
                    product_url = urljoin(base_url, link_elem['href'])
                
                # Extract image
                img_elem = container.select_one(strategy['image'])
                image_url = None
                if img_elem:
                    img_src = img_elem.get('src') or img_elem.get('data-src') or img_elem.get('data-original')
                    if img_src:
                        image_url = urljoin(base_url, img_src)
                
                # Extract specs
                specs = self.extract_specs(title, '', product_url or '')
                
                # Check availability
                availability = 1  # Default to available
                sold_out_indicators = container.select('.sold-out, .unavailable, [class*="sold"]')
                if sold_out_indicators or any(phrase in price_text.lower() for phrase in ['sold out', 'unavailable']):
                    availability = 0
                
                product = {
                    'name': title,
                    'category': category,
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
                print(f"❌ Error parsing NovelKeys product: {e}")
                continue
        
        return products