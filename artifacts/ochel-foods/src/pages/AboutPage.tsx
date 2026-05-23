import { motion } from "framer-motion";
import { Heart, Star, Users, Award, MapPin } from "lucide-react";
import speckleBg from "@assets/O'Chel_Background_1778493177476.png";

const values = [
  { icon: Heart, title: "Made with Passion", desc: "Every dish is crafted with love and dedication to quality. We treat each order like it's going to our own family." },
  { icon: Star, title: "Bold Authentic Flavors", desc: "We celebrate our food culture by infusing authentic local flavors into every recipe, from our Suya Pizza to our Zobo drink." },
  { icon: Users, title: "Community First", desc: "O'chel was built for our community. We believe food brings people together — one delicious meal at a time." },
  { icon: Award, title: "Premium Quality", desc: "We never compromise on quality. Fresh ingredients, consistent flavors, and a standard that customers can always count on." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
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
              4 Houses After The Poly, Parakin, Ile-Ife, Osun State
            </p>
          </motion.div>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <iframe
              title="O'chel Foods Location"
              src="https://maps.google.com/maps?q=4+Houses+After+The+Poly+Parakin+Ile-Ife+Osun+State+Nigeria&output=embed&hl=en&z=16"
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
