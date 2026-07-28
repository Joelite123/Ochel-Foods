import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase, DBOrder, DBOrderItem } from "@/lib/supabase";
import { formatPrice } from "@/data/menuData";
import {
  TrendingUp, Users, ShoppingBag, MousePointerClick, Download,
  Award, Star, Trophy,
} from "lucide-react";

type Period = "7d" | "30d" | "90d";
type ProductPeriod = "today" | "week" | "month" | "all";

type OrderWithItems = DBOrder & { order_items: DBOrderItem[] };

/* ── helpers ── */
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const label = i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`;
  return { hour: i, label };
});
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function filterByProductPeriod(orders: OrderWithItems[], pp: ProductPeriod): OrderWithItems[] {
  if (pp === "all") return orders;
  const now = new Date();
  const cutoff = new Date();
  if (pp === "today") { cutoff.setHours(0, 0, 0, 0); }
  else if (pp === "week") { cutoff.setDate(now.getDate() - 7); }
  else if (pp === "month") { cutoff.setDate(now.getDate() - 30); }
  return orders.filter((o) => new Date(o.created_at) >= cutoff);
}

function aggregateProducts(orders: OrderWithItems[]) {
  const map = new Map<string, { qty: number; revenue: number }>();
  for (const o of orders) {
    for (const item of o.order_items ?? []) {
      const key = item.product_name;
      const cur = map.get(key) ?? { qty: 0, revenue: 0 };
      map.set(key, {
        qty: cur.qty + item.quantity,
        revenue: cur.revenue + item.price * item.quantity,
      });
    }
  }
  return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>("30d");
  const [productPeriod, setProductPeriod] = useState<ProductPeriod>("month");
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [allOrders, setAllOrders] = useState<OrderWithItems[]>([]);
  const [visitData, setVisitData] = useState<{ date: string; visits: number }[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(true);

  /* ── Existing period-filtered fetch (powers existing charts) ── */
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

  /* ── All-orders fetch (powers new sections) — loaded once ── */
  useEffect(() => {
    setAllLoading(true);
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setAllOrders(data as OrderWithItems[]);
        setAllLoading(false);
      });
  }, []);

  /* ── Confirmed-only subsets (derived client-side, no extra DB reads) ── */
  const confirmedOrders = useMemo(() => orders.filter((o) => o.status === "confirmed"), [orders]);
  const confirmedAllOrders = useMemo(() => allOrders.filter((o) => o.status === "confirmed"), [allOrders]);

  /* ── Existing computed values (unchanged) ── */
  const revenueData = (() => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const map = new Map<string, { revenue: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      map.set(key, { revenue: 0, orders: 0 });
    }
    // Revenue from confirmed orders only
    confirmedOrders.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      if (map.has(key)) {
        const cur = map.get(key)!;
        map.set(key, { revenue: cur.revenue + Number(o.total), orders: cur.orders });
      }
    });
    // Order count from all orders (operational — shows total activity per day)
    orders.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      if (map.has(key)) {
        const cur = map.get(key)!;
        map.set(key, { revenue: cur.revenue, orders: cur.orders + 1 });
      }
    });
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
  })();

  const combinedData = revenueData.map((r) => ({
    ...r,
    visits: visitData.find((v) => v.date === r.date)?.visits ?? 0,
  }));

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ["#FFB800", "#3B82F6", "#F97316", "#8B5CF6", "#22C55E", "#6B7280"];

  const statusLabel: Record<string, string> = {
    unpaid: "Unpaid", confirmed: "Confirmed", preparing: "Preparing",
    out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
  };

  // Revenue & AOV use confirmed orders only (actual sales)
  const totalRevenue = confirmedOrders.reduce((s, o) => s + Number(o.total), 0);
  const deliveredRevenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
  const avgOrderValue = confirmedOrders.length > 0 ? totalRevenue / confirmedOrders.length : 0;
  // Conversion rate uses all orders placed (any status) vs site visits
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

  /* ── New computed values ── */

  /* Product aggregation for selected product period — confirmed orders only */
  const filteredForProducts = useMemo(
    () => filterByProductPeriod(confirmedAllOrders, productPeriod),
    [confirmedAllOrders, productPeriod]
  );

  const productStats = useMemo(() => aggregateProducts(filteredForProducts), [filteredForProducts]);

  const topProducts    = useMemo(() => [...productStats].sort((a, b) => b.qty - a.qty).slice(0, 10), [productStats]);
  const bottomProducts = useMemo(() => [...productStats].filter((p) => p.qty > 0).sort((a, b) => a.qty - b.qty).slice(0, 10), [productStats]);
  const revenueByProduct = useMemo(() => [...productStats].sort((a, b) => b.revenue - a.revenue).slice(0, 10), [productStats]);

  /* Top customers — all time, ranked by confirmed order spend */
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; spent: number }>();
    for (const o of confirmedAllOrders) {
      const key = o.customer_phone;
      const cur = map.get(key) ?? { name: o.customer_name, orders: 0, spent: 0 };
      map.set(key, { name: o.customer_name, orders: cur.orders + 1, spent: cur.spent + Number(o.total) });
    }
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent).slice(0, 10);
  }, [confirmedAllOrders]);

  /* Ordering trends — confirmed orders only (busy times reflect real sales) */
  const ordersByHour = useMemo(() => {
    const counts = new Array(24).fill(0);
    confirmedOrders.forEach((o) => { counts[new Date(o.created_at).getHours()]++; });
    return HOURS.map(({ hour, label }) => ({ label, orders: counts[hour] }));
  }, [confirmedOrders]);

  const ordersByWeekday = useMemo(() => {
    const counts = new Array(7).fill(0);
    confirmedOrders.forEach((o) => { counts[new Date(o.created_at).getDay()]++; });
    return WEEKDAYS.map((day, i) => ({ day: day.slice(0, 3), orders: counts[i] }));
  }, [confirmedOrders]);

  /* All-time summary insight cards — confirmed orders only */
  const allTimeProducts = useMemo(() => aggregateProducts(confirmedAllOrders), [confirmedAllOrders]);
  const bestSellingProduct   = useMemo(() => [...allTimeProducts].sort((a, b) => b.qty - a.qty)[0], [allTimeProducts]);
  const highestRevenueProduct = useMemo(() => [...allTimeProducts].sort((a, b) => b.revenue - a.revenue)[0], [allTimeProducts]);
  const topCustomerAllTime   = useMemo(() => topCustomers[0], [topCustomers]);

  const productPeriods: { key: ProductPeriod; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week",  label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all",   label: "All Time" },
  ];

  /* ── Rank badge helper ── */
  const rankBadge = (i: number) => {
    if (i === 0) return <span className="text-base">🥇</span>;
    if (i === 1) return <span className="text-base">🥈</span>;
    if (i === 2) return <span className="text-base">🥉</span>;
    return <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>;
  };

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

      {/* Existing summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Total Orders",          value: orders.length.toString(),      color: "text-blue-600",   bg: "bg-blue-50",   icon: ShoppingBag },
            { label: "Confirmed Revenue",     value: formatPrice(totalRevenue),     color: "text-[#E8192C]",  bg: "bg-red-50",    icon: TrendingUp },
            { label: "Delivered Revenue",     value: formatPrice(deliveredRevenue), color: "text-green-600",  bg: "bg-green-50",  icon: TrendingUp },
            { label: "Avg Order Value",       value: formatPrice(avgOrderValue),    color: "text-purple-600", bg: "bg-purple-50", icon: TrendingUp },
            { label: "Site Visits",        value: totalVisits.toLocaleString(), color: "text-orange-500", bg: "bg-orange-50", icon: Users },
            { label: "Conversion Rate",    value: `${conversionRate}%`,      color: "text-teal-600",   bg: "bg-teal-50",   icon: MousePointerClick },
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

      {/* Section 6 — insight summary cards (all-time) */}
      {!allLoading && (bestSellingProduct || highestRevenueProduct || topCustomerAllTime) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {bestSellingProduct && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="font-[Montserrat] min-w-0">
                <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Best Selling Product</p>
                <p className="font-bold text-gray-800 text-sm truncate">{bestSellingProduct.name}</p>
                <p className="text-xs text-gray-500">{bestSellingProduct.qty.toLocaleString()} units sold</p>
              </div>
            </div>
          )}
          {highestRevenueProduct && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-[#E8192C]" />
              </div>
              <div className="font-[Montserrat] min-w-0">
                <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Highest Revenue Product</p>
                <p className="font-bold text-gray-800 text-sm truncate">{highestRevenueProduct.name}</p>
                <p className="text-xs text-gray-500">{formatPrice(highestRevenueProduct.revenue)} earned</p>
              </div>
            </div>
          )}
          {topCustomerAllTime && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <div className="font-[Montserrat] min-w-0">
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Top Customer</p>
                <p className="font-bold text-gray-800 text-sm truncate">{topCustomerAllTime.name}</p>
                <p className="text-xs text-gray-500">{topCustomerAllTime.orders} orders · {formatPrice(topCustomerAllTime.spent)}</p>
              </div>
            </div>
          )}
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

      {/* ── New sections — product period selector shared across sections 1-3 ── */}
      {allLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="w-6 h-6 border-4 border-[#E8192C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Period selector for product sections */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold font-[Montserrat] text-gray-500">Product period:</span>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {productPeriods.map((p) => (
                <button key={p.key} onClick={() => setProductPeriod(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-[Montserrat] transition-all ${
                    productPeriod === p.key ? "bg-white text-[#E8192C] shadow-sm" : "text-gray-500"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sections 1 & 2 — Top and Lowest Selling Products side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Section 1 — Top Selling */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-chewy text-lg text-gray-800 mb-4">🥇 Top Selling Products</h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-gray-400 font-[Montserrat] italic">No sales data for this period.</p>
              ) : (
                <ol className="space-y-3">
                  {topProducts.map((p, i) => (
                    <li key={p.name} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-7 flex-shrink-0">
                        {rankBadge(i)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <p className="text-sm font-semibold font-[Montserrat] text-gray-800 truncate">{p.name}</p>
                          <p className="text-sm font-bold text-[#E8192C] font-[Montserrat] flex-shrink-0">{p.qty.toLocaleString()} sold</p>
                        </div>
                        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#E8192C] rounded-full"
                            style={{ width: `${Math.round((p.qty / topProducts[0].qty) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Section 2 — Lowest Selling */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-chewy text-lg text-gray-800 mb-1">📉 Lowest Selling Products</h3>
              <p className="text-xs text-gray-400 font-[Montserrat] mb-4">May need promotion or review</p>
              {bottomProducts.length === 0 ? (
                <p className="text-sm text-gray-400 font-[Montserrat] italic">No sales data for this period.</p>
              ) : (
                <ol className="space-y-3">
                  {bottomProducts.map((p, i) => (
                    <li key={p.name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-5 text-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <p className="text-sm font-semibold font-[Montserrat] text-gray-800 truncate">{p.name}</p>
                          <p className="text-sm font-bold text-gray-500 font-[Montserrat] flex-shrink-0">{p.qty.toLocaleString()} sold</p>
                        </div>
                        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-300 rounded-full"
                            style={{ width: `${Math.max(4, Math.round((p.qty / (topProducts[0]?.qty || 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Section 3 — Revenue by Product */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-chewy text-lg text-gray-800 mb-4">Revenue by Product</h3>
            {revenueByProduct.length === 0 ? (
              <p className="text-sm text-gray-400 font-[Montserrat] italic">No data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, revenueByProduct.length * 36)}>
                <BarChart data={revenueByProduct} layout="vertical" margin={{ left: 8, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fontFamily: "Montserrat" }}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11, fontFamily: "Montserrat" }}
                    tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 14) + "…" : v}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatPrice(v), "Revenue"]}
                    labelStyle={{ fontFamily: "Montserrat" }}
                  />
                  <Bar dataKey="revenue" fill="#E8192C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Section 4 — Top Customers */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-chewy text-lg text-gray-800 mb-1">Top Customers</h3>
            <p className="text-xs text-gray-400 font-[Montserrat] mb-4">Ranked by confirmed order spend — all time</p>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-gray-400 font-[Montserrat] italic">No customer data yet.</p>
            ) : (
              <div className="space-y-2">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-center w-7 flex-shrink-0">
                      {rankBadge(i)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-[Montserrat] text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 font-[Montserrat]">{c.orders} order{c.orders !== 1 ? "s" : ""}</p>
                    </div>
                    <p className="font-bold text-sm text-[#E8192C] font-[Montserrat] flex-shrink-0">{formatPrice(c.spent)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5 — Ordering Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Orders by Hour */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-chewy text-lg text-gray-800 mb-1">Orders by Hour</h3>
              <p className="text-xs text-gray-400 font-[Montserrat] mb-4">Busiest times of day — {period === "7d" ? "last 7 days" : period === "30d" ? "last 30 days" : "last 90 days"}</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ordersByHour} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fontFamily: "Montserrat" }}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Montserrat" }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: number) => [v, "Orders"]}
                    labelStyle={{ fontFamily: "Montserrat" }}
                  />
                  <Bar dataKey="orders" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Orders by Weekday */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-chewy text-lg text-gray-800 mb-1">Orders by Day of Week</h3>
              <p className="text-xs text-gray-400 font-[Montserrat] mb-4">Busiest days — {period === "7d" ? "last 7 days" : period === "30d" ? "last 30 days" : "last 90 days"}</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ordersByWeekday} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: "Montserrat" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Montserrat" }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: number) => [v, "Orders"]}
                    labelStyle={{ fontFamily: "Montserrat" }}
                  />
                  <Bar dataKey="orders" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
