import { useEffect, useState } from "react";
import { Plus, Trash2, Clock, CalendarX } from "lucide-react";
import { supabase, DBOperatingHour, DBPublicHoliday } from "@/lib/supabase";
import { toast } from "sonner";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmt(h: number, m: number) {
  const period = h >= 12 ? "PM" : "AM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${m.toString().padStart(2, "0")} ${period}`;
}

export default function AdminHours() {
  const [hours, setHours] = useState<DBOperatingHour[]>([]);
  const [holidays, setHolidays] = useState<DBPublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "", is_closed: true });

  const load = async () => {
    setLoading(true);
    const [{ data: h }, { data: hols }] = await Promise.all([
      supabase.from("operating_hours").select("*").order("day_of_week"),
      supabase.from("public_holidays").select("*").order("date"),
    ]);
    if (h) setHours(h as DBOperatingHour[]);
    if (hols) setHolidays(hols as DBPublicHoliday[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateHour = (dayIdx: number, field: keyof DBOperatingHour, value: number | boolean) => {
    setHours((prev) => prev.map((h) => h.day_of_week === dayIdx ? { ...h, [field]: value } : h));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const h of hours) {
      await supabase.from("operating_hours").update({
        open_hour: h.open_hour, open_minute: h.open_minute,
        close_hour: h.close_hour, close_minute: h.close_minute,
        is_closed: h.is_closed,
      }).eq("id", h.id);
    }
    setSaving(false);
    toast.success("Operating hours saved");
  };

  const addHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name) return toast.error("Date and name are required");
    const { error } = await supabase.from("public_holidays").insert(newHoliday);
    if (error) return toast.error(error.message);
    toast.success("Holiday added");
    setNewHoliday({ date: "", name: "", is_closed: true });
    load();
  };

  const deleteHoliday = async (id: string) => {
    await supabase.from("public_holidays").delete().eq("id", id);
    toast.success("Holiday removed");
    load();
  };

  const field = "border-2 border-gray-200 focus:border-[#E8192C] rounded-lg px-2 py-1.5 text-sm font-[Montserrat] focus:outline-none";

  if (loading) return <div className="text-center py-12 text-gray-400 font-[Montserrat]">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Operating Hours */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[#E8192C]" />
          <h2 className="font-chewy text-xl text-gray-800">Weekly Operating Hours</h2>
        </div>
        <p className="text-gray-400 text-sm font-[Montserrat] mb-4">
          These hours control the delivery time slot selector. Customers can only book slots during open hours.
        </p>

        <div className="space-y-3">
          {hours.map((h) => (
            <div key={h.day_of_week} className={`flex items-center gap-3 p-3 rounded-xl border ${h.is_closed ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-100"}`}>
              <div className="w-24 flex-shrink-0">
                <p className="font-semibold text-sm font-[Montserrat] text-gray-700">{DAY_NAMES[h.day_of_week]}</p>
              </div>

              {h.is_closed ? (
                <span className="text-gray-400 text-sm font-[Montserrat] flex-1">Closed</span>
              ) : (
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <input type="number" min={0} max={23} value={h.open_hour}
                    onChange={(e) => updateHour(h.day_of_week, "open_hour", Number(e.target.value))}
                    className={`${field} w-16`} placeholder="9" />
                  <span className="text-gray-400 text-sm">:</span>
                  <input type="number" min={0} max={59} value={h.open_minute}
                    onChange={(e) => updateHour(h.day_of_week, "open_minute", Number(e.target.value))}
                    className={`${field} w-16`} placeholder="00" />
                  <span className="text-gray-400 text-sm font-[Montserrat]">to</span>
                  <input type="number" min={0} max={23} value={h.close_hour}
                    onChange={(e) => updateHour(h.day_of_week, "close_hour", Number(e.target.value))}
                    className={`${field} w-16`} placeholder="22" />
                  <span className="text-gray-400 text-sm">:</span>
                  <input type="number" min={0} max={59} value={h.close_minute}
                    onChange={(e) => updateHour(h.day_of_week, "close_minute", Number(e.target.value))}
                    className={`${field} w-16`} placeholder="00" />
                  <span className="text-gray-400 text-xs font-[Montserrat]">
                    ({fmt(h.open_hour, h.open_minute)} – {fmt(h.close_hour, h.close_minute)})
                  </span>
                </div>
              )}

              <label className="flex items-center gap-1.5 text-xs font-[Montserrat] flex-shrink-0 cursor-pointer">
                <input type="checkbox" checked={h.is_closed}
                  onChange={(e) => updateHour(h.day_of_week, "is_closed", e.target.checked)} />
                Closed
              </label>
            </div>
          ))}
        </div>

        <button onClick={saveAll} disabled={saving}
          className="mt-5 w-full bg-[#E8192C] text-white py-3 rounded-xl font-bold font-[Montserrat] hover:bg-[#c8151f] disabled:opacity-60">
          {saving ? "Saving…" : "Save Hours"}
        </button>
      </div>

      {/* Public Holidays */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarX className="w-5 h-5 text-[#E8192C]" />
          <h2 className="font-chewy text-xl text-gray-800">Public Holidays</h2>
        </div>
        <p className="text-gray-400 text-sm font-[Montserrat] mb-4">
          Mark public holidays as closed — the delivery slot selector will respect these dates.
        </p>

        {/* Add holiday */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold font-[Montserrat] text-gray-700">Add Holiday</h3>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday((f) => ({ ...f, date: e.target.value }))}
              className={`${field} w-full`} />
            <input placeholder="Holiday name" value={newHoliday.name} onChange={(e) => setNewHoliday((f) => ({ ...f, name: e.target.value }))}
              className={`${field} w-full`} />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-[Montserrat] text-gray-700">
              <input type="checkbox" checked={newHoliday.is_closed} onChange={(e) => setNewHoliday((f) => ({ ...f, is_closed: e.target.checked }))} />
              Closed on this day
            </label>
            <button onClick={addHoliday}
              className="flex items-center gap-2 bg-[#E8192C] text-white px-4 py-2 rounded-xl text-sm font-bold font-[Montserrat] hover:bg-[#c8151f]">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {/* Holiday list */}
        {holidays.length === 0 ? (
          <p className="text-gray-400 text-sm font-[Montserrat] text-center py-4">No holidays added yet</p>
        ) : (
          <div className="space-y-2">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="font-semibold text-sm font-[Montserrat] text-gray-800">{h.name}</p>
                  <p className="text-xs text-gray-400 font-[Montserrat]">
                    {new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    {h.is_closed && " · Closed"}
                  </p>
                </div>
                <button onClick={() => deleteHoliday(h.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
