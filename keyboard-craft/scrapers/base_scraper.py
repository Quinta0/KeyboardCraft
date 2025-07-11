import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
import time
import re
from typing import Dict, List
from urllib.parse import urljoin, urlparse

class BaseScraper:
    def __init__(self, base_url: str, retailer_name: str):
        self.base_url = base_url
        self.retailer_name = retailer_name
        self.session = requests.Session()
        self.ua = UserAgent()
        self.session.headers.update({
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
    
    def get_page(self, url: str, delay: float = 2.0):
        """Get and parse a webpage with rate limiting"""
        print(f"🌐 Fetching: {url}")
        time.sleep(delay)  # Be respectful
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'lxml')
        except Exception as e:
            print(f"❌ Error fetching {url}: {e}")
            return None
    
    def parse_price(self, price_text: str) -> float:
        """Extract price from text"""
        if not price_text:
            return 0.0
        
        # Remove currency symbols and extract number
        price_match = re.search(r'[\d,]+\.?\d*', price_text.replace(',', ''))
        return float(price_match.group()) if price_match else 0.0
    
    def categorize_product(self, title: str, tags: List[str] = None) -> str:
        """Categorize product based on title and tags"""
        title_lower = title.lower()
        tags_lower = [tag.lower() for tag in (tags or [])]
        all_text = title_lower + ' ' + ' '.join(tags_lower)
        
        if any(word in all_text for word in ['switch', 'mx', 'gateron', 'cherry', 'kailh', 'linear', 'tactile', 'clicky']):
            return 'switches'
        elif any(word in all_text for word in ['keycap', 'pbt', 'abs', 'gmk', 'cherry profile', 'sa profile', 'oem profile']):
            return 'keycaps'
        elif any(word in all_text for word in ['case', 'housing', 'aluminum', 'tofu', 'frame', 'chassis']):
            return 'case'
        elif any(word in all_text for word in ['pcb', 'circuit', 'board', 'hotswap', 'hot-swap']):
            return 'pcb'
        elif any(word in all_text for word in ['stabilizer', 'stab', 'durock', 'cherry stab']):
            return 'stabilizers'
        else:
            return 'unknown'
    
    def extract_specs(self, title: str, description: str = '') -> Dict:
        """Extract specifications from product title and description"""
        specs = {}
        text = f"{title} {description}".lower()
        
        # Layout detection
        layout_patterns = {
            '60%': r'60[%\s]',
            '65%': r'65[%\s]',
            '75%': r'75[%\s]',
            'TKL': r'tkl|tenkeyless|80[%\s]',
            'Full': r'full|104|100[%\s]'
        }
        
        for layout, pattern in layout_patterns.items():
            if re.search(pattern, text):
                specs['layout'] = layout
                break
        
        # Switch type
        if 'linear' in text:
            specs['switch_type'] = 'linear'
        elif 'tactile' in text:
            specs['switch_type'] = 'tactile'
        elif 'clicky' in text:
            specs['switch_type'] = 'clicky'
        
        # Pin count
        if '5-pin' in text or '5 pin' in text:
            specs['pins'] = 5
        elif '3-pin' in text or '3 pin' in text:
            specs['pins'] = 3
        
        # RGB facing
        if 'south-facing' in text or 'south facing' in text:
            specs['facing'] = 'south'
        elif 'north-facing' in text or 'north facing' in text:
            specs['facing'] = 'north'
        
        # Material
        materials = ['aluminum', 'plastic', 'abs', 'pbt', 'polycarbonate']
        for material in materials:
            if material in text:
                specs['material'] = material
                break
        
        return specs