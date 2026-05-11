import { Link } from "wouter";

const navItems = [
  { label: "Pizza", href: "/pizza" },
  { label: "Burgers & Wraps", href: "/burgers" },
  { label: "Shawarma", href: "/shawarma" },
  { label: "Finger Foods", href: "/finger-foods" },
  { label: "Pastries", href: "/pastries" },
  { label: "Baked Goodies", href: "/baked-goodies" },
];

interface CategoryNavProps {
  current: string;
}

export default function CategoryNav({ current }: CategoryNavProps) {
  return (
    <div className="sticky top-16 md:top-[70px] z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide py-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`category-nav-${item.href.replace("/", "")}`}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold font-[Montserrat] transition-all whitespace-nowrap ${
                current === item.href
                  ? "bg-[#E8192C] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
