import { useState, useEffect } from 'react';

export interface Product {
  id: string;
  name: string;
  category: 'case' | 'pcb' | 'switches' | 'keycaps' | 'stabilizers';
  price: number;
  retailer: string;
  image_url?: string;
  product_url?: string;
  specs: {
    layout?: string;
    pins?: number;
    facing?: 'north' | 'south';
    switch_type?: 'linear' | 'tactile' | 'clicky';
    material?: string;
    [key: string]: any; // Allow additional specs
  };
  availability: boolean;
  updated_at?: string;
}

export type TabType = 'cases' | 'pcb' | 'switches' | 'keycaps' | 'stabilizers';

interface UseProductsOptions {
  category?: string;
  search?: string;
  retailer?: string;
}

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  retailers: string[];
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retailers, setRetailers] = useState<string[]>([]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.search) params.append('search', options.search);
      if (options.retailer) params.append('retailer', options.retailer);
      
      const response = await fetch(`/api/products?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setProducts(data);
        
        // Extract unique retailers
        const uniqueRetailers = [...new Set(data.map(p => p.retailer))].sort();
        setRetailers(uniqueRetailers);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [options.category, options.search, options.retailer]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    retailers
  };
}

// Hook to get products organized by category
export function useProductsByCategory(): {
  productsByCategory: Record<TabType, Product[]>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  totalProducts: number;
  retailers: string[];
} {
  const [productsByCategory, setProductsByCategory] = useState<Record<TabType, Product[]>>({
    cases: [],
    pcb: [],
    switches: [],
    keycaps: [],
    stabilizers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retailers, setRetailers] = useState<string[]>([]);

  const fetchAllProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/products');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }
      
      const allProducts: Product[] = await response.json();
      
      // Group products by category
      const grouped: Record<TabType, Product[]> = {
        cases: [],
        pcb: [],
        switches: [],
        keycaps: [],
        stabilizers: []
      };

      // Map category names to match our TabType
      allProducts.forEach(product => {
        let category: TabType;
        
        switch (product.category) {
          case 'case':
            category = 'cases';
            break;
          case 'pcb':
            category = 'pcb';
            break;
          case 'switches':
            category = 'switches';
            break;
          case 'keycaps':
            category = 'keycaps';
            break;
          case 'stabilizers':
            category = 'stabilizers';
            break;
          default:
            return; // Skip unknown categories
        }
        
        grouped[category].push(product);
      });

      setProductsByCategory(grouped);
      
      // Extract unique retailers
      const uniqueRetailers = [...new Set(allProducts.map(p => p.retailer))].sort();
      setRetailers(uniqueRetailers);
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const totalProducts = Object.values(productsByCategory).reduce(
    (sum, products) => sum + products.length, 
    0
  );

  return {
    productsByCategory,
    loading,
    error,
    refetch: fetchAllProducts,
    totalProducts,
    retailers
  };
}