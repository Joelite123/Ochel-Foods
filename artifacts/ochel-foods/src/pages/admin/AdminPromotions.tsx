import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, Upload, Tag, ToggleLeft, ToggleRight, Gift, Search, Package } from "lucide-react";
import { supabase, DBPromotion } from "@/lib/supabase";
import { formatPrice } from "@/data/menuData";
import { toast } from "sonner";

type SimpleProduct = { id: string; name: string; base_price: number; category_id: string };

const EMPTY: Partial<DBPromotion> = {
  title: "", description: "", code: "", discount_type: "percentage",
  discount_value: 0, min_order_amount: null, max_uses: null,
  banner_url: "", is_active: true, starts_at: null, ends_at: null,
  free_product_id: null, free_product_name: null, applicable_product_ids: null,
};

export default function AdminPromotions() {
  const [promos, setPromos] = useState<DBPromotion[]>([]);
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DBPromotion | null>(null);
  const [form, setForm] = useState<Partial<DBPromotion>>(EMPTY);

  // Free product picker state
  const [productSearch, setProductSearch] = useState("");

  // Applicable products state
  const [restrictProducts, setRestrictProducts] = useState(false);
  const [applicableSearch, setApplicableSearch] = useState("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: promoData }, { data: prodData }] = await Promise.all([
      supabase.from("promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, base_price, category_id").order("name"),
    ]);
    if (promoData) setPromos(promoData as DBPromotion[]);
    if (prodData) setProducts(prodData as SimpleProduct[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setProductSearch("");
    setRestrictProducts(false);
    setApplicableSearch("");
    setShowForm(true);
  };

  const openEdit = (p: DBPromotion) => {
    setEditing(p);
    setForm({ ...p });
    setProductSearch(p.free_product_name || "");
    const hasRestrictions = Array.isArray(p.applicable_product_ids) && p.applicable_product_ids.length > 0;
    setRestrictProducts(hasRestrictions);
    setApplicableSearch("");
    setShowForm(true);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("promo-banners").upload(path, file, { upsert: true, cacheControl: "7200" });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data } = supabase.storage.from("promo-banners").getPublicUrl(path);
    setForm((f) => ({ ...f, banner_url: data.publicUrl }));
    setUploading(false);
    toast.success("Banner uploaded");
  };

  const selectFreeProduct = (p: SimpleProduct) => {
    setForm((f) => ({ ...f, free_product_id: p.id, free_product_name: p.name, discount_value: 0 }));
    setProductSearch(p.name);
  };

  const toggleApplicableProduct = (id: string) => {
    setForm((f) => {
      const current = f.applicable_product_ids ?? [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...f, applicable_product_ids: next.length > 0 ? next : null };
    });
  };

  const handleSave = async () => {
    if (!form.title) return toast.error("Title is required");
    if (form.discount_type === "free_product" && !form.free_product_id) {
      return toast.error("Please select a free product");
    }
    setSaving(true);
    const payload: Partial<DBPromotion> = {
      ...form,
      discount_value: form.discount_type === "free_product" ? 0 : Number(form.discount_value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      free_product_id: form.discount_type === "free_product" ? (form.free_product_id ?? null) : null,
      free_product_name: form.discount_type === "free_product" ? (form.free_product_name ?? null) : null,
      applicable_product_ids: restrictProducts && (form.applicable_product_ids?.length ?? 0) > 0
        ? form.applicable_product_ids
        : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("promotions").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("promotions").insert(payload));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Promotion updated" : "Promotion created");
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Promotion deleted");
    load();
  };

  const toggleActive = async (p: DBPromotion) => {
    await supabase.from("promotions").update({ is_active: !p.is_active }).eq("id", p.id);
    toast.success(p.is_active ? "Promotion paused" : "Promotion activated");
    load();
  };

  const discountLabel = (p: DBPromotion) => {
    if (p.discount_type === "free_product") return `Free: ${p.free_product_name ?? "product"}`;
    if (p.discount_type === "percentage") return `${p.discount_value}% off`;
    return `${formatPrice(Number(p.discount_value))} off`;
  };

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const filteredFreeProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredApplicable = products.filter((p) =>
    p.name.toLowerCase().includes(applicableSearch.toLowerCase())
  );

  const selectedApplicable = (form.applicable_product_ids ?? [])
    .map((id) => productMap[id])
    .filter(Boolean);

  const field = "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-3 py-2 text-sm font-[Montserrat] focus:outline-none";
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-chewy text-xl text-gray-800">Promotions & Banners</h2>
          <p className="text-gray-400 text-sm font-[Montserrat]">
            Active promotions with banners show automatically above the homepage hero.
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-[#E8192C] text-white px-4 py-2 rounded-xl font-bold font-[Montserrat] text-sm hover:bg-[#c8151f]">
          <Plus className="w-4 h-4" /> New Promo
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-[Montserrat]">Loading…</div>
        ) : promos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 font-[Montserrat]">
            No promotions yet. Create your first one!
          </div>
        ) : promos.map((p) => {
          const isLive = p.is_active &&
            (!p.starts_at || new Date(p.starts_at) <= now) &&
            (!p.ends_at || new Date(p.ends_at) >= now);
          const restrictedCount = p.applicable_product_ids?.length ?? 0;
          return (
            <div key={p.id} className={`bg-white rounded-2xl border overflow-hidden ${isLive ? "border-green-200" : "border-gray-100"}`}>
              {p.banner_url && <img src={p.banner_url} alt={p.title} className="w-full h-28 object-cover" />}
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-chewy text-lg text-gray-800">{p.title}</p>
                    {isLive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-[Montserrat] font-bold">LIVE</span>}
                    {!p.is_active && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-[Montserrat]">Paused</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm font-[Montserrat]">
                    {p.code && (
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-mono font-bold text-xs">
                        <Tag className="w-3 h-3" /> {p.code}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 ${p.discount_type === "free_product" ? "text-green-600 font-semibold" : "text-gray-500"}`}>
                      {p.discount_type === "free_product" && <Gift className="w-3.5 h-3.5" />}
                      {discountLabel(p)}
                    </span>
                    {restrictedCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-[Montserrat]">
                        <Package className="w-3 h-3" />
                        {restrictedCount} product{restrictedCount !== 1 ? "s" : ""} only
                      </span>
                    )}
                    {p.min_order_amount && <span className="text-gray-400 text-xs">Min order: {formatPrice(Number(p.min_order_amount))}</span>}
                    {p.max_uses && <span className="text-gray-400 text-xs">{p.uses_count}/{p.max_uses} uses</span>}
                  </div>
                  {restrictedCount > 0 && (
                    <p className="text-xs text-gray-400 font-[Montserrat] mt-0.5 truncate">
                      {(p.applicable_product_ids ?? []).map((id) => productMap[id]?.name).filter(Boolean).join(", ")}
                    </p>
                  )}
                  {(p.starts_at || p.ends_at) && (
                    <p className="text-xs text-gray-400 font-[Montserrat] mt-0.5">
                      {p.starts_at && `From ${new Date(p.starts_at).toLocaleDateString("en-GB")}`}
                      {p.ends_at && ` · Until ${new Date(p.ends_at).toLocaleDateString("en-GB")}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(p)} title={p.is_active ? "Pause" : "Activate"}
                    className={`p-1.5 rounded-lg transition-colors ${p.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}>
                    {p.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-[#E8192C] p-1.5 rounded-lg hover:bg-red-50">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-chewy text-xl text-gray-800">{editing ? "Edit Promotion" : "New Promotion"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Banner upload */}
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">
                  Promo Banner Image
                  <span className="text-gray-400 font-normal ml-1">(shows above homepage hero)</span>
                </label>
                {form.banner_url && <img src={form.banner_url} alt="" className="w-full h-24 object-cover rounded-xl mb-2" />}
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-[#E8192C] text-gray-500 hover:text-[#E8192C] px-4 py-2 rounded-xl text-sm font-[Montserrat] transition-colors">
                    <Upload className="w-4 h-4" /> {uploading ? "Uploading…" : "Upload Banner"}
                  </button>
                  {form.banner_url && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, banner_url: "" }))}
                      className="text-gray-400 hover:text-red-500 px-2">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
              </div>

              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Title *</label>
                <input value={form.title || ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={field} placeholder="e.g. Buy 2 Pizzas, Get a Free Drink" />
              </div>
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Description</label>
                <textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={`${field} resize-none`} rows={2} placeholder="Short promo description" />
              </div>
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">
                  Promo Code <span className="font-normal text-gray-400">(leave blank for automatic discount)</span>
                </label>
                <input value={form.code || ""} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className={field} placeholder="e.g. FREEITEM" />
              </div>

              {/* Discount type */}
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Discount Type</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => {
                    const t = e.target.value as DBPromotion["discount_type"];
                    setForm((f) => ({
                      ...f,
                      discount_type: t,
                      free_product_id: t !== "free_product" ? null : f.free_product_id,
                      free_product_name: t !== "free_product" ? null : f.free_product_name,
                    }));
                    if (e.target.value !== "free_product") setProductSearch("");
                  }}
                  className={field}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₦)</option>
                  <option value="free_product">Free Product 🎁</option>
                </select>
              </div>

              {/* Discount value OR free product picker */}
              {form.discount_type !== "free_product" ? (
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">
                    Value {form.discount_type === "percentage" ? "(%)" : "(₦)"}
                  </label>
                  <input type="number" value={form.discount_value || ""}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                    className={field} placeholder={form.discount_type === "percentage" ? "20" : "1000"} />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">
                    Free Product *
                    {form.free_product_name && (
                      <span className="ml-2 text-green-600 font-normal">✓ {form.free_product_name}</span>
                    )}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        if (e.target.value === "") setForm((f) => ({ ...f, free_product_id: null, free_product_name: null }));
                      }}
                      className={`${field} pl-9`}
                      placeholder="Search product name…"
                    />
                  </div>
                  {productSearch && filteredFreeProducts.length > 0 && !form.free_product_id && (
                    <div className="mt-1 border-2 border-gray-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                      {filteredFreeProducts.slice(0, 10).map((p) => (
                        <button key={p.id} type="button" onClick={() => selectFreeProduct(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-red-50 font-[Montserrat] text-sm flex justify-between items-center border-b border-gray-50 last:border-0">
                          <span className="text-gray-800 font-medium">{p.name}</span>
                          <span className="text-gray-400 text-xs ml-2 flex-shrink-0">{formatPrice(p.base_price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {productSearch && filteredFreeProducts.length === 0 && (
                    <p className="text-sm text-gray-400 font-[Montserrat] mt-1 px-1">No products found</p>
                  )}
                  {form.free_product_id && (
                    <button type="button"
                      onClick={() => { setForm((f) => ({ ...f, free_product_id: null, free_product_name: null })); setProductSearch(""); }}
                      className="mt-1.5 text-xs text-gray-400 hover:text-red-500 font-[Montserrat] flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear selection
                    </button>
                  )}
                </div>
              )}

              {/* Applies To */}
              <div className="border-2 border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold font-[Montserrat] text-gray-700">Applies To</p>
                    <p className="text-xs text-gray-400 font-[Montserrat]">Restrict this discount to specific products</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRestrictProducts((v) => {
                        if (v) setForm((f) => ({ ...f, applicable_product_ids: null }));
                        return !v;
                      });
                      setApplicableSearch("");
                    }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${restrictProducts ? "bg-[#E8192C]" : "bg-gray-200"}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${restrictProducts ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {!restrictProducts ? (
                  <p className="text-sm text-gray-400 font-[Montserrat] italic">All products</p>
                ) : (
                  <div className="space-y-2">
                    {/* Selected chips */}
                    {selectedApplicable.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedApplicable.map((p) => (
                          <span key={p.id}
                            className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-[Montserrat] font-medium px-2 py-1 rounded-full">
                            {p.name}
                            <button type="button" onClick={() => toggleApplicableProduct(p.id)}
                              className="hover:text-red-500 ml-0.5">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        value={applicableSearch}
                        onChange={(e) => setApplicableSearch(e.target.value)}
                        className={`${field} pl-9`}
                        placeholder="Search products to add…"
                      />
                    </div>

                    {/* Product list */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                      {filteredApplicable.length === 0 ? (
                        <p className="text-sm text-gray-400 font-[Montserrat] p-3 text-center">No products found</p>
                      ) : filteredApplicable.map((p) => {
                        const selected = (form.applicable_product_ids ?? []).includes(p.id);
                        return (
                          <button key={p.id} type="button" onClick={() => toggleApplicableProduct(p.id)}
                            className={`w-full text-left px-4 py-2.5 font-[Montserrat] text-sm flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors ${selected ? "bg-purple-50" : "hover:bg-gray-50"}`}>
                            <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selected ? "bg-purple-600 border-purple-600" : "border-gray-300"}`}>
                              {selected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </span>
                            <span className="flex-1 text-gray-800 font-medium">{p.name}</span>
                            <span className="text-gray-400 text-xs flex-shrink-0">{formatPrice(p.base_price)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedApplicable.length === 0 && (
                      <p className="text-xs text-amber-600 font-[Montserrat]">⚠ Select at least one product, or turn off the restriction.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Min Order (₦)</label>
                  <input type="number" value={form.min_order_amount ?? ""} onChange={(e) => setForm((f) => ({ ...f, min_order_amount: Number(e.target.value) || null }))}
                    className={field} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Max Uses</label>
                  <input type="number" value={form.max_uses ?? ""} onChange={(e) => setForm((f) => ({ ...f, max_uses: Number(e.target.value) || null }))}
                    className={field} placeholder="Unlimited" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Start Date</label>
                  <input type="datetime-local" value={form.starts_at?.slice(0, 16) ?? ""} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                    className={field} />
                </div>
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">End Date</label>
                  <input type="datetime-local" value={form.ends_at?.slice(0, 16) ?? ""} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                    className={field} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-[Montserrat] font-semibold text-gray-700">
                <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                Active (visible to customers)
              </label>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-[Montserrat] font-semibold text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#E8192C] text-white py-2.5 rounded-xl font-[Montserrat] font-bold text-sm hover:bg-[#c8151f] disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Promotion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
