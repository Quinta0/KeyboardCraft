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

function BuildSummary({ selectedComponents, totalPrice, checkCompatibility }: BuildSummaryProps) {
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
    } else {
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