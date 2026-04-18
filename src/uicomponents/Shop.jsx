import React from 'react';

const Shop = ({ dataFragments, items, onBuy, onNextFloor }) => {
  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-12">
      <h2 className="text-4xl font-black text-green-500 mb-3 tracking-widest">MAINTENANCE_DECK</h2>
      <p className="mb-8 text-cyan-300 text-sm tracking-[0.2em]">DATA_FRAGMENTS: {dataFragments}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {items.map((item) => {
          const canAfford = dataFragments >= item.cost;
          return (
            <div key={item.id} className="p-6 border border-gray-800 rounded-xl hover:border-green-500 transition-all">
              <h3 className="text-xl font-bold mb-2 text-green-200">{item.label}</h3>
              <p className="text-gray-400 text-sm mb-4 min-h-[40px]">{item.description}</p>
              <button
                disabled={!canAfford}
                onClick={() => onBuy(item.id)}
                className={`w-full py-2 font-bold border transition-all ${canAfford
                  ? 'bg-green-900/30 text-green-400 border-green-900 hover:bg-green-800/50'
                  : 'bg-gray-900/30 text-gray-500 border-gray-800 cursor-not-allowed'
                }`}
              >
                {item.cost} DATA_FRAGS
              </button>
            </div>
          );
        })}
      </div>
      <button onClick={onNextFloor} className="mt-12 px-12 py-4 bg-white text-black font-black uppercase tracking-widest hover:scale-105 transition-all">Initiate_Next_Floor</button>
    </div>
  );
};

export default Shop;
