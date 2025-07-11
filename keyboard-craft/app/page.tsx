'use client';

import { useState } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useProductsByCategory, Product, TabType } from '../lib/hooks/useProducts';

interface Product {
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
  };
  availability: boolean;
}

interface SelectedComponents {
  case: Product | null;
  pcb: Product | null;
  switches: Product | null;
  keycaps: Product | null;
  stabilizers: Product | null;
}

type TabType = 'cases' | 'pcb' | 'switches' | 'keycaps' | 'stabilizers';

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'builder'>('landing');
  const [selectedComponents, setSelectedComponents] = useState<SelectedComponents>({
    case: null,
    pcb: null,
    switches: null,
    keycaps: null,
    stabilizers: null,
  });
  const [activeTab, setActiveTab] = useState<TabType>('cases');

  // Use real product data when in builder mode
  const { 
    productsByCategory, 
    loading, 
    error, 
    refetch, 
    totalProducts 
  } = useProductsByCategory();

  // Sample data - in real app this would come from your API
  const sampleProducts: Record<TabType, Product[]> = {
    cases: [
      {
        id: 'tofu65-aluminum',
        name: 'Tofu65 Aluminum',
        category: 'case',
        price: 89.99,
        retailer: 'KBDfans',
        specs: { layout: '65%', material: 'aluminum' },
        availability: true,
      },
      {
        id: 'gmmk-pro',
        name: 'GMMK Pro',
        category: 'case',
        price: 169.99,
        retailer: 'Glorious',
        specs: { layout: '75%', material: 'aluminum' },
        availability: true,
      },
      {
        id: 'nk65-entry',
        name: 'NK65 Entry',
        category: 'case',
        price: 129.99,
        retailer: 'NovelKeys',
        specs: { layout: '65%', material: 'polycarbonate' },
        availability: true,
      },
    ],
    pcb: [
      {
        id: 'dz65rgb-v3',
        name: 'DZ65RGB V3',
        category: 'pcb',
        price: 45.99,
        retailer: 'KBDfans',
        specs: { layout: '65%', pins: 5, facing: 'south' },
        availability: true,
      },
      {
        id: 'gmmk-pro-pcb',
        name: 'GMMK Pro PCB',
        category: 'pcb',
        price: 75.99,
        retailer: 'Glorious',
        specs: { layout: '75%', pins: 5, facing: 'south' },
        availability: true,
      },
      {
        id: 'bakeneko-pcb',
        name: 'Bakeneko PCB',
        category: 'pcb',
        price: 59.99,
        retailer: 'CannonKeys',
        specs: { layout: '65%', pins: 3, facing: 'north' },
        availability: true,
      },
    ],
    switches: [
      {
        id: 'gateron-yellow',
        name: 'Gateron Yellow',
        category: 'switches',
        price: 52.50,
        retailer: 'KBDfans',
        specs: { switch_type: 'linear', pins: 3 },
        availability: true,
      },
      {
        id: 'holy-pandas',
        name: 'Holy Pandas',
        category: 'switches',
        price: 89.99,
        retailer: 'Drop',
        specs: { switch_type: 'tactile', pins: 5 },
        availability: true,
      },
    ],
    keycaps: [
      {
        id: 'gmk-olivia',
        name: 'GMK Olivia',
        category: 'keycaps',
        price: 139.99,
        retailer: 'Drop',
        specs: { material: 'ABS' },
        availability: true,
      },
    ],
    stabilizers: [
      {
        id: 'durock-v2',
        name: 'Durock V2',
        category: 'stabilizers',
        price: 25.99,
        retailer: 'KBDfans',
        specs: { material: 'Gold plated' },
        availability: true,
      },
    ],
  };

  const totalPrice = Object.values(selectedComponents)
    .filter(Boolean)
    .reduce((sum, component) => sum + component!.price, 0);

  const checkCompatibility = (newComponent: Product): { compatible: boolean; reason?: string } => {
    // Check layout compatibility between case and PCB
    if (newComponent.category === 'pcb') {
      const selectedCase = selectedComponents.case;
      if (selectedCase && selectedCase.specs.layout !== newComponent.specs.layout) {
        return {
          compatible: false,
          reason: `${newComponent.specs.layout} PCB won't fit in ${selectedCase.specs.layout} case`
        };
      }
    }
    
    if (newComponent.category === 'case') {
      const selectedPCB = selectedComponents.pcb;
      if (selectedPCB && selectedPCB.specs.layout !== newComponent.specs.layout) {
        return {
          compatible: false,
          reason: `${selectedPCB.specs.layout} PCB won't fit in ${newComponent.specs.layout} case`
        };
      }
    }

    // Check pin compatibility between PCB and switches
    if (newComponent.category === 'switches') {
      const selectedPCB = selectedComponents.pcb;
      if (selectedPCB && selectedPCB.specs.pins === 3 && newComponent.specs.pins === 5) {
        return {
          compatible: false,
          reason: `5-pin switches need leg clipping for 3-pin PCB`
        };
      }
    }

    if (newComponent.category === 'pcb') {
      const selectedSwitches = selectedComponents.switches;
      if (selectedSwitches && newComponent.specs.pins === 3 && selectedSwitches.specs.pins === 5) {
        return {
          compatible: false,
          reason: `5-pin switches need leg clipping for 3-pin PCB`
        };
      }
    }

    return { compatible: true };
  };

  const getIncompatibleComponents = (): Set<string> => {
    const incompatible = new Set<string>();
    
    // Check all products against currently selected components
    Object.values(sampleProducts).flat().forEach(product => {
      const compatibility = checkCompatibility(product);
      if (!compatibility.compatible) {
        incompatible.add(product.id);
      }
    });
    
    return incompatible;
  };

  const incompatibleComponents = getIncompatibleComponents();

  const handleComponentSelect = (component: Product) => {
    const compatibility = checkCompatibility(component);
    
    if (!compatibility.compatible) {
      // Don't allow selection of incompatible components
      return;
    }
    
    setSelectedComponents(prev => ({
      ...prev,
      [component.category]: component,
    }));
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'cases', label: 'Cases', count: productsByCategory.cases?.length || 0 },
    { key: 'pcb', label: 'PCBs', count: productsByCategory.pcb?.length || 0 },
    { key: 'switches', label: 'Switches', count: productsByCategory.switches?.length || 0 },
    { key: 'keycaps', label: 'Keycaps', count: productsByCategory.keycaps?.length || 0 },
    { key: 'stabilizers', label: 'Stabilizers', count: productsByCategory.stabilizers?.length || 0 },
  ];

  if (currentPage === 'landing') {
    return <LandingPage onNavigateToBuilder={() => setCurrentPage('builder')} />;
  }

  // Show error state if products failed to load
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️ Error loading products</div>
          <p className="text-slate-400 mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg mr-4"
          >
            Try Again
          </button>
          <button 
            onClick={() => setCurrentPage('landing')}
            className="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <BuilderPage
      selectedComponents={selectedComponents}
      totalPrice={totalPrice}
      activeTab={activeTab}
      tabs={tabs}
      sampleProducts={productsByCategory}
      loading={loading}
      totalProducts={totalProducts}
      onNavigateToLanding={() => setCurrentPage('landing')}
      onTabChange={setActiveTab}
      onComponentSelect={handleComponentSelect}
      incompatibleComponents={incompatibleComponents}
      checkCompatibility={checkCompatibility}
    />
  );
}

