import React, { useState } from 'react';
import { ShoppingBag, Coins, Sparkles, Check, Package, Gift, ShieldAlert } from 'lucide-react';
import { ShopItem, StudentProfile } from '../types';
import { triggerHapticFeedback, triggerNotificationFeedback } from '../lib/telegram';
import confetti from 'canvas-confetti';

interface ShopViewProps {
  items: ShopItem[];
  profile: StudentProfile;
  onBuyItem: (item: ShopItem) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ items, profile, onBuyItem }) => {
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [purchasedCode, setPurchasedCode] = useState<string | null>(null);

  const handlePurchase = (item: ShopItem) => {
    if (profile.coins < item.priceCoins) {
      triggerNotificationFeedback('error');
      alert(`Недостаточно Delay Coins! Нужно ${item.priceCoins} 🪙, у вас ${profile.coins} 🪙. Зарабатывайте монеты, выполняя домашние задания!`);
      return;
    }

    triggerHapticFeedback('heavy');
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    triggerNotificationFeedback('success');

    const promoCode = `DELAY-${Math.floor(100000 + Math.random() * 900000)}`;
    setPurchasedCode(promoCode);
    onBuyItem(item);
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-4 max-w-xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-[#121216] to-[#121216] border border-purple-500/20 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-400" />
            Магазин наград «Delay Shop»
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Обменивай Delay Coins на купоны, личные консультации и фирменный мерч!
          </p>
        </div>

        <div className="bg-purple-500/15 border border-purple-500/30 px-3 py-1.5 rounded-xl text-center shrink-0">
          <span className="text-[10px] uppercase font-bold text-purple-300 block">Ваш баланс</span>
          <span className="text-sm font-extrabold text-purple-200">{profile.coins} 🪙</span>
        </div>
      </div>

      {/* Grid of Products */}
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const canAfford = profile.coins >= item.priceCoins;

          return (
            <div
              key={item.id}
              className="bg-[#121216] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-3 flex flex-col justify-between shadow-md transition-all group"
            >
              <div>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#0a0a0c] mb-2">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.badge && (
                    <span className="absolute top-2 left-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md shadow">
                      {item.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-bold text-white line-clamp-2 mb-1">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-purple-400" /> {item.priceCoins} 🪙
                </span>

                <button
                  onClick={() => {
                    triggerHapticFeedback('medium');
                    setSelectedItem(item);
                  }}
                  className={`py-1.5 px-2.5 rounded-lg font-bold text-[11px] transition-all ${
                    canAfford
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm'
                      : 'bg-[#18181e] text-slate-500 border border-white/5'
                  }`}
                >
                  Купить
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Purchase Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-white/10 w-full max-w-sm rounded-3xl p-5 text-slate-100 shadow-2xl space-y-4">
            {!purchasedCode ? (
              <>
                <div className="aspect-video rounded-2xl overflow-hidden bg-[#0a0a0c]">
                  <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-full object-cover" />
                </div>

                <h3 className="text-base font-bold text-white">{selectedItem.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedItem.description}</p>

                <div className="bg-[#0a0a0c] border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs font-semibold">
                  <span>Стоимость:</span>
                  <span className="text-purple-300 font-bold">{selectedItem.priceCoins} 🪙</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#18181e] text-slate-300 text-xs font-semibold border border-white/5"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handlePurchase(selectedItem)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-md"
                  >
                    Подтвердить
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-3 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>

                <h3 className="text-base font-bold text-white">Успешная покупка! 🎉</h3>
                <p className="text-xs text-slate-300">
                  Ваш уникальный промокод для получения наград или куратора:
                </p>

                <div className="bg-[#0a0a0c] border border-emerald-500/40 p-3 rounded-xl font-mono text-emerald-400 text-sm font-bold tracking-wider select-all">
                  {purchasedCode}
                </div>

                <p className="text-[11px] text-slate-400">
                  Покажите код в чате бота @Delayschool_bot или куратору при следующей встрече.
                </p>

                <button
                  onClick={() => {
                    setPurchasedCode(null);
                    setSelectedItem(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#18181e] hover:bg-[#202028] text-white text-xs font-bold border border-white/5"
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
