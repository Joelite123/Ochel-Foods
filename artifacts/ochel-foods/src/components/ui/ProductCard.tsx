import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Star } from "lucide-react";
import { type Product, formatPrice } from "@/data/menuData";
import ProductModal from "./ProductModal";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const displayPrice = product.sizes
    ? `From ${formatPrice(product.sizes[0].price)}`
    : formatPrice(product.basePrice);

  return (
    <>
      <motion.div
        whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.12)" }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col cursor-pointer group"
        data-testid={`card-product-${product.id}`}
        onClick={() => setModalOpen(true)}
      >
        <div className="relative overflow-hidden bg-gray-50 aspect-[4/3]">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.tag && (
            <span className="absolute top-3 left-3 bg-[#E8192C] text-white text-xs font-bold px-2 py-1 rounded-full font-[Montserrat]">
              {product.tag}
            </span>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-chewy text-lg text-gray-900 leading-tight mb-1">
            {product.name}
          </h3>
          <p className="text-gray-500 text-xs font-[Montserrat] leading-relaxed flex-1 mb-3 line-clamp-2">
            {product.description}
          </p>
          {product.note && (
            <p className="text-xs text-[#FFB800] font-semibold font-[Montserrat] mb-2">{product.note}</p>
          )}
          <div className="flex items-center justify-between mt-auto">
            <span className="font-chewy text-xl text-[#E8192C]">{displayPrice}</span>
            <button
              data-testid={`button-add-${product.id}`}
              onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
              className="flex items-center gap-1.5 bg-[#E8192C] hover:bg-[#c8151f] text-white px-3 py-2 rounded-xl text-sm font-semibold transition-colors font-[Montserrat]"
            >
              <ShoppingCart className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </motion.div>

      <ProductModal product={product} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
