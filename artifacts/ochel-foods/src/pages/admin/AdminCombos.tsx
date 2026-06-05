import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { DBCombo } from "@/lib/supabase";
import { Plus, Pencil, Trash2, Eye, EyeOff, X, GripVertical, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { toast } from "sonner";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(n);

const EMPTY_FORM = {
  name: "",
  description: "",
  image_url: "",
  combo_price: "",
  original_price: "",
  includes: [""],
  tag: "",
  sort_order: "0",
  is_active: true,
};

type FormState = typeof EMPTY_FORM;

export default function AdminCombos() {
  const [combos, setCombos] = useState<DBCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DBCombo | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `combos/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, cacheControl: "604800" });
    if (error) { toast.error("Image upload failed"); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const fetchCombos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("combos")
      .select("*")
      .order("sort_order")
      .order("created_at");
    setCombos((data as DBCombo[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCombos(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sort_order: String(combos.length) });
    setModalOpen(true);
  };

  const openEdit = (combo: DBCombo) => {
    setEditing(combo);
    setForm({
      name: combo.name,
      description: combo.description,
      image_url: combo.image_url,
      combo_price: String(combo.combo_price),
      original_price: String(combo.original_price),
      includes: combo.includes.length ? combo.includes : [""],
      tag: combo.tag || "",
      sort_order: String(combo.sort_order),
      is_active: combo.is_active,
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleIncludeChange = (idx: number, val: string) => {
    setForm(f => {
      const inc = [...f.includes];
      inc[idx] = val;
      return { ...f, includes: inc };
    });
  };

  const addIncludeRow = () => setForm(f => ({ ...f, includes: [...f.includes, ""] }));

  const removeIncludeRow = (idx: number) => setForm(f => ({
    ...f,
    includes: f.includes.filter((_, i) => i !== idx),
  }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.combo_price || isNaN(Number(form.combo_price))) { toast.error("Valid combo price required"); return; }
    if (!form.original_price || isNaN(Number(form.original_price))) { toast.error("Valid original price required"); return; }

    const cleanIncludes = form.includes.map(s => s.trim()).filter(Boolean);
    if (!cleanIncludes.length) { toast.error("Add at least one included item"); return; }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim(),
      combo_price: Number(form.combo_price),
      original_price: Number(form.original_price),
      includes: cleanIncludes,
      tag: form.tag.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from("combos").update(payload).eq("id", editing.id);
      if (error) { toast.error("Failed to update combo"); }
      else { toast.success("Combo updated!"); fetchCombos(); closeModal(); }
    } else {
      const { error } = await supabase.from("combos").insert(payload);
      if (error) { toast.error("Failed to create combo"); }
      else { toast.success("Combo created!"); fetchCombos(); closeModal(); }
    }
    setSaving(false);
  };

  const handleToggle = async (combo: DBCombo) => {
    const { error } = await supabase
      .from("combos")
      .update({ is_active: !combo.is_active })
      .eq("id", combo.id);
    if (!error) {
      setCombos(cs => cs.map(c => c.id === combo.id ? { ...c, is_active: !c.is_active } : c));
      toast.success(`"${combo.name}" ${!combo.is_active ? "enabled" : "hidden"}`);
    }
  };

  const handleDelete = async (combo: DBCombo) => {
    if (!window.confirm(`Delete "${combo.name}"? This cannot be undone.`)) return;
    setDeletingId(combo.id);
    const { error } = await supabase.from("combos").delete().eq("id", combo.id);
    if (error) { toast.error("Failed to delete"); }
    else { toast.success("Combo deleted"); setCombos(cs => cs.filter(c => c.id !== combo.id)); }
    setDeletingId(null);
  };

  const moveSort = async (combo: DBCombo, dir: -1 | 1) => {
    const idx = combos.findIndex(c => c.id === combo.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= combos.length) return;
    const other = combos[swapIdx];
    await supabase.from("combos").update({ sort_order: other.sort_order }).eq("id", combo.id);
    await supabase.from("combos").update({ sort_order: combo.sort_order }).eq("id", other.id);
    fetchCombos();
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8192C]";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-chewy text-2xl text-gray-900">Special Offers / Combos</h2>
          <p className="text-sm text-gray-500 font-[Montserrat] mt-0.5">
            Manage bundle deals shown on the Special Offers page
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[#E8192C] text-white px-4 py-2 rounded-xl text-sm font-semibold font-[Montserrat] hover:bg-[#c8151f] transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Combo
        </button>
      </div>

      {/* Combo list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 font-[Montserrat]">Loading…</div>
      ) : combos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🍱</p>
          <p className="font-chewy text-xl text-gray-400">No combos yet</p>
          <p className="text-sm text-gray-400 font-[Montserrat] mt-1 mb-4">Add your first bundle deal</p>
          <button onClick={openNew} className="bg-[#E8192C] text-white px-5 py-2 rounded-xl font-semibold font-[Montserrat] text-sm hover:bg-[#c8151f]">
            + Add Combo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {combos.map((combo, idx) => {
            const savings = combo.original_price - combo.combo_price;
            const pct = Math.round((savings / combo.original_price) * 100);
            return (
              <div key={combo.id} className={`bg-white rounded-xl border ${combo.is_active ? "border-gray-100" : "border-gray-200 opacity-60"} p-4 flex gap-4 items-start`}>
                {/* Sort controls */}
                <div className="flex flex-col gap-0.5 mt-1 flex-shrink-0">
                  <button onClick={() => moveSort(combo, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 p-0.5">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <GripVertical className="w-4 h-4 text-gray-300 mx-auto" />
                  <button onClick={() => moveSort(combo, 1)} disabled={idx === combos.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 p-0.5">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Image */}
                {combo.image_url ? (
                  <img src={combo.image_url} alt={combo.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl">🍱</div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-chewy text-lg text-gray-900">{combo.name}</h3>
                    {combo.tag && (
                      <span className="bg-[#E8192C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-[Montserrat]">
                        {combo.tag}
                      </span>
                    )}
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-[Montserrat]">
                      -{pct}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-[Montserrat] mt-0.5 line-clamp-1">{combo.description}</p>
                  <p className="text-xs text-gray-400 font-[Montserrat] mt-0.5">
                    Includes: {combo.includes.join(" · ")}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-chewy text-[#E8192C] text-base">{formatPrice(combo.combo_price)}</span>
                    <span className="text-gray-400 text-xs line-through font-[Montserrat]">{formatPrice(combo.original_price)}</span>
                    <span className="text-green-600 text-xs font-semibold font-[Montserrat]">saves {formatPrice(savings)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(combo)} title={combo.is_active ? "Hide" : "Show"}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    {combo.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button onClick={() => openEdit(combo)} title="Edit"
                    className="p-2 rounded-lg hover:bg-blue-50 transition-colors">
                    <Pencil className="w-4 h-4 text-blue-500" />
                  </button>
                  <button onClick={() => handleDelete(combo)} disabled={deletingId === combo.id} title="Delete"
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-chewy text-xl text-gray-900">{editing ? "Edit Combo" : "New Combo"}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold font-[Montserrat] text-gray-600 mb-1 block">Combo Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Burger + Chips + Drink" className={inputClass} />
              </div>

              <div>
                <label className="text-xs font-semibold font-[Montserrat] text-gray-600 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short description of the combo..." rows={2}
                  className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className="text-xs font-semibold font-[Montserrat] text-gray-600 mb-1 block">Image</label>
                <div className="flex gap-2 items-center">
                  <input type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    placeholder="Paste URL or upload a file…" className={`${inputClass} flex-1`} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold font-[Montserrat] transition-colors disabled:opacity-50 flex-shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                {form.image_url && (
                  <img src={form.image_url} alt="preview" className="mt-2 h-20 w-24 rounded-lg object-cover border border-gray-200" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold font-[Montserrat] text-gray-600 mb-1 block">Combo Price (₦) *</label>
                  <input type="number" min="0" value={form.combo_price} onChange={e => setForm(f => ({ ...f, combo_price: e.target.value }))}
                    placeholder="5000" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold font-[Montserrat] text-gray-600 mb-1 block">Original Price (₦) *</label>
                  <input type="number" min="0" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))}
                    placeholder="5500" className={inputClass} />
                </div>
              </div>

              {form.combo_price && form.original_price && Number(form.original_price) > Number(form.combo_price) && (
                <p className="text-xs text-green-600 font-[Montserrat] -mt-2">
                  ✓ Customer saves {formatPrice(Number(form.original_price) - Number(form.combo_price))} (
                  {Math.round(((Number(form.original_price) - Number(form.combo_price)) / Number(form.original_price)) * 100)}% off)
                </p>
              )}

              <div>
                <label className="text-xs font-semibold font-[Montserrat] text-gray-600 mb-2 block">
                  Included Items *
                  <span className="text-gray-400 font-normal"> (one per line)</span>
                </label>
                <div className="space-y-2">
                  {form.includes.map((inc, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={inc} onChange={e => handleIncludeChange(idx, e.target.value)}
                        placeholder={`e.g. 1× Classic Cheeseburger`} className={`${inputClass} flex-1`} />
                      {form.includes.length > 1 && (
                        <button onClick={() => removeIncludeRow(idx)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addIncludeRow} type="button"
                    className="text-xs text-[#E8192C] font-semibold font-[Montserrat] hover:underline">
                    + Add item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold font-[Montserrat] text-gray-600 mb-1 block">Tag Badge</label>
                  <input type="text" value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                    placeholder="e.g. Best Value" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold font-[Montserrat] text-gray-600 mb-1 block">Sort Order</label>
                  <input type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <input type="checkbox" id="combo-active" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-[#E8192C]" />
                <label htmlFor="combo-active" className="text-sm font-[Montserrat] text-gray-700 cursor-pointer">
                  Visible on the Special Offers page
                </label>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold font-[Montserrat] text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#E8192C] text-white py-2.5 rounded-xl font-semibold font-[Montserrat] text-sm hover:bg-[#c8151f] disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Combo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
