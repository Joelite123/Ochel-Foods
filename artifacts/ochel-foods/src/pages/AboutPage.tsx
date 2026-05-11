import { motion } from "framer-motion";
import { Heart, Star, Users, Award, MapPin, Phone, Instagram } from "lucide-react";
import speckleBg from "@assets/O'Chel_Background_1778493177476.png";
import redLogo from "@assets/O'Chel_Logo_Red_Transparent_1778493177439.png";
import whiteLogo from "@assets/O'Chel_Logo_White_transparent_1778493177551.png";

const values = [
  { icon: Heart, title: "Made with Passion", desc: "Every dish is crafted with love and dedication to quality. We treat each order like it's going to our own family." },
  { icon: Star, title: "Bold Authentic Flavors", desc: "We celebrate our food culture by infusing authentic local flavors into every recipe, from our Suya Pizza to our Zobo drink." },
  { icon: Users, title: "Community First", desc: "O'chel was built for our community. We believe food brings people together — one delicious meal at a time." },
  { icon: Award, title: "Premium Quality", desc: "We never compromise on quality. Fresh ingredients, consistent flavors, and a standard that customers can always count on." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="py-20 text-center relative"
        style={{ backgroundImage: `url(${speckleBg})`, backgroundSize: "cover", backgroundColor: "#fff" }}
      >
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <img src={redLogo} alt="O'chel Foods" className="h-20 w-auto mx-auto mb-6" />
            <h1 className="font-chewy text-5xl md:text-6xl text-gray-900 mb-4">
              Our <span className="text-[#E8192C]">Story</span>
            </h1>
            <p className="font-[Montserrat] text-gray-600 max-w-2xl mx-auto text-base leading-relaxed">
              Born from a deep love for food and a desire to bring bold, savory flavors to your doorstep — with a modern, exciting twist.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-chewy text-4xl text-gray-900 mb-4">Who We Are</h2>
              <div className="space-y-4 font-[Montserrat] text-gray-600 text-sm leading-relaxed">
                <p>
                  O'chel Foods was born from a passion for delivering bold, savory flavors with a modern twist. We believe that great food should be fun, fresh, and fast — delivered right to your door with a smile.
                </p>
                <p>
                  Our name, O'chel, reflects our spirit — vibrant, warm, and full of character. From our signature Suya Pizza that fuses beloved street food tradition with a modern take, to our freshly baked banana breads and crispy small chops, every item on our menu is a celebration of flavor.
                </p>
                <p>
                  We source fresh, quality ingredients and prepare each order with care. Whether you're ordering for a family dinner, a party, or just treating yourself — we want every O'chel meal to be an experience worth sharing.
                </p>
              </div>

              {/* Address */}
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#E8192C] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-chewy text-[#E8192C] text-base mb-0.5">Our Location</p>
                  <p className="font-[Montserrat] text-sm text-gray-700">
                    Opposite The Polytechnic, Adedoyin Way, Parakin, Ile Ife
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl overflow-hidden shadow-2xl"
              style={{ backgroundImage: `url(${speckleBg})`, backgroundSize: "cover" }}
            >
              <div className="bg-[#E8192C]/90 p-8 text-center">
                <img src={whiteLogo} alt="O'chel Foods" className="h-16 w-auto mx-auto mb-6" />
                <p className="font-chewy text-2xl text-white leading-relaxed">
                  "Bold Flavors. Fast Delivery. Real Good Food."
                </p>
                <div className="mt-6 pt-6 border-t border-white/20 space-y-3">
                  <a
                    href="https://wa.me/2349056351651"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-whatsapp-about"
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl py-3 px-4 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-[#FFB800]" />
                    <span className="text-white font-bold font-[Montserrat]">+234 905 635 1651</span>
                  </a>
                  <a
                    href="https://instagram.com/Ochel_ng"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-instagram-about"
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl py-3 px-4 transition-colors"
                  >
                    <Instagram className="w-4 h-4 text-[#FFB800]" />
                    <span className="text-white font-bold font-[Montserrat]">@Ochel_ng</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Google Maps */}
      <section className="bg-gray-50 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <h2 className="font-chewy text-3xl text-gray-900 mb-1">Find Us</h2>
            <p className="font-[Montserrat] text-gray-500 text-sm flex items-center justify-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#E8192C]" />
              Opposite The Polytechnic, Adedoyin Way, Parakin, Ile Ife
            </p>
          </motion.div>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <iframe
              title="O'chel Foods Location"
              src="https://maps.google.com/maps?q=Opposite+The+Polytechnic+Adedoyin+Way+Parakin+Ile+Ife+Osun+Nigeria&output=embed&hl=en&z=15"
              width="100%"
              height="380"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              data-testid="google-maps-embed"
            />
          </div>
          <p className="text-center text-xs text-gray-400 font-[Montserrat] mt-3">
            Can't find us? Call or WhatsApp +234 905 635 1651 for directions.
          </p>
        </div>
      </section>

      {/* Values */}
      <section
        className="py-16"
        style={{ backgroundImage: `url(${speckleBg})`, backgroundSize: "cover", backgroundColor: "#fff" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-chewy text-4xl md:text-5xl text-gray-900 mb-2">Our Values</h2>
            <p className="font-[Montserrat] text-gray-500">What drives us every single day</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((val, idx) => (
              <motion.div
                key={val.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center"
                data-testid={`value-card-${idx}`}
              >
                <div className="w-12 h-12 bg-[#E8192C] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <val.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-chewy text-xl text-gray-900 mb-2">{val.title}</h3>
                <p className="text-gray-500 text-sm font-[Montserrat] leading-relaxed">{val.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#E8192C]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-chewy text-4xl md:text-5xl text-white mb-4">Ready to Order?</h2>
            <p className="font-[Montserrat] text-white/80 mb-8 text-sm">
              Reach us on WhatsApp or follow us on Instagram for daily updates and special offers.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://wa.me/2349056351651"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-order-now-about"
                className="bg-white text-[#E8192C] font-bold px-8 py-4 rounded-2xl font-[Montserrat] hover:bg-gray-100 transition-colors"
              >
                Order Now
              </a>
              <a
                href="https://instagram.com/Ochel_ng"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl font-[Montserrat] border border-white/30 transition-colors"
              >
                Follow @Ochel_ng
              </a>
            </div>
            <p className="mt-6 text-white/60 text-xs font-[Montserrat]">
              Note: Payment validates order. Delivery charges apply.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
