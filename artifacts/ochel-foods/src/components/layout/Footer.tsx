import { Link } from "wouter";
import whiteLogo from "@assets/O'Chel_Logo_White_transparent_1778493177551.png";

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <img src={whiteLogo} alt="O'chel Foods" className="h-14 w-auto mb-4" />
            <p className="text-gray-400 text-sm leading-relaxed font-[Montserrat] max-w-xs">
              Bold flavors, fast delivery. Born from a passion for savory, delicious food with a modern twist. Every bite tells our story.
            </p>
            <div className="mt-4 flex gap-4 flex-wrap">
              <a
                href="https://wa.me/2349056351651"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-order-now-footer"
                className="flex items-center gap-2 bg-[#E8192C] hover:bg-[#c8151f] text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors font-[Montserrat]"
              >
                Order Now
              </a>
              <a
                href="https://instagram.com/Ochel_ng"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-instagram-footer"
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors font-[Montserrat]"
              >
                @Ochel_ng
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-chewy text-[#FFB800] text-lg mb-4">Menu</h4>
            <ul className="space-y-2 text-sm font-[Montserrat]">
              {[
                { label: "Pizza", href: "/pizza" },
                { label: "Burgers & Wraps", href: "/burgers" },
                { label: "Shawarma", href: "/shawarma" },
                { label: "Finger Foods", href: "/finger-foods" },
                { label: "Pastries", href: "/pastries" },
                { label: "Baked Goodies", href: "/baked-goodies" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-gray-400 hover:text-[#FFB800] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-chewy text-[#FFB800] text-lg mb-4">Contact</h4>
            <ul className="space-y-3 text-sm font-[Montserrat]">
              <li>
                <p className="text-gray-400">WhatsApp / Call</p>
                <a href="tel:+2349056351651" className="text-white hover:text-[#FFB800] transition-colors font-semibold">
                  +234 905 635 1651
                </a>
              </li>
              <li>
                <p className="text-gray-400">Instagram</p>
                <a href="https://instagram.com/Ochel_ng" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFB800] transition-colors font-semibold">
                  @Ochel_ng
                </a>
              </li>
              <li>
                <p className="text-gray-400">Address</p>
                <p className="text-white text-xs leading-relaxed">Opposite The Polytechnic, Adedoyin Way, Parakin, Ile Ife</p>
              </li>
              <li>
                <p className="text-gray-400 text-xs mt-1">Payment validates order. Delivery charges apply.</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-xs font-[Montserrat]">
            &copy; {new Date().getFullYear()} O'chel Foods. All rights reserved.
          </p>
          <Link href="/about" className="text-gray-500 hover:text-[#FFB800] text-xs font-[Montserrat] transition-colors">
            About Us
          </Link>
        </div>
      </div>
    </footer>
  );
}
