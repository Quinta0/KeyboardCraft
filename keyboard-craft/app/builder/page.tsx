interface BuilderPageProps {
  selectedComponents: SelectedComponents;
  totalPrice: number;
  activeTab: TabType;
  tabs: { key: TabType; label: string }[];
  sampleProducts: Record<TabType, Product[]>;
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