interface LandingPageProps {
  onNavigateToBuilder: () => void;
}

function LandingPage({ onNavigateToBuilder }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">⌨</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                KeyboardCraft
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-slate-300 hover:text-white transition-colors">
                Products
              </a>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">
                Trends
              </a>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">
                Community
              </a>
              <button
                onClick={onNavigateToBuilder}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Build Now
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Build Your
            <span className="block bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Perfect Keyboard
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Compare prices, check compatibility, and track trends across all major keyboard retailers.
            From budget builds to premium boards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onNavigateToBuilder}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
            >
              Start Building
            </button>
            <button className="border border-slate-600 hover:border-slate-400 px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:bg-slate-800">
              Browse Components
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-8">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
                500+
              </div>
              <div className="text-slate-300">Components Tracked</div>
            </div>
            <div className="text-center bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-8">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
                15+
              </div>
              <div className="text-slate-300">Retailers Connected</div>
            </div>
            <div className="text-center bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-8">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
                Daily
              </div>
              <div className="text-slate-300">Price Updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Builds */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Community Favorites</h2>
            <p className="text-xl text-slate-300">Hand-picked builds from keyboard enthusiasts</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Build Card 1 */}
            <div className="bg-slate-800 rounded-xl overflow-hidden transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10">
              <div className="h-48 bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                <span className="text-slate-400 font-medium">Tofu65 Build Image</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Budget Beast</h3>
                <p className="text-slate-300 text-sm mb-3">Tofu65 • Gateron Yellow • PBT Keycaps</p>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  Perfect entry-level build combining affordability with premium feel.
                  Great tactile feedback and clean aesthetics.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-400">$189.99</span>
                  <span className="text-xs px-3 py-1 bg-green-900 text-green-300 rounded-full">
                    Popular
                  </span>
                </div>
              </div>
            </div>

            {/* Build Card 2 */}
            <div className="bg-slate-800 rounded-xl overflow-hidden transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10">
              <div className="h-48 bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                <span className="text-blue-200 font-medium">GMMK Pro Build Image</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Enthusiast Choice</h3>
                <p className="text-slate-300 text-sm mb-3">GMMK Pro • Holy Pandas • GMK Keycaps</p>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  Premium gasket mount with tactile switches and high-end keycaps.
                  Perfect balance of performance and aesthetics.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-400">$349.99</span>
                  <span className="text-xs px-3 py-1 bg-blue-900 text-blue-300 rounded-full">
                    Premium
                  </span>
                </div>
              </div>
            </div>

            {/* Build Card 3 */}
            <div className="bg-slate-800 rounded-xl overflow-hidden transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10">
              <div className="h-48 bg-gradient-to-br from-purple-900 to-purple-700 flex items-center justify-center">
                <span className="text-purple-200 font-medium">Custom Build Image</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Minimalist Pro</h3>
                <p className="text-slate-300 text-sm mb-3">NK65 • Cream Switches • Blank Keycaps</p>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  Clean, minimal aesthetic with smooth linear switches.
                  Perfect for programmers and minimalism lovers.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-400">$259.99</span>
                  <span className="text-xs px-3 py-1 bg-purple-900 text-purple-300 rounded-full">
                    Trending
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={onNavigateToBuilder}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
            >
              Build Your Own
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

