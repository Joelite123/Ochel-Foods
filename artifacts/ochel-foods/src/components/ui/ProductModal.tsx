import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Minus, Plus, X, CheckCircle2 } from "lucide-react";
import { type Product, formatPrice } from "@/data/menuData";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ProductModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, open, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [selectedCrustIndex, setSelectedCrustIndex] = useState(0);
  const [extraQtys, setExtraQtys] = useState<Record<string, number>>({});
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const selectedSize = product.sizes?.[selectedSizeIndex];
  const selectedCrust = product.crusts?.[selectedCrustIndex];
  const basePrice = selectedSize ? selectedSize.price : product.basePrice;
  const crustPriceAdd = selectedCrust?.priceAdd ?? 0;

  const extrasTotal = product.extras
    ? product.extras.reduce((sum, extra) => sum + extra.price * (extraQtys[extra.name] || 0), 0)
    : 0;

  const totalPrice = (basePrice + crustPriceAdd + extrasTotal) * quantity;

  const handleExtraChange = (name: string, delta: number) => {
    setExtraQtys((prev) => {
      const current = prev[name] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [name]: next };
    });
  };

  const toggleIngredient = (ing: string) => {
    setRemovedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    );
  };

  const handleAddToCart = () => {
    const extras = product.extras
      ? product.extras
          .filter((e) => (extraQtys[e.name] || 0) > 0)
          .map((e) => ({ name: e.name, quantity: extraQtys[e.name], price: e.price }))
      : [];

    const sizeLabel = selectedSize
      ? `${selectedSize.label}${selectedSize.description ? ` (${selectedSize.description})` : ""}`
      : undefined;
    const crustLabel = selectedCrust ? selectedCrust.label : undefined;
    const sizeWithCrust = sizeLabel && crustLabel
      ? `${sizeLabel} · ${crustLabel} crust`
      : sizeLabel ?? crustLabel;

    addItem({
      productId: product.id,
      name: product.name,
      category: product.category,
      size: sizeWithCrust,
      price: basePrice + crustPriceAdd + extrasTotal,
      quantity,
      extras,
      removedIngredients: removedIngredients.length > 0 ? removedIngredients : undefined,
      note: note || undefined,
      imageUrl: product.imageUrl,
    });

    toast.success(`${product.name} added to cart!`, {
      description: `${quantity} × ${formatPrice(totalPrice)}`,
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      duration: 2500,
    });

    onClose();
    setQuantity(1);
    setSelectedSizeIndex(0);
    setSelectedCrustIndex(0);
    setExtraQtys({});
    setRemovedIngredients([]);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        {/* Image */}
        <div className="relative flex-shrink-0">
          <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-yellow-50">
                <span className="text-6xl">🍽️</span>
              </div>
            )}
          </div>
          {product.tag && (
            <span className="absolute top-3 left-3 bg-[#E8192C] text-white text-xs font-bold px-3 py-1 rounded-full font-[Montserrat]">
              {product.tag}
            </span>
          )}
          <button
            onClick={onClose}
            data-testid="button-close-modal"
            className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-1.5 shadow transition-colors"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div>
            <h2 className="font-chewy text-2xl text-gray-900 mb-1">{product.name}</h2>
            <p className="text-gray-500 text-sm font-[Montserrat] leading-relaxed">{product.description}</p>
          </div>

          {product.note && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-xs text-yellow-800 font-semibold font-[Montserrat]">{product.note}</p>
            </div>
          )}

          {/* Size selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div>
              <h3 className="font-chewy text-lg text-gray-800 mb-2">Choose Size</h3>
              <div className="flex flex-col gap-2">
                {product.sizes.map((size, idx) => (
                  <label
                    key={size.label}
                    data-testid={`radio-size-${idx}`}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedSizeIndex === idx
                        ? "border-[#E8192C] bg-red-50"
                        : "border-gray-200 hover:border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="size"
                        checked={selectedSizeIndex === idx}
                        onChange={() => setSelectedSizeIndex(idx)}
                        className="accent-[#E8192C]"
                      />
                      <span className="font-semibold text-sm font-[Montserrat] text-gray-800">
                        {size.label}
                        {size.description && (
                          <span className="text-gray-400 font-normal"> — {size.description}</span>
                        )}
                      </span>
                    </div>
                    <span className="font-chewy text-[#E8192C] text-lg">{formatPrice(size.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Crust selection — pizza only */}
          {product.crusts && product.crusts.length > 0 && (
            <div>
              <h3 className="font-chewy text-lg text-gray-800 mb-2">Choose Crust</h3>
              <div className="relative flex bg-gray-100 rounded-xl p-1 gap-1">
                {product.crusts.map((crust, idx) => (
                  <button
                    key={crust.label}
                    type="button"
                    onClick={() => setSelectedCrustIndex(idx)}
                    className={`relative flex-1 py-2 text-sm font-semibold font-[Montserrat] rounded-lg transition-all duration-200 ${
                      selectedCrustIndex === idx
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {crust.label}
                    {selectedCrustIndex === idx && (
                      <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#E8192C] rounded-full" />
                    )}
                    {crust.priceAdd > 0 && (
                      <span className="ml-1 text-xs text-[#E8192C]">+{formatPrice(crust.priceAdd)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients - with remove checkboxes */}
          {product.ingredients && product.ingredients.length > 0 && (
            <div>
              <h3 className="font-chewy text-lg text-gray-800 mb-1">Ingredients</h3>
              <p className="text-xs text-gray-400 font-[Montserrat] mb-2">Uncheck to remove any ingredient you don't want</p>
              <div className="flex flex-wrap gap-2">
                {product.ingredients.map((ing) => {
                  const removed = removedIngredients.includes(ing);
                  return (
                    <button
                      key={ing}
                      type="button"
                      data-testid={`ingredient-toggle-${ing}`}
                      onClick={() => toggleIngredient(ing)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold font-[Montserrat] transition-all ${
                        removed
                          ? "bg-gray-100 border-gray-300 text-gray-400 line-through"
                          : "bg-green-50 border-green-300 text-green-800"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          removed ? "border-gray-300" : "border-green-500 bg-green-500"
                        }`}
                      >
                        {!removed && (
                          <svg viewBox="0 0 8 8" className="w-2 h-2" fill="none">
                            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {ing}
                    </button>
                  );
                })}
              </div>
              {removedIngredients.length > 0 && (
                <p className="text-xs text-[#E8192C] font-semibold font-[Montserrat] mt-2">
                  Removed: {removedIngredients.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Extras */}
          {product.extras && product.extras.length > 0 && (
            <div>
              <h3 className="font-chewy text-lg text-gray-800 mb-2">Add-ons & Extras</h3>
              <div className="flex flex-col gap-2">
                {product.extras.map((extra) => {
                  const qty = extraQtys[extra.name] || 0;
                  return (
                    <div key={extra.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-sm font-[Montserrat] text-gray-800">{extra.name}</p>
                        <p className="text-xs text-[#E8192C] font-[Montserrat]">+{formatPrice(extra.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          data-testid={`button-extra-minus-${extra.name}`}
                          onClick={() => handleExtraChange(extra.name, -1)}
                          disabled={qty === 0}
                          className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors disabled:opacity-40"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-sm font-[Montserrat]">{qty}</span>
                        <button
                          data-testid={`button-extra-plus-${extra.name}`}
                          onClick={() => handleExtraChange(extra.name, 1)}
                          className="w-7 h-7 rounded-full bg-[#E8192C] hover:bg-[#c8151f] text-white flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="font-chewy text-lg text-gray-800 mb-2 block">Special Instructions</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-note-restaurant"
              placeholder="Any special requests or instructions..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm font-[Montserrat] text-gray-700 focus:outline-none focus:border-[#E8192C] resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex-shrink-0 border-t border-gray-100 p-4 bg-white flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <button
              data-testid="button-qty-minus"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-lg w-6 text-center font-[Montserrat]" data-testid="text-quantity">{quantity}</span>
            <button
              data-testid="button-qty-plus"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full bg-[#E8192C] text-white shadow flex items-center justify-center hover:bg-[#c8151f] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            data-testid="button-add-to-cart"
            onClick={handleAddToCart}
            className="flex-1 bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold py-3 px-4 rounded-xl transition-colors font-[Montserrat] text-sm"
          >
            Add to Cart — {formatPrice(totalPrice)}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
