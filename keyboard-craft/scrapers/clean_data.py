"""
Data cleaner to fix issues with scraped data:
1. Remove products with unreasonable prices (likely parsing errors)
2. Fix missing layout specifications
3. Mark out-of-stock items properly
"""

import sys
import os
import json
import re
from datetime import datetime

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def clean_price(price, name):
    """Clean and validate price"""
    if price <= 0:
        return 0, True  # Mark as unavailable
    
    if price > 5000:  # Suspiciously high price
        print(f"⚠️ Removing product with suspicious price: {name} - ${price}")
        return 0, False  # Remove entirely
    
    return price, True

def detect_layout(name, specs):
    """Enhanced layout detection"""
    if specs.get('layout'):
        return specs['layout']  # Already has layout
    
    name_lower = name.lower()
    
    # Layout patterns with more comprehensive detection
    layout_patterns = {
        '40%': ['40%', 'forty', 'planck', 'minila'],
        '60%': ['60%', 'sixty', 'poker', 'hhkb', 'tofu60', 'dz60'],
        '65%': ['65%', 'sixty-five', 'sixty five', 'tofu65', 'nk65', 'kbd67', 'margo', 'voice65', 'think6.5', 'prophet'],
        '75%': ['75%', 'seventy-five', 'seventy five', 'kbd75', 'gmmk pro', 'id80', 'satisfaction75'],
        'TKL': ['tkl', 'tenkeyless', '80%', 'eighty', '87 key', 'mode80', 'mr suit'],
        '96%': ['96%', 'ninety-six', 'compact full'],
        'Full': ['full size', 'full-size', '104 key', '100%'],
        'Alice': ['alice', 'arisu', 'maja'],
        'Split': ['split', 'ergodox', 'kinesis', 'lily58'],
        'Ortho': ['ortho', 'ortholinear', 'planck', 'preonic'],
    }
    
    for layout, keywords in layout_patterns.items():
        if any(keyword in name_lower for keyword in keywords):
            return layout
    
    # Try to extract from common naming patterns
    size_match = re.search(r'(\d+)%', name_lower)
    if size_match:
        percentage = size_match.group(1)
        return f"{percentage}%"
    
    return None

def enhance_specs(name, specs):
    """Enhance product specifications"""
    enhanced_specs = specs.copy()
    name_lower = name.lower()
    
    # Detect layout if missing
    layout = detect_layout(name, specs)
    if layout:
        enhanced_specs['layout'] = layout
    
    # Detect switch type if missing
    if not specs.get('switch_type'):
        if any(word in name_lower for word in ['linear']):
            enhanced_specs['switch_type'] = 'linear'
        elif any(word in name_lower for word in ['tactile']):
            enhanced_specs['switch_type'] = 'tactile'
        elif any(word in name_lower for word in ['clicky', 'click']):
            enhanced_specs['switch_type'] = 'clicky'
    
    # Detect material if missing
    if not specs.get('material'):
        materials = {
            'aluminum': ['aluminum', 'aluminium', 'alu'],
            'polycarbonate': ['polycarbonate', 'pc'],
            'abs': ['abs'],
            'pbt': ['pbt'],
            'brass': ['brass'],
            'steel': ['steel'],
            'titanium': ['titanium'],
        }
        
        for material, keywords in materials.items():
            if any(keyword in name_lower for keyword in keywords):
                enhanced_specs['material'] = material
                break
    
    return enhanced_specs

