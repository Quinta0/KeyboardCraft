'use client';

import { useState } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

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

  const tabs: { key: TabType; label: string }[] = [
    { key: 'cases', label: 'Cases' },
    { key: 'pcb', label: 'PCBs' },
    { key: 'switches', label: 'Switches' },
    { key: 'keycaps', label: 'Keycaps' },
    { key: 'stabilizers', label: 'Stabilizers' },
  ];

  if (currentPage === 'landing') {
    return <LandingPage onNavigateToBuilder={() => setCurrentPage('builder')} />;
  }

  return (
    <BuilderPage
      selectedComponents={selectedComponents}
      totalPrice={totalPrice}
      activeTab={activeTab}
      tabs={tabs}
      sampleProducts={sampleProducts}
      onNavigateToLanding={() => setCurrentPage('landing')}
      onTabChange={setActiveTab}
      onComponentSelect={handleComponentSelect}
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