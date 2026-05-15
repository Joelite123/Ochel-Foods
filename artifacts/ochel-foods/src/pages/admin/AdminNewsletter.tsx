import { useEffect, useState } from "react";
import { Mail, Download, Trash2, Send, Users } from "lucide-react";
import { supabase, DBNewsletterSubscriber } from "@/lib/supabase";
import { toast } from "sonner";

export default function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<DBNewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("newsletter_subscribers").select("*").order("subscribed_at", { ascending: false });
    if (data) setSubscribers(data as DBNewsletterSubscriber[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUnsubscribe = async (id: string) => {
    await supabase.from("newsletter_subscribers").update({ is_active: false }).eq("id", id);
    toast.success("Subscriber removed");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subscriber?")) return;
    await supabase.from("newsletter_subscribers").delete().eq("id", id);
    toast.success("Subscriber deleted");
    load();
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return toast.error("Subject and body are required");
    const active = subscribers.filter((s) => s.is_active);
    if (active.length === 0) return toast.error("No active subscribers");
    setSending(true);

    // Send via API
    const res = await fetch("/api/newsletter/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, recipients: active.map((s) => ({ email: s.email, name: s.name })) }),
    });
    setSending(false);

    if (res.ok) {
      toast.success(`Email sent to ${active.length} subscriber${active.length !== 1 ? "s" : ""}!`);
      setSubject(""); setBody("");
    } else {
      toast.error("Failed to send. Check server logs.");
    }
  };

  const handleExport = () => {
    const csv = ["Name,Email,Subscribed,Active"]
      .concat(subscribers.map((s) =>
        `"${s.name ?? ""}","${s.email}","${new Date(s.subscribed_at).toLocaleDateString("en-GB")}","${s.is_active ? "Yes" : "No"}"`
      ))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const active = subscribers.filter((s) => s.is_active);
  const field = "w-full border-2 border-gray-200 focus:border-[#E8192C] rounded-xl px-3 py-2 text-sm font-[Montserrat] focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <Users className="w-8 h-8 text-[#E8192C] bg-red-50 p-1.5 rounded-xl" />
          <div>
            <p className="font-chewy text-2xl text-gray-900">{subscribers.length}</p>
            <p className="text-xs text-gray-400 font-[Montserrat]">Total subscribers</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <Mail className="w-8 h-8 text-green-600 bg-green-50 p-1.5 rounded-xl" />
          <div>
            <p className="font-chewy text-2xl text-gray-900">{active.length}</p>
            <p className="text-xs text-gray-400 font-[Montserrat]">Active subscribers</p>
          </div>
        </div>
      </div>

      {/* Send email */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-[#E8192C]" />
          <h2 className="font-chewy text-xl text-gray-800">Send Email Campaign</h2>
        </div>
        <p className="text-xs text-gray-400 font-[Montserrat]">
          This will send an email to all <strong>{active.length}</strong> active subscribers.
          Make sure SMTP is configured in your server environment.
        </p>
        <div>
          <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Subject Line</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={field}
            placeholder="e.g. This weekend only — 20% off all pizzas!" />
        </div>
        <div>
          <label className="text-sm font-semibold font-[Montserrat] text-gray-700 block mb-1">Email Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className={`${field} resize-none`} rows={6}
            placeholder="Write your email message here. Plain text or basic HTML is supported." />
        </div>
        <button onClick={handleSend} disabled={sending || active.length === 0}
          className="flex items-center gap-2 bg-[#E8192C] text-white px-6 py-3 rounded-xl font-bold font-[Montserrat] hover:bg-[#c8151f] disabled:opacity-60">
          <Send className="w-4 h-4" />
          {sending ? "Sending…" : `Send to ${active.length} subscribers`}
        </button>
      </div>

      {/* Subscriber list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-chewy text-lg text-gray-800">Subscribers</h3>
          <button onClick={handleExport}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-[Montserrat] border border-gray-200 px-3 py-1.5 rounded-lg">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-[Montserrat]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Subscribed</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>
              ) : subscribers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No subscribers yet</td></tr>
              ) : subscribers.map((s) => (
                <tr key={s.id} className={`hover:bg-gray-50 ${!s.is_active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 text-gray-800">{s.email}</td>
                  <td className="px-4 py-3 text-gray-500">{s.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {s.is_active ? "Active" : "Unsubscribed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.subscribed_at).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {s.is_active && (
                        <button onClick={() => handleUnsubscribe(s.id)} className="text-xs text-orange-500 hover:underline font-[Montserrat]">
                          Unsubscribe
                        </button>
                      )}
                      <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