interface BuilderPageProps {
  selectedComponents: SelectedComponents;
  totalPrice: number;
  activeTab: TabType;
  tabs: { key: TabType; label: string; count: number }[];
  sampleProducts: Record<TabType, Product[]>;
  loading: boolean;
  totalProducts: number;
  onNavigateToLanding: () => void;
  onTabChange: (tab: TabType) => void;
  onComponentSelect: (component: Product) => void;
  incompatibleComponents: Set<string>;
  checkCompatibility: (component: Product) => { compatible: boolean; reason?: string };
}

function BuilderPage({
  selectedComponents,
  totalPrice,
  activeTab,
  tabs,
  sampleProducts,
  loading,
  totalProducts,
  onNavigateToLanding,
  onTabChange,
  onComponentSelect,
  incompatibleComponents,
  checkCompatibility,
}: BuilderPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">⌨</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                KeyboardCraft
              </span>
            </div>
            <button
              onClick={onNavigateToLanding}
              className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Component Selector */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800 rounded-xl p-6">
              {/* Tab Menu */}
              <div className="flex flex-wrap gap-2 mb-8 p-1 bg-slate-900 rounded-lg">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      activeTab === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sampleProducts[activeTab].map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedComponents[product.category]?.id === product.id}
                    isIncompatible={incompatibleComponents.has(product.id)}
                    incompatibilityReason={
                      incompatibleComponents.has(product.id) 
                        ? checkCompatibility(product).reason 
                        : undefined
                    }
                    onSelect={() => onComponentSelect(product)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Build Summary */}
          <div className="lg:col-span-1">
            <BuildSummary 
              selectedComponents={selectedComponents} 
              totalPrice={totalPrice}
              checkCompatibility={checkCompatibility}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  isIncompatible?: boolean;
  incompatibilityReason?: string;
  onSelect: () => void;
}

