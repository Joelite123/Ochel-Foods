import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Minus, Plus, X } from "lucide-react";
import { type Product, formatPrice } from "@/data/menuData";
import { useCart } from "@/contexts/CartContext";

interface ProductModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, open, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [extraQtys, setExtraQtys] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");

  const selectedSize = product.sizes?.[selectedSizeIndex];
  const basePrice = selectedSize ? selectedSize.price : product.basePrice;

  const extrasTotal = product.extras
    ? product.extras.reduce((sum, extra) => {
        return sum + extra.price * (extraQtys[extra.name] || 0);
      }, 0)
    : 0;

  const totalPrice = (basePrice + extrasTotal) * quantity;

  const handleExtraChange = (name: string, delta: number) => {
    setExtraQtys((prev) => {
      const current = prev[name] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [name]: next };
    });
  };

  const handleAddToCart = () => {
    const extras = product.extras
      ? product.extras
          .filter((e) => (extraQtys[e.name] || 0) > 0)
          .map((e) => ({ name: e.name, quantity: extraQtys[e.name], price: e.price }))
      : [];

    addItem({
      productId: product.id,
      name: product.name,
      category: product.category,
      size: selectedSize ? `${selectedSize.label}${selectedSize.description ? ` (${selectedSize.description})` : ""}` : undefined,
      price: basePrice + extrasTotal,
      quantity,
      extras,
      note: note || undefined,
      imageUrl: product.imageUrl,
    });
    onClose();
    setQuantity(1);
    setSelectedSizeIndex(0);
    setExtraQtys({});
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        <div className="relative">
          <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
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

        <div className="p-5">
          <h2 className="font-chewy text-2xl text-gray-900 mb-1">{product.name}</h2>
          <p className="text-gray-500 text-sm font-[Montserrat] leading-relaxed mb-4">{product.description}</p>

          {product.note && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-yellow-800 font-semibold font-[Montserrat]">{product.note}</p>
            </div>
          )}

          {/* Size selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-4">
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
                        {size.description && <span className="text-gray-400 font-normal"> — {size.description}</span>}
                      </span>
                    </div>
                    <span className="font-chewy text-[#E8192C] text-lg">{formatPrice(size.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Extras */}
          {product.extras && product.extras.length > 0 && (
            <div className="mb-4">
              <h3 className="font-chewy text-lg text-gray-800 mb-2">Add-ons & Extras</h3>
              <div className="flex flex-col gap-2">
                {product.extras.map((extra) => {
                  const qty = extraQtys[extra.name] || 0;
                  return (
                    <div key={extra.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-sm font-[Montserrat] text-gray-800">{extra.name}</p>
                        <p className="text-xs text-[#E8192C] font-[Montserrat]">+{formatPrice(extra.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          data-testid={`button-extra-minus-${extra.name}`}
                          onClick={() => handleExtraChange(extra.name, -1)}
                          className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          disabled={qty === 0}
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
          <div className="mb-4">
            <label className="font-chewy text-lg text-gray-800 mb-2 block">Note to Restaurant</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-note-restaurant"
              placeholder="Any special requests or instructions..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm font-[Montserrat] text-gray-700 focus:outline-none focus:border-[#E8192C] resize-none"
              rows={3}
            />
          </div>

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-2">
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
              className="flex-1 bg-[#E8192C] hover:bg-[#c8151f] text-white font-bold py-3 px-6 rounded-xl transition-colors font-[Montserrat] text-sm"
            >
              Add to Cart — {formatPrice(totalPrice)}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
