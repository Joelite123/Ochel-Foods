import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/menuData";

export default function CartPanel() {
  const { items, isCartOpen, setIsCartOpen, removeItem, updateQuantity, subtotal, deliveryFee, total } = useCart();

  const buildWhatsAppMessage = () => {
    const lines = items.map((item) => {
      let line = `• ${item.name}`;
      if (item.size) line += ` (${item.size})`;
      if (item.extras && item.extras.length > 0) {
        const extrasStr = item.extras.map((e) => `${e.name} x${e.quantity}`).join(", ");
        line += ` + ${extrasStr}`;
      }
      line += ` x${item.quantity} = ${formatPrice(item.price * item.quantity)}`;
      if (item.note) line += `\n  Note: ${item.note}`;
      return line;
    });
    const msg = `Hello O'chel Foods! I'd like to order:\n\n${lines.join("\n")}\n\nSubtotal: ${formatPrice(subtotal)}\nDelivery: ${formatPrice(deliveryFee)}\nTotal: ${formatPrice(total)}\n\nPlease confirm my order.`;
    return encodeURIComponent(msg);
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetTitle className="sr-only">Shopping Cart</SheetTitle>
        
        <div className="bg-[#E8192C] text-white px-5 py-4 flex items-center gap-3">
          <ShoppingBag className="w-6 h-6" />
          <h2 className="font-chewy text-xl">Your Order</h2>
          {items.length > 0 && (
            <span className="ml-auto bg-[#FFB800] text-black text-xs font-bold px-2 py-0.5 rounded-full font-[Montserrat]">
              {items.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" data-testid="cart-empty">
            <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="font-chewy text-2xl text-gray-400 mb-2">Your cart is empty</h3>
            <p className="text-gray-400 text-sm font-[Montserrat]">Add some delicious items to get started!</p>
            <button
              onClick={() => setIsCartOpen(false)}
              data-testid="button-continue-shopping"
              className="mt-6 bg-[#E8192C] text-white px-6 py-3 rounded-xl font-bold font-[Montserrat] hover:bg-[#c8151f] transition-colors"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm" data-testid={`cart-item-${item.id}`}>
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-chewy text-base text-gray-900 leading-tight truncate">{item.name}</h4>
                      {item.size && <p className="text-xs text-gray-500 font-[Montserrat]">{item.size}</p>}
                      {item.extras && item.extras.length > 0 && (
                        <p className="text-xs text-gray-400 font-[Montserrat]">
                          + {item.extras.map((e) => `${e.name} x${e.quantity}`).join(", ")}
                        </p>
                      )}
                      <p className="font-chewy text-[#E8192C] mt-1">{formatPrice(item.price)}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      data-testid={`button-remove-${item.id}`}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`button-cart-minus-${item.id}`}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-sm w-5 text-center font-[Montserrat]" data-testid={`text-cart-qty-${item.id}`}>{item.quantity}</span>
                      <button
                        data-testid={`button-cart-plus-${item.id}`}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-[#E8192C] text-white flex items-center justify-center hover:bg-[#c8151f] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-chewy text-gray-800 text-base">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold" data-testid="text-subtotal">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-[Montserrat]">
                  <span className="text-gray-600">Delivery</span>
                  <span className="font-semibold">{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                  <span className="font-chewy text-lg">Total</span>
                  <span className="font-chewy text-lg text-[#E8192C]" data-testid="text-total">{formatPrice(total)}</span>
                </div>
              </div>

              <a
                href={`https://wa.me/2349056351651?text=${buildWhatsAppMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-order-whatsapp"
                className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-bold py-3 px-6 rounded-xl transition-colors font-[Montserrat]"
              >
                Order via WhatsApp
              </a>
              <p className="text-center text-xs text-gray-400 font-[Montserrat] mt-2">Payment validates order. Delivery charges may vary.</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