function ProductCard({ product, isSelected, isIncompatible, incompatibilityReason, onSelect }: ProductCardProps) {
  const specsText = Object.entries(product.specs)
    .filter(([, value]) => value)
    .map(([, value]) => value)
    .join(' • ');

  return (
    <div
      onClick={isIncompatible ? undefined : onSelect}
      className={`rounded-lg p-4 transition-all duration-200 ${
        isIncompatible
          ? 'bg-slate-900 border-2 border-red-500/50 opacity-60 cursor-not-allowed'
          : isSelected
          ? 'bg-slate-700 border-2 border-blue-500 cursor-pointer'
          : 'bg-slate-900 border-2 border-slate-600 hover:border-blue-400 hover:bg-slate-700 cursor-pointer'
      }`}
    >
      <div className="h-32 bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg mb-4 flex items-center justify-center">
        <span className="text-slate-400 text-sm">{product.name}</span>
      </div>
      <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
      <p className="text-2xl font-bold text-blue-400 mb-2">${product.price.toFixed(2)}</p>
      <p className="text-slate-400 text-sm mb-3">{specsText}</p>
      <div className="text-green-400 text-xs mb-2">✓ {product.retailer} - In Stock</div>
      
      {isIncompatible && incompatibilityReason && (
        <div className="mt-2 px-2 py-1 bg-red-900/50 border border-red-500/50 text-red-300 text-xs rounded">
          ⚠️ {incompatibilityReason}
        </div>
      )}
    </div>
  );
}

interface BuildSummaryProps {
  selectedComponents: SelectedComponents;
  totalPrice: number;
  checkCompatibility: (component: Product) => { compatible: boolean; reason?: string };
}

function BuildSummary({ selectedComponents, totalPrice }: BuildSummaryProps) {
  const hasComponents = Object.values(selectedComponents).some(Boolean);
  
  // Generate compatibility alerts
  const compatibilityAlerts: { type: 'error' | 'warning' | 'success'; message: string }[] = [];
  
  // Check layout compatibility
  if (selectedComponents.case && selectedComponents.pcb) {
    const caseLayout = selectedComponents.case.specs.layout;
    const pcbLayout = selectedComponents.pcb.specs.layout;
    
    if (caseLayout === pcbLayout) {
      compatibilityAlerts.push({
        type: 'success',
        message: `✅ ${selectedComponents.case.name} and ${selectedComponents.pcb.name} are compatible (${caseLayout})`
      });
    } else {
      compatibilityAlerts.push({
        type: 'error',
        message: `⚠️ ${selectedComponents.pcb.name} (${pcbLayout}) won't fit in ${selectedComponents.case.name} (${caseLayout})`
      });
    }
  }
  
  // Check pin compatibility
  if (selectedComponents.pcb && selectedComponents.switches) {
    const pcbPins = selectedComponents.pcb.specs.pins;
    const switchPins = selectedComponents.switches.specs.pins;
    
    if (pcbPins === 3 && switchPins === 5) {
      compatibilityAlerts.push({
        type: 'warning',
        message: `⚠️ ${selectedComponents.switches.name} (5-pin) will need leg clipping for ${selectedComponents.pcb.name} (3-pin)`
      });
    } else if (selectedComponents.pcb && selectedComponents.switches) {
      compatibilityAlerts.push({
        type: 'success',
        message: `✅ ${selectedComponents.switches.name} switches are compatible with ${selectedComponents.pcb.name}`
      });
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 sticky top-24">
      {/* Compatibility Alerts */}
      {compatibilityAlerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {compatibilityAlerts.map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg text-sm ${
                alert.type === 'error'
                  ? 'bg-red-900/30 border border-red-500/50 text-red-300'
                  : alert.type === 'warning'
                  ? 'bg-yellow-900/30 border border-yellow-500/50 text-yellow-300'
                  : 'bg-green-900/30 border border-green-500/50 text-green-300'
              }`}
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-center mb-6">
        <div className="text-3xl font-bold mb-2">${totalPrice.toFixed(2)}</div>
        <div className="text-blue-200">Total Build Cost</div>
      </div>

      {/* Selected Components */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Selected Components</h3>
        <div className="space-y-3">
          {hasComponents ? (
            Object.entries(selectedComponents).map(([type, component]) =>
              component ? (
                <div key={type} className="bg-slate-900 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{component.name}</div>
                      <div className="text-slate-400 text-xs">
                        {Object.values(component.specs).filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    <div className="text-blue-400 font-semibold">${component.price.toFixed(2)}</div>
                  </div>
                </div>
              ) : null
            )
          ) : (
            <div className="text-slate-400 text-center py-8">
              Select components to build your keyboard
            </div>
          )}
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-gradient-to-br from-blue-950/50 to-blue-900/50 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Price Trends</h4>
        <div className="h-24 bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 text-sm">
          Select components to see price history
        </div>
      </div>
    </div>
  );
}