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
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        })
    
    def get_page(self, url: str, delay: float = 2.0, retries: int = 3):
        """Get and parse a webpage with rate limiting and retries"""
        for attempt in range(retries):
            print(f"🌐 Fetching: {url} (attempt {attempt + 1}/{retries})")
            time.sleep(delay)  # Be respectful
            
            try:
                # Rotate user agent for each request
                self.session.headers['User-Agent'] = self.ua.random
                
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                
                # Check if we got actual content
                if len(response.content) < 1000:
                    print(f"⚠️ Suspicious small response size: {len(response.content)} bytes")
                
                soup = BeautifulSoup(response.content, 'lxml')
                
                # Basic check for valid page
                if not soup.find('body'):
                    print(f"⚠️ No body tag found in response")
                    continue
                    
                return soup
                
            except requests.exceptions.RequestException as e:
                print(f"❌ Request error (attempt {attempt + 1}): {e}")
                if attempt < retries - 1:
                    time.sleep(delay * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    print(f"❌ Failed to fetch {url} after {retries} attempts")
                    return None
            except Exception as e:
                print(f"❌ Unexpected error: {e}")
                return None
        
        return None
    
    def parse_price(self, price_text: str) -> float:
        """Extract price from text with better parsing"""
        if not price_text:
            return 0.0
        
        # Remove common currency symbols and clean text
        clean_text = price_text.replace('$', '').replace('USD', '').replace(',', '').strip()
        
        # Look for price patterns
        price_patterns = [
            r'(\d+\.?\d*)',  # Basic decimal number
            r'(\d+,\d+\.?\d*)',  # Number with comma separator
            r'(\d+\s*\.\s*\d+)',  # Number with spaced decimal
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, clean_text)
            if match:
                try:
                    price_str = match.group(1).replace(',', '').replace(' ', '')
                    return float(price_str)
                except ValueError:
                    continue
        
        print(f"⚠️ Could not parse price from: '{price_text}'")
        return 0.0
    
    def categorize_product(self, title: str, tags: List[str] = None, url: str = '') -> str:
        """Categorize product based on title, tags, and URL"""
        title_lower = title.lower()
        tags_lower = [tag.lower() for tag in (tags or [])]
        url_lower = url.lower()
        all_text = f"{title_lower} {' '.join(tags_lower)} {url_lower}"
        
        # Switch keywords
        switch_keywords = ['switch', 'switches', 'mx', 'gateron', 'cherry', 'kailh', 'linear', 'tactile', 'clicky', 'holy panda']
        if any(word in all_text for word in switch_keywords):
            return 'switches'
        
        # Keycap keywords
        keycap_keywords = ['keycap', 'keycaps', 'pbt', 'abs', 'gmk', 'cherry profile', 'sa profile', 'oem profile', 'xda', 'dsa']
        if any(word in all_text for word in keycap_keywords):
            return 'keycaps'
        
        # Case keywords
        case_keywords = ['case', 'housing', 'aluminum', 'tofu', 'frame', 'chassis', 'keyboard kit', 'plate']
        if any(word in all_text for word in case_keywords):
            return 'case'
        
        # PCB keywords
        pcb_keywords = ['pcb', 'circuit', 'board', 'hotswap', 'hot-swap', 'soldered']
        if any(word in all_text for word in pcb_keywords):
            return 'pcb'
        
        # Stabilizer keywords
        stab_keywords = ['stabilizer', 'stabilizers', 'stab', 'stabs', 'durock', 'cherry stab']
        if any(word in all_text for word in stab_keywords):
            return 'stabilizers'
        
        return 'unknown'
    
    def extract_specs(self, title: str, description: str = '', url: str = '') -> Dict:
        """Extract specifications from product title, description, and URL"""
        specs = {}
        text = f"{title} {description} {url}".lower()
        
        # Layout detection
        layout_patterns = {
            '60%': r'60[%\s]|sixty',
            '65%': r'65[%\s]|sixty.?five',
            '75%': r'75[%\s]|seventy.?five',
            'TKL': r'tkl|tenkeyless|80[%\s]|eighty',
            'Full': r'full|104|100[%\s]|full.?size'
        }
        
        for layout, pattern in layout_patterns.items():
            if re.search(pattern, text):
                specs['layout'] = layout
                break
        
        # Switch type detection
        if any(word in text for word in ['linear']):
            specs['switch_type'] = 'linear'
        elif any(word in text for word in ['tactile']):
            specs['switch_type'] = 'tactile'
        elif any(word in text for word in ['clicky', 'click']):
            specs['switch_type'] = 'clicky'
        
        # Pin count detection
        if '5-pin' in text or '5 pin' in text or 'five pin' in text:
            specs['pins'] = 5
        elif '3-pin' in text or '3 pin' in text or 'three pin' in text:
            specs['pins'] = 3
        
        # RGB facing detection
        if 'south-facing' in text or 'south facing' in text:
            specs['facing'] = 'south'
        elif 'north-facing' in text or 'north facing' in text:
            specs['facing'] = 'north'
        
        # Material detection
        materials = ['aluminum', 'aluminium', 'plastic', 'abs', 'pbt', 'polycarbonate', 'pc', 'brass', 'steel']
        for material in materials:
            if material in text:
                if material in ['aluminium']:
                    specs['material'] = 'aluminum'
                elif material == 'pc':
                    specs['material'] = 'polycarbonate'
                else:
                    specs['material'] = material
                break
        
        return specs
    
    def is_valid_product(self, title: str, price: float) -> bool:
        """Check if this looks like a valid product"""
        if not title or len(title.strip()) < 3:
            return False
        
        if price <= 0:
            return False
            
        # Skip obvious non-products
        skip_keywords = ['gift card', 'shipping', 'tax', 'warranty', 'service']
        title_lower = title.lower()
        
        if any(keyword in title_lower for keyword in skip_keywords):
            return False
            
        return True
    
    def debug_page_structure(self, soup, url: str):
        """Debug page structure to help identify why scraping failed"""
        if not soup:
            print(f"🔍 Debug: No soup for {url}")
            return
            
        print(f"🔍 Debug info for {url}:")
        print(f"   - Page title: {soup.title.string if soup.title else 'None'}")
        print(f"   - Body length: {len(str(soup.body)) if soup.body else 0}")
        
        # Look for common product container patterns
        common_selectors = [
            'div[class*="product"]',
            'div[class*="item"]',
            'div[class*="grid"]',
            'article',
            'li[class*="product"]',
            '.product-card',
            '.product-item',
            '.grid-item'
        ]
        
        for selector in common_selectors:
            elements = soup.select(selector)
            if elements:
                print(f"   - Found {len(elements)} elements with selector: {selector}")
                # Show a sample element
                if elements:
                    sample = str(elements[0])[:200]
                    print(f"   - Sample: {sample}...")
                break
        else:
            print("   - No common product containers found")
            
        # Look for pagination or "no results" messages
        no_results_indicators = soup.find_all(text=re.compile(r'no products|no results|0 products|empty', re.I))
        if no_results_indicators:
            print(f"   - Found 'no results' indicators: {[text.strip() for text in no_results_indicators[:3]]}")