import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Tag } from "lucide-react";
import { type ComboProduct, formatPrice } from "@/data/menuData";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

interface ComboCardProps {
  combo: ComboProduct;
}

export default function ComboCard({ combo }: ComboCardProps) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);

  const savings = combo.originalPrice - combo.comboPrice;
  const savingsPct = Math.round((savings / combo.originalPrice) * 100);

  const handleAdd = () => {
    setAdding(true);
    addItem({
      productId: combo.id,
      name: combo.name,
      category: "combos",
      size: combo.includes.join(" + "),
      price: combo.comboPrice,
      quantity: 1,
      imageUrl: combo.imageUrl,
    });
    toast.success(`${combo.name} added to cart!`, {
      description: `${formatPrice(combo.comboPrice)} · saves ${formatPrice(savings)}`,
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      duration: 2500,
    });
    setTimeout(() => setAdding(false), 600);
  };

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(0,0,0,0.10)" }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex gap-0"
    >
      {/* Image */}
      <div className="relative flex-shrink-0 w-28 sm:w-36">
        <img
          src={combo.imageUrl}
          alt={combo.name}
          className="w-full h-full object-cover"
        />
        {combo.tag && (
          <span className="absolute top-2 left-2 bg-[#E8192C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-[Montserrat] leading-tight">
            {combo.tag}
          </span>
        )}
        {/* Savings badge */}
        <span className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-[Montserrat]">
          -{savingsPct}%
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 min-w-0">
        <h3 className="font-chewy text-lg sm:text-xl text-gray-900 leading-tight">{combo.name}</h3>
        <p className="text-gray-500 text-xs font-[Montserrat] mt-0.5 mb-2 line-clamp-2 leading-relaxed">
          {combo.description}
        </p>

        {/* Includes list */}
        <ul className="flex flex-col gap-0.5 mb-3">
          {combo.includes.map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-xs text-gray-600 font-[Montserrat]">
              <Tag className="w-3 h-3 text-[#E8192C] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        {/* Price row */}
        <div className="flex items-center justify-between mt-auto gap-2 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="font-chewy text-xl text-[#E8192C]">
              {formatPrice(combo.comboPrice)}
            </span>
            <span className="text-gray-400 text-sm font-[Montserrat] line-through">
              {formatPrice(combo.originalPrice)}
            </span>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-1.5 bg-[#E8192C] hover:bg-[#c8151f] disabled:opacity-70 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors font-[Montserrat] flex-shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {adding ? "Added!" : "Add combo"}
          </button>
        </div>

        {/* Savings highlight */}
        <p className="text-green-600 text-xs font-semibold font-[Montserrat] mt-1.5">
          You save {formatPrice(savings)}
        </p>
      </div>
    </motion.div>
  );
}
