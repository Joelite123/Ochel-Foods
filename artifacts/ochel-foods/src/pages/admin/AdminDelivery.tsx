import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, GripVertical } from "lucide-react";
import { supabase, DBDeliveryZone } from "@/lib/supabase";
import { toast } from "sonner";

const EMPTY: Partial<DBDeliveryZone> = { label: "", price: 0, description: "", is_active: true, sort_order: 0 };

export default function AdminDelivery() {
  const [zones, setZones] = useState<DBDeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DBDeliveryZone | null>(null);
  const [form, setForm] = useState<Partial<DBDeliveryZone>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("delivery_zones").select("*").order("sort_order");
    if (data) setZones(data as DBDeliveryZone[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY, sort_order: zones.length + 1 }); setShowForm(true); };
  const openEdit = (z: DBDeliveryZone) => { setEditing(z); setForm({ ...z }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.label || form.price === undefined) return toast.error("Label and price are required");
    setSaving(true);
    let error;
    if (editing) {
      ({ error } = await supabase.from("delivery_zones").update(form).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("delivery_zones").insert(form));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Zone updated" : "Zone added");
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this delivery zone?")) return;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Zone deleted");
    load();
  };

  const toggleActive = async (z: DBDeliveryZone) => {
    await supabase.from("delivery_zones").update({ is_active: !z.is_active }).eq("id", z.id);
    load();
  };

  const field = "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-3 py-2 text-sm font-[Montserrat] focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-chewy text-xl text-gray-800">Delivery Zones</h2>
          <p className="text-gray-400 text-sm font-[Montserrat]">Manage areas and their delivery fees. Customers see these during checkout.</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-[#E8192C] text-white px-4 py-2 rounded-xl font-bold font-[Montserrat] text-sm hover:bg-[#c8151f] transition-colors">
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-[Montserrat]">Loading…</div>
        ) : zones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 font-[Montserrat]">
            No delivery zones yet. Add your first zone.
          </div>
        ) : zones.map((z) => (
          <div key={z.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all ${z.is_active ? "border-gray-100" : "border-gray-100 opacity-50"}`}>
            <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-chewy text-lg text-gray-800">{z.label}</p>
                {!z.is_active && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-[Montserrat]">Inactive</span>}
              </div>
              {z.description && <p className="text-gray-400 text-xs font-[Montserrat]">{z.description}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-chewy text-xl text-[#E8192C]">₦{Number(z.price).toLocaleString()}</p>
              <p className="text-xs text-gray-400 font-[Montserrat]">delivery fee</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openEdit(z)}
                className="text-gray-400 hover:text-[#E8192C] p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => toggleActive(z)}
                className={`text-xs px-2 py-1 rounded-lg font-[Montserrat] font-semibold transition-colors ${
                  z.is_active ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}>
                {z.is_active ? "Active" : "Off"}
              </button>
              <button onClick={() => handleDelete(z.id)}
                className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-chewy text-xl text-gray-800">{editing ? "Edit Zone" : "Add Delivery Zone"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Zone Name *</label>
                <input value={form.label || ""} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className={field} placeholder="e.g. Ekwulobia Town" />
              </div>
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Delivery Fee (₦) *</label>
                <input type="number" value={form.price || ""} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  className={field} placeholder="e.g. 500" />
              </div>
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Description (optional)</label>
                <input value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={field} placeholder="e.g. Within 5km of Ekwulobia" />
              </div>
              <div>
                <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Sort Order</label>
                <input type="number" value={form.sort_order || 0} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                  className={field} />
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
                {saving ? "Saving…" : "Save Zone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