def clean_products_data(input_file, output_file=None):
    """Clean the products data"""
    print(f"🧹 Cleaning product data from {input_file}")
    
    # Read the data
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            products = json.load(f)
    except Exception as e:
        print(f"❌ Error reading {input_file}: {e}")
        return
    
    print(f"📊 Found {len(products)} products to clean")
    
    cleaned_products = []
    removed_count = 0
    price_fixed_count = 0
    spec_enhanced_count = 0
    
    for product in products:
        try:
            name = product.get('name', '')
            price = product.get('price', 0)
            specs = product.get('specs', {})
            
            # Clean price
            clean_price_val, keep_product = clean_price(price, name)
            if not keep_product:
                removed_count += 1
                continue
            
            if clean_price_val != price:
                price_fixed_count += 1
                product['price'] = clean_price_val
                if clean_price_val == 0:
                    product['availability'] = 0
            
            # Enhance specs
            original_specs = specs.copy()
            enhanced_specs = enhance_specs(name, specs)
            
            if enhanced_specs != original_specs:
                spec_enhanced_count += 1
                product['specs'] = enhanced_specs
            
            # Update timestamp
            product['updated_at'] = datetime.now().isoformat()
            
            cleaned_products.append(product)
            
        except Exception as e:
            print(f"❌ Error processing product {product.get('name', 'Unknown')}: {e}")
            continue
    
    # Summary
    print(f"\n📊 Cleaning Summary:")
    print(f"   - Original products: {len(products)}")
    print(f"   - Cleaned products: {len(cleaned_products)}")
    print(f"   - Removed products: {removed_count}")
    print(f"   - Price fixes: {price_fixed_count}")
    print(f"   - Spec enhancements: {spec_enhanced_count}")
    
    # Save cleaned data
    if not output_file:
        output_file = input_file.replace('.json', '-cleaned.json')
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(cleaned_products, f, indent=2, ensure_ascii=False)
        print(f"✅ Cleaned data saved to {output_file}")
        
        # Also update the latest-export.json
        latest_file = os.path.join(os.path.dirname(output_file), 'latest-export.json')
        with open(latest_file, 'w', encoding='utf-8') as f:
            json.dump(cleaned_products, f, indent=2, ensure_ascii=False)
        print(f"✅ Updated latest export: {latest_file}")
        
    except Exception as e:
        print(f"❌ Error saving cleaned data: {e}")

def analyze_data(file_path):
    """Analyze the data to show issues"""
    print(f"🔍 Analyzing data from {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            products = json.load(f)
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        return
    
    print(f"📊 Total products: {len(products)}")
    
    # Price analysis
    prices = [p.get('price', 0) for p in products if p.get('price', 0) > 0]
    if prices:
        print(f"\n💰 Price Analysis:")
        print(f"   - Min price: ${min(prices):.2f}")
        print(f"   - Max price: ${max(prices):.2f}")
        print(f"   - Average price: ${sum(prices)/len(prices):.2f}")
        
        # Find expensive items
        expensive = [p for p in products if p.get('price', 0) > 1000]
        if expensive:
            print(f"\n🚨 Expensive items (>${1000}+):")
            for p in expensive[:10]:
                print(f"   - {p.get('name', 'Unknown')}: ${p.get('price', 0)}")
    
    # Layout analysis
    layouts = {}
    no_layout = 0
    for product in products:
        layout = product.get('specs', {}).get('layout')
        if layout:
            layouts[layout] = layouts.get(layout, 0) + 1
        else:
            no_layout += 1
    
    print(f"\n🎹 Layout Analysis:")
    print(f"   - Products without layout: {no_layout}")
    print(f"   - Layout distribution:")
    for layout, count in sorted(layouts.items()):
        print(f"     - {layout}: {count}")
    
    # Category analysis
    categories = {}
    for product in products:
        cat = product.get('category', 'unknown')
        categories[cat] = categories.get(cat, 0) + 1
    
    print(f"\n📂 Category Analysis:")
    for cat, count in sorted(categories.items()):
        print(f"   - {cat}: {count}")

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Clean keyboard product data')
    parser.add_argument('--analyze', action='store_true', help='Analyze data for issues')
    parser.add_argument('--clean', action='store_true', help='Clean the data')
    parser.add_argument('--file', default='../data/products/latest-export.json', help='Input file path')
    args = parser.parse_args()
    
    # Get absolute path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, args.file)
    
    if not os.path.exists(input_file):
        print(f"❌ File not found: {input_file}")
        return
    
    if args.analyze:
        analyze_data(input_file)
    
    if args.clean:
        clean_products_data(input_file)
    
    if not args.analyze and not args.clean:
        print("Please specify --analyze or --clean (or both)")

if __name__ == "__main__":
    main()