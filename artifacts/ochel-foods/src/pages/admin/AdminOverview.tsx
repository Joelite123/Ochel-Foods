import { useEffect, useState } from "react";
import { ShoppingBag, DollarSign, Users, TrendingUp, Clock } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { supabase, DBOrder } from "@/lib/supabase";
import { formatPrice } from "@/data/menuData";
import PinGuard from "@/components/ui/PinGuard";

type Stats = {
  todayOrders: number;
  todayRevenue: number;
  weekOrders: number;
  weekRevenue: number;
  totalCustomers: number;
  pendingOrders: number;
};

type ChartPoint = { date: string; revenue: number; orders: number };

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    todayOrders: 0, todayRevenue: 0, weekOrders: 0,
    weekRevenue: 0, totalCustomers: 0, pendingOrders: 0,
  });
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<DBOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);

      const [{ data: allOrders }, { count: customerCount }] = await Promise.all([
        supabase.from("orders").select("*").gte("created_at", weekStart.toISOString()).order("created_at"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
      ]);

      const orders = (allOrders as DBOrder[]) || [];

      // Only count revenue from orders that are not cancelled or unpaid
      const isRevenue = (o: DBOrder) => !["cancelled", "unpaid"].includes(o.status);

      // Stats
      const todayOrders = orders.filter((o) => new Date(o.created_at) >= todayStart);
      const pendingOrders = orders.filter((o) => ["unpaid", "confirmed", "preparing", "out_for_delivery"].includes(o.status));

      setStats({
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.filter(isRevenue).reduce((s, o) => s + Number(o.total), 0),
        weekOrders: orders.length,
        weekRevenue: orders.filter(isRevenue).reduce((s, o) => s + Number(o.total), 0),
        totalCustomers: customerCount || 0,
        pendingOrders: pendingOrders.length,
      });

      // Chart: last 7 days
      const days: ChartPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999);
        const dayOrders = orders.filter((o) => {
          const c = new Date(o.created_at);
          return c >= d && c <= dEnd;
        });
        days.push({
          date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          revenue: dayOrders.filter(isRevenue).reduce((s, o) => s + Number(o.total), 0),
          orders: dayOrders.length,
        });
      }
      setChartData(days);

      // Recent orders (all time, last 8)
      const { data: recent } = await supabase
        .from("orders").select("*").order("created_at", { ascending: false }).limit(8);
      setRecentOrders((recent as DBOrder[]) || []);

      setLoading(false);
    };
    load();
  }, []);

  const statusColor: Record<string, string> = {
    unpaid: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    preparing: "bg-orange-100 text-orange-700",
    out_for_delivery: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const statusLabel: Record<string, string> = {
    unpaid: "Unpaid", confirmed: "Confirmed", preparing: "Preparing",
    out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
  };

  const cards = [
    { label: "Today's Orders", value: stats.todayOrders, sub: "orders placed today", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Today's Revenue", value: formatPrice(stats.todayRevenue), sub: "from today's orders", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { label: "This Week", value: formatPrice(stats.weekRevenue), sub: `${stats.weekOrders} orders`, icon: TrendingUp, color: "text-[#E8192C]", bg: "bg-red-50" },
    { label: "Active Orders", value: stats.pendingOrders, sub: "need attention", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Total Customers", value: stats.totalCustomers, sub: "registered users", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <PinGuard title="Business Overview">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#E8192C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
      <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="font-chewy text-2xl text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-400 font-[Montserrat]">{c.label}</p>
            <p className="text-xs text-gray-300 font-[Montserrat]">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-chewy text-lg text-gray-800 mb-4">Revenue — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "Montserrat" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "Montserrat" }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatPrice(v)} labelStyle={{ fontFamily: "Montserrat" }} />
              <Line type="monotone" dataKey="revenue" stroke="#E8192C" strokeWidth={2} dot={{ r: 3, fill: "#E8192C" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-chewy text-lg text-gray-800 mb-4">Orders — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "Montserrat" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "Montserrat" }} allowDecimals={false} />
              <Tooltip labelStyle={{ fontFamily: "Montserrat" }} />
              <Bar dataKey="orders" fill="#E8192C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-chewy text-lg text-gray-800 mb-4">Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <p className="text-gray-400 text-sm font-[Montserrat] text-center py-8">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-[Montserrat]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-semibold">Order</th>
                  <th className="pb-2 font-semibold">Customer</th>
                  <th className="pb-2 font-semibold">Total</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 font-mono text-xs text-gray-500">#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="py-2.5 font-semibold text-gray-800">{o.customer_name}</td>
                    <td className="py-2.5 text-[#E8192C] font-semibold">{formatPrice(Number(o.total))}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {statusLabel[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400 text-xs">
                      {new Date(o.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      )}
    </PinGuard>
  );
}
