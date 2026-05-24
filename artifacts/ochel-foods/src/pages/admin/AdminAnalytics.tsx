import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase, DBOrder } from "@/lib/supabase";
import { formatPrice } from "@/data/menuData";
import { TrendingUp, Users, ShoppingBag, MousePointerClick, Download } from "lucide-react";

type Period = "7d" | "30d" | "90d";

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>("30d");
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [visitData, setVisitData] = useState<{ date: string; visits: number }[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const since = new Date(); since.setDate(since.getDate() - days);

      const [{ data: ordersData }, { data: visitsData }] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .gte("created_at", since.toISOString())
          .order("created_at"),
        supabase
          .from("site_visits")
          .select("visited_at")
          .gte("visited_at", since.toISOString()),
      ]);

      if (ordersData) setOrders(ordersData as DBOrder[]);

      // Build visits-per-day map
      const visitMap = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const key = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        visitMap.set(key, 0);
      }
      if (visitsData) {
        visitsData.forEach((v: { visited_at: string }) => {
          const key = new Date(v.visited_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          if (visitMap.has(key)) visitMap.set(key, (visitMap.get(key) ?? 0) + 1);
        });
        setTotalVisits(visitsData.length);
      } else {
        setTotalVisits(0);
      }
      setVisitData(Array.from(visitMap.entries()).map(([date, visits]) => ({ date, visits })));

      setLoading(false);
    };
    load();
  }, [period]);

  // Revenue over time
  const revenueData = (() => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const map = new Map<string, { revenue: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      map.set(key, { revenue: 0, orders: 0 });
    }
    orders.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      if (map.has(key)) {
        const cur = map.get(key)!;
        map.set(key, { revenue: cur.revenue + Number(o.total), orders: cur.orders + 1 });
      }
    });
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
  })();

  // Merge visits into revenue data for combined chart
  const combinedData = revenueData.map((r) => ({
    ...r,
    visits: visitData.find((v) => v.date === r.date)?.visits ?? 0,
  }));

  // Status breakdown
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ["#FFB800", "#3B82F6", "#F97316", "#8B5CF6", "#22C55E", "#6B7280"];

  const statusLabel: Record<string, string> = {
    pending: "Pending", confirmed: "Confirmed", preparing: "Preparing",
    out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
  };

  // Summary
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const deliveredRevenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const conversionRate = totalVisits > 0 ? ((orders.length / totalVisits) * 100).toFixed(1) : "0.0";

  const handleExport = () => {
    const csv = ["Date,Revenue (₦),Orders,Visits"]
      .concat(combinedData.map((r) => `"${r.date}",${r.revenue},${r.orders},${r.visits}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `analytics-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const periods: { key: Period; label: string }[] = [
    { key: "7d", label: "7 Days" }, { key: "30d", label: "30 Days" }, { key: "90d", label: "90 Days" },
  ];

  const xInterval = period === "7d" ? 0 : period === "30d" ? 4 : 9;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {periods.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold font-[Montserrat] transition-all ${
                period === p.key ? "bg-white text-[#E8192C] shadow-sm" : "text-gray-500"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm font-[Montserrat] hover:border-gray-300">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Total Orders", value: orders.length.toString(), color: "text-blue-600", bg: "bg-blue-50", icon: ShoppingBag },
            { label: "Total Revenue", value: formatPrice(totalRevenue), color: "text-[#E8192C]", bg: "bg-red-50", icon: TrendingUp },
            { label: "Delivered Revenue", value: formatPrice(deliveredRevenue), color: "text-green-600", bg: "bg-green-50", icon: TrendingUp },
            { label: "Avg Order Value", value: formatPrice(avgOrderValue), color: "text-purple-600", bg: "bg-purple-50", icon: TrendingUp },
            { label: "Site Visits", value: totalVisits.toLocaleString(), color: "text-orange-500", bg: "bg-orange-50", icon: Users },
            { label: "Conversion Rate", value: `${conversionRate}%`, color: "text-teal-600", bg: "bg-teal-50", icon: MousePointerClick },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-2`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <p className={`font-chewy text-xl ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-400 font-[Montserrat]">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-[#E8192C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Revenue chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-chewy text-lg text-gray-800 mb-4">Revenue Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "Montserrat" }} interval={xInterval} />
                <YAxis tick={{ fontSize: 10, fontFamily: "Montserrat" }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} labelStyle={{ fontFamily: "Montserrat" }} />
                <Line type="monotone" dataKey="revenue" stroke="#E8192C" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Visits vs Orders chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-chewy text-lg text-gray-800 mb-1">Site Visits vs Orders</h3>
            <p className="text-xs text-gray-400 font-[Montserrat] mb-4">How many visitors converted to orders each day</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "Montserrat" }} interval={xInterval} />
                <YAxis tick={{ fontSize: 10, fontFamily: "Montserrat" }} allowDecimals={false} />
                <Tooltip labelStyle={{ fontFamily: "Montserrat" }} />
                <Line type="monotone" dataKey="visits" stroke="#F97316" strokeWidth={2.5} dot={false} name="Visits" />
                <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2.5} dot={false} name="Orders" />
                <Legend wrapperStyle={{ fontFamily: "Montserrat", fontSize: 12 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Orders per day bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-chewy text-lg text-gray-800 mb-4">Orders Per Day</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "Montserrat" }} interval={xInterval} />
                <YAxis tick={{ fontSize: 10, fontFamily: "Montserrat" }} allowDecimals={false} />
                <Tooltip labelStyle={{ fontFamily: "Montserrat" }} />
                <Bar dataKey="orders" fill="#FFB800" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Order status breakdown */}
          {pieData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-chewy text-lg text-gray-800 mb-4">Order Status Breakdown</h3>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, statusLabel[name as string] ?? name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 font-[Montserrat]">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600">{statusLabel[entry.name] ?? entry.name}</span>
                      <span className="font-semibold text-gray-800 ml-auto pl-4">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
