import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Search, Upload, X, ChevronDown } from "lucide-react";
import { supabase, DBProduct, DBCategory } from "@/lib/supabase";
import { invalidateMenuCache } from "@/hooks/useMenuData";
import { toast } from "sonner";

type FormState = Partial<DBProduct> & { category_id: string };

const EMPTY: FormState = {
  name: "", description: "", category_id: "",
  base_price: 0, image_url: "", tag: "", note: "",
  sizes: [], extras: [], ingredients: [],
  is_available: true, sort_order: 0,
};

export default function AdminProducts() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DBProduct | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Temp string fields for arrays
  const [sizeInput, setSizeInput] = useState("");
  const [extraInput, setExtraInput] = useState("");
  const [ingInput, setIngInput] = useState("");

  const load = async () => {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    if (prods) setProducts(prods as DBProduct[]);
    if (cats) setCategories(cats as DBCategory[]);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, category_id: categories[0]?.id ?? "" });
    setShowForm(true);
  };
  const openEdit = (p: DBProduct) => {
    setEditing(p);
    setForm({ ...p });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, cacheControl: "604800" });
    if (error) { toast.error("Image upload failed"); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const addSize = () => {
    const parts = sizeInput.split(",").map((s) => s.trim());
    if (parts.length < 2) return toast.error("Format: Label, Price (e.g. Small, 7500)");
    const price = Number(parts[parts.length - 1]);
    const label = parts.slice(0, -1).join(", ");
    if (isNaN(price)) return toast.error("Price must be a number");
    setForm((f) => ({ ...f, sizes: [...(f.sizes || []), { label, price }] }));
    setSizeInput("");
  };
  const removeSize = (i: number) => setForm((f) => ({ ...f, sizes: (f.sizes || []).filter((_, j) => j !== i) }));

  const addExtra = () => {
    const parts = extraInput.split(",").map((s) => s.trim());
    if (parts.length < 2) return toast.error("Format: Name, Price (e.g. Extra Cheese, 1000)");
    const price = Number(parts[parts.length - 1]);
    const name = parts.slice(0, -1).join(", ");
    if (isNaN(price)) return toast.error("Price must be a number");
    setForm((f) => ({ ...f, extras: [...(f.extras || []), { name, price }] }));
    setExtraInput("");
  };
  const removeExtra = (i: number) => setForm((f) => ({ ...f, extras: (f.extras || []).filter((_, j) => j !== i) }));

  const addIngredient = () => {
    const v = ingInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, ingredients: [...(f.ingredients || []), v] }));
    setIngInput("");
  };
  const removeIngredient = (i: number) => setForm((f) => ({ ...f, ingredients: (f.ingredients || []).filter((_, j) => j !== i) }));

  const handleSave = async () => {
    if (!form.name || !form.category_id || !form.base_price) {
      return toast.error("Name, category and base price are required");
    }
    setSaving(true);
    const payload = { ...form, base_price: Number(form.base_price) };
    let error;
    if (editing) {
      ({ error } = await supabase.from("products").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("products").insert(payload));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Product updated" : "Product added");
    invalidateMenuCache();
    closeForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    setDeleting(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    setDeleting(null);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    invalidateMenuCache();
    load();
  };

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || p.category_id === catFilter;
    return matchSearch && matchCat;
  });

  const field = "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-3 py-2 text-sm font-[Montserrat] focus:outline-none";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)}
            className={`${field} pl-9`} />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`${field} w-auto`}>
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-[#E8192C] text-white px-4 py-2 rounded-xl font-bold font-[Montserrat] text-sm hover:bg-[#c8151f] transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {p.image_url && (
              <img src={p.image_url} alt={p.name} className="w-full h-32 object-cover" />
            )}
            {!p.image_url && (
              <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300">No image</div>
            )}
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-chewy text-base text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 font-[Montserrat]">
                    {categories.find((c) => c.id === p.category_id)?.name ?? p.category_id}
                  </p>
                </div>
                <p className="font-chewy text-[#E8192C] text-base whitespace-nowrap">₦{Number(p.base_price).toLocaleString()}</p>
              </div>
              {p.tag && <span className="inline-block mt-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-[Montserrat] font-bold">{p.tag}</span>}
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => openEdit(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 hover:border-[#E8192C] hover:text-[#E8192C] text-gray-600 py-1.5 rounded-lg text-xs font-[Montserrat] transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                  className="flex items-center justify-center gap-1.5 border border-gray-200 hover:border-red-500 hover:text-red-500 text-gray-400 py-1.5 px-3 rounded-lg text-xs font-[Montserrat] transition-colors disabled:opacity-40">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <label className="flex items-center gap-1.5 text-xs font-[Montserrat]">
                  <input type="checkbox" checked={p.is_available}
                    onChange={async (e) => {
                      await supabase.from("products").update({ is_available: e.target.checked }).eq("id", p.id);
                      load();
                    }} />
                  Available
                </label>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-300 font-[Montserrat]">No products found</div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-chewy text-xl text-gray-800">{editing ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Image */}
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Product Image</label>
                <div className="flex items-center gap-3">
                  {form.image_url && <img src={form.image_url} className="w-16 h-16 rounded-xl object-cover" alt="" />}
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-[#E8192C] text-gray-500 hover:text-[#E8192C] px-4 py-3 rounded-xl text-sm font-[Montserrat] transition-colors">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading…" : "Upload Image"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                <input placeholder="Or paste image URL" value={form.image_url || ""}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  className={`${field} mt-2`} />
              </div>

              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Product Name *</label>
                <input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={field} placeholder="e.g. Chicken Sauté Pizza" />
              </div>

              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Description</label>
                <textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${field} resize-none`} rows={2} placeholder="Short product description" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Category *</label>
                  <select value={form.category_id || ""} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className={field}>
                    <option value="">Select…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Base Price (₦) *</label>
                  <input type="number" value={form.base_price || ""} onChange={(e) => setForm((f) => ({ ...f, base_price: Number(e.target.value) }))} className={field} placeholder="7500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Tag (optional)</label>
                  <input value={form.tag || ""} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} className={field} placeholder="Popular, New, etc." />
                </div>
                <div>
                  <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Sort Order</label>
                  <input type="number" value={form.sort_order || 0} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} className={field} />
                </div>
              </div>

              {/* Sizes */}
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">
                  Sizes — <span className="font-normal text-gray-400">e.g. Small, 7500</span>
                </label>
                <div className="flex gap-2">
                  <input value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSize()}
                    className={`${field} flex-1`} placeholder="Label, Price" />
                  <button type="button" onClick={addSize} className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl text-sm font-[Montserrat]">Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(form.sizes || []).map((s, i) => (
                    <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-[Montserrat]">
                      {s.label} — ₦{s.price.toLocaleString()}
                      <button onClick={() => removeSize(i)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Extras / Add-ons */}
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">
                  Add-ons / Extras — <span className="font-normal text-gray-400">e.g. Extra Cheese, 1000</span>
                </label>
                <div className="flex gap-2">
                  <input value={extraInput} onChange={(e) => setExtraInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addExtra()}
                    className={`${field} flex-1`} placeholder="Name, Price" />
                  <button type="button" onClick={addExtra} className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl text-sm font-[Montserrat]">Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(form.extras || []).map((e, i) => (
                    <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-[Montserrat]">
                      {e.name} — ₦{e.price.toLocaleString()}
                      <button onClick={() => removeExtra(i)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Ingredients</label>
                <div className="flex gap-2">
                  <input value={ingInput} onChange={(e) => setIngInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addIngredient()}
                    className={`${field} flex-1`} placeholder="e.g. Mozzarella" />
                  <button type="button" onClick={addIngredient} className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl text-sm font-[Montserrat]">Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(form.ingredients || []).map((ing, i) => (
                    <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-[Montserrat]">
                      {ing}
                      <button onClick={() => removeIngredient(i)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Note (shown to customer)</label>
                <input value={form.note || ""} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className={field} placeholder="Any note displayed under this product" />
              </div>

              <label className="flex items-center gap-2 text-sm font-[Montserrat] font-semibold text-gray-700">
                <input type="checkbox" checked={form.is_available ?? true} onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} />
                Available for ordering
              </label>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={closeForm} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-[Montserrat] font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#E8192C] text-white py-2.5 rounded-xl font-[Montserrat] font-bold text-sm hover:bg-[#c8151f] disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
