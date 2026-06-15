"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_USERS,
  GET_ME,
  GET_DASHBOARD_DATA,
  CREATE_ORDER,
  PAY_ORDER,
  CANCEL_ORDER,
  UPDATE_PAYMENT_METHOD,
} from "./graphql-queries";
import { UserBadge } from "../components/UserBadge";
import { RBACIndicator } from "../components/RBACIndicator";

interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  currency: string;
  description: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  country: string;
  imageUrl: string | null;
  menuItems: MenuItem[];
}

interface PaymentMethod {
  id: string;
  country: string;
  methodType: string;
  details: string;
}

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  menuItem: {
    id: string;
    name: string;
  };
}

interface Order {
  id: string;
  userId: string;
  country: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  paymentMethodId: string | null;
  paymentMethod: PaymentMethod | null;
  items: OrderItem[];
  user: {
    id: string;
    name: string;
    role: string;
    country: string;
  };
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeUserId, setActiveUserId] = useState("");
  const [activeTab, setActiveTab] = useState<"restaurants" | "orders" | "payments">("restaurants");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  
  // Cart state
  const [cart, setCart] = useState<{ [id: string]: CartItem }>({});
  const [showCart, setShowCart] = useState(false);

  // Notifications
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Edit payment method form states
  const [editPmId, setEditPmId] = useState<string | null>(null);
  const [editPmType, setEditPmType] = useState("");
  const [editPmDetails, setEditPmDetails] = useState("");

  // Login manual entry state
  const [manualId, setManualId] = useState("");

  // 1. GraphQL Queries & Mutations
  const { data: usersData, loading: loadingUsers } = useQuery(GET_USERS);
  const { data: meData, refetch: refetchMe } = useQuery(GET_ME, {
    skip: !activeUserId,
  });
  const { data: dashboardData, loading: loadingDashboard, error: dashboardError, refetch: refetchDashboard } = useQuery(GET_DASHBOARD_DATA, {
    skip: !isLoggedIn,
  });

  const [createOrderMutation] = useMutation(CREATE_ORDER);
  const [payOrderMutation] = useMutation(PAY_ORDER);
  const [cancelOrderMutation] = useMutation(CANCEL_ORDER);
  const [updatePaymentMethodMutation] = useMutation(UPDATE_PAYMENT_METHOD);

  // Set client flag to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true);
    const savedId = localStorage.getItem("slooze_user_id");
    if (savedId) {
      setActiveUserId(savedId);
      setIsLoggedIn(true);
    }
  }, []);

  // Sync data when active user changes or logs in
  useEffect(() => {
    if (activeUserId) {
      refetchMe().then(() => {
        if (isLoggedIn) {
          refetchDashboard();
        }
      });
    }
  }, [activeUserId, isLoggedIn]);

  const triggerAlert = (type: "error" | "success", msg: string) => {
    if (type === "error") {
      setErrorAlert(msg);
      setSuccessAlert(null);
    } else {
      setSuccessAlert(msg);
      setErrorAlert(null);
    }
    setTimeout(() => {
      setErrorAlert((prev) => (prev === msg ? null : prev));
      setSuccessAlert((prev) => (prev === msg ? null : prev));
    }, 6000);
  };

  // Auth Handlers
  const handleLogin = (userId: string) => {
    localStorage.setItem("slooze_user_id", userId);
    setActiveUserId(userId);
    setIsLoggedIn(true);
    setCart({}); // clear cart on user change
    setSelectedRestaurant(null);
    triggerAlert("success", `Successfully signed in as ${userId}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem("slooze_user_id");
    setActiveUserId("");
    setIsLoggedIn(false);
    setCart({});
    setSelectedRestaurant(null);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    const targetId = manualId.trim().toLowerCase();
    
    // Check if ID is seeded
    const exists = (usersData as any)?.users?.some((u: any) => u.id === targetId);
    if (!exists) {
      triggerAlert("error", `User ID '${targetId}' not found. Please select a profile card or enter a valid ID.`);
      return;
    }
    handleLogin(targetId);
    setManualId("");
  };

  // Cart Handlers
  const addToCart = (item: MenuItem) => {
    const currentItems = Object.values(cart);
    if (currentItems.length > 0) {
      const firstItem = currentItems[0].item;
      if (firstItem.currency !== item.currency) {
        triggerAlert("error", "Cannot mix items with different currencies in a single cart.");
        return;
      }
    }

    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: { item, quantity: existing ? existing.quantity + 1 : 1 },
      };
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: newQty },
      };
    });
  };

  const getCartTotal = () => {
    const items = Object.values(cart);
    if (items.length === 0) return { amount: 0, currency: "" };
    const amount = items.reduce((sum, curr) => sum + curr.item.price * curr.quantity, 0);
    const currency = items[0].item.currency;
    return { amount, currency };
  };

  const getCartTotalCount = () => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  };

  // Place Order (Mutation)
  const handlePlaceOrder = async () => {
    const items = Object.values(cart);
    if (items.length === 0 || !(meData as any)?.me) return;

    try {
      const firstItem = items[0].item;
      const targetRestaurant = (dashboardData as any)?.restaurants?.find((r: any) => r.id === firstItem.restaurantId);
      const country = targetRestaurant ? targetRestaurant.country : ((meData as any).me.country === "Global" ? "India" : (meData as any).me.country);

      const itemsPayload = items.map((c) => ({
        menuItemId: parseInt(c.item.id),
        quantity: c.quantity,
      }));

      await createOrderMutation({
        variables: { country, items: itemsPayload },
      });

      setCart({});
      setShowCart(false);
      setActiveTab("orders");
      triggerAlert("success", "Pending order created successfully!");
      refetchDashboard();
    } catch (err: any) {
      triggerAlert("error", err.message);
    }
  };

  // Pay Order (Mutation)
  const handlePayOrder = async (orderId: string) => {
    try {
      await payOrderMutation({
        variables: { orderId: parseInt(orderId) },
      });
      triggerAlert("success", `Order #${orderId} paid successfully!`);
      refetchDashboard();
    } catch (err: any) {
      triggerAlert("error", err.message);
    }
  };

  // Cancel Order (Mutation)
  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrderMutation({
        variables: { orderId: parseInt(orderId) },
      });
      triggerAlert("success", `Order #${orderId} cancelled.`);
      refetchDashboard();
    } catch (err: any) {
      triggerAlert("error", err.message);
    }
  };

  // Edit Payment Methods (Mutation)
  const handleStartEditPm = (pm: PaymentMethod) => {
    setEditPmId(pm.id);
    setEditPmType(pm.methodType);
    setEditPmDetails(pm.details);
  };

  const handleSavePm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPmId) return;

    try {
      await updatePaymentMethodMutation({
        variables: {
          id: parseInt(editPmId),
          methodType: editPmType,
          details: editPmDetails,
        },
      });
      triggerAlert("success", "Corporate account updated!");
      setEditPmId(null);
      refetchDashboard();
    } catch (err: any) {
      triggerAlert("error", err.message);
    }
  };

  const getCountryFlag = (country: string) => {
    return country.toLowerCase() === "india" ? "🇮🇳" : country.toLowerCase() === "america" ? "🇺🇸" : "🌐";
  };

  if (!isClient) return null;

  // --- UNAUTHENTICATED STATE: LOGIN PAGE ---
  if (!isLoggedIn) {
    return (
      <div className="min-height-screen bg-[#090d16] flex flex-col justify-center items-center p-6 text-white">
        <div className="w-full max-w-4xl bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col gap-8">
          
          {/* Logo and Greeting */}
          <div className="flex flex-col items-center gap-2 text-center">
            <img src="/FFFFFF-1.png" alt="Slooze Logo" className="h-16 w-auto" onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=80&auto=format&fit=crop";
            }} />
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 bg-gradient-to-r from-indigo-300 to-indigo-500 bg-clip-text text-transparent">
              Corporate Food Portal
            </h1>
            <p className="text-gray-400 text-sm max-w-md">
              Sign in using one of the pre-seeded employee roles to evaluate RBAC and country Relational Access Control policies.
            </p>
          </div>

          {/* Alert messages */}
          {errorAlert && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm flex items-center gap-2 animate-pulse">
              ⚠️ {errorAlert}
            </div>
          )}

          {/* Profile Switcher Grid */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">
              Predefined Personas
            </h2>
            {loadingUsers ? (
              <div className="text-center py-6 text-gray-500 animate-pulse text-sm">Loading employees list...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(usersData as any)?.users?.map((u: any) => (
                  <div
                    key={u.id}
                    onClick={() => handleLogin(u.id)}
                    className="bg-gray-950/40 hover:bg-gray-950/70 border border-white/5 hover:border-indigo-500/50 rounded-2xl p-5 cursor-pointer transition-all duration-300 flex items-center justify-between shadow-sm group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-sm text-white">
                        {u.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">
                          {u.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">
                          {u.role}
                        </span>
                      </div>
                    </div>
                    <span className="text-xl" title={u.country}>
                      {getCountryFlag(u.country)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Login */}
          <div className="border-t border-white/5 pt-6 flex flex-col gap-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">
              Or Manual Employee Sign In
            </h2>
            <form onSubmit={handleManualLogin} className="flex gap-2 max-w-md mx-auto w-full">
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="e.g. thanos, nick_fury, travis..."
                className="flex-1 bg-gray-950/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 focus:bg-gray-950/70 transition-all"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 font-semibold text-sm transition-all shadow-md shadow-indigo-600/20"
              >
                Sign In
              </button>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // --- AUTHENTICATED STATE: DASHBOARD ---
  const activeUserObj = (meData as any)?.me || null;

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-200 flex flex-col font-sans">
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0c1220]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <img src="/FFFFFF-1.png" alt="Slooze Logo" className="h-10 w-auto" onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=50&auto=format&fit=crop";
          }} />
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-200 to-indigo-500 bg-clip-text text-transparent">
            Slooze Food Ordering
          </span>
        </div>

        <div className="flex items-center gap-4">
          {activeUserObj && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              Logged in as <strong className="text-gray-200">{activeUserObj.name}</strong>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-xs font-semibold px-4 py-2 rounded-xl transition-all text-gray-300 hover:text-red-400"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* DASHBOARD GRID CONTENT */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        
        {/* SIDEBAR */}
        <aside className="flex flex-col gap-6">
          <UserBadge user={activeUserObj} />
          
          <nav className="bg-gray-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex flex-col gap-1 shadow-md">
            <button
              onClick={() => {
                setActiveTab("restaurants");
                setSelectedRestaurant(null);
              }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === "restaurants"
                  ? "bg-indigo-600/15 text-indigo-400 border-l-4 border-indigo-500"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              🍔 Restaurants & Menu
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === "orders"
                  ? "bg-indigo-600/15 text-indigo-400 border-l-4 border-indigo-500"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              📋 Order Ledger
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === "payments"
                  ? "bg-indigo-600/15 text-indigo-400 border-l-4 border-indigo-500"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              💳 Billing Accounts
            </button>
          </nav>

          <RBACIndicator user={activeUserObj} />
        </aside>

        {/* MAIN DISPLAY AREA */}
        <main className="flex flex-col gap-6">
          
          {/* Notification Banners */}
          {errorAlert && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl p-4 text-sm flex items-center gap-2 animate-bounce">
              ⚠️ {errorAlert}
            </div>
          )}
          {successAlert && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl p-4 text-sm flex items-center gap-2 animate-pulse">
              🎉 {successAlert}
            </div>
          )}

          {loadingDashboard && (
            <div className="text-center py-20 text-gray-500 animate-pulse text-sm">
              Loading secure data via GraphQL...
            </div>
          )}

          {/* TAB 1: RESTAURANTS AND MENU */}
          {!loadingDashboard && activeTab === "restaurants" && (
            <>
              {selectedRestaurant === null ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Restaurants</h2>
                    <p className="text-gray-400 text-xs mt-1">
                      Enforced Relational Scoping (Re-BAC): Displaying restaurants from {activeUserObj?.country}
                    </p>
                  </div>

                  {(dashboardData as any)?.restaurants?.length === 0 ? (
                    <div className="text-center py-16 bg-gray-900/30 border border-white/5 rounded-2xl text-gray-500">
                      No restaurants available in your assigned region.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(dashboardData as any)?.restaurants?.map((r: Restaurant) => (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRestaurant(r)}
                          className="bg-gray-900/50 hover:bg-gray-900/70 border border-white/5 hover:border-indigo-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shadow-sm flex flex-col group hover:-translate-y-1"
                        >
                          <div className="h-40 w-full relative bg-gray-800">
                            <img
                              src={r.imageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop"}
                              alt={r.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop";
                              }}
                            />
                            <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                              {getCountryFlag(r.country)} {r.country}
                            </span>
                          </div>
                          <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">
                              {r.name}
                            </h3>
                            <p className="text-gray-400 text-xs mt-1">{r.cuisine}</p>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-4">
                              Explore Menu →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Menu List view
                <div>
                  <button
                    onClick={() => setSelectedRestaurant(null)}
                    className="border border-white/10 hover:border-white/20 bg-gray-900/30 hover:bg-gray-900/50 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 w-fit"
                  >
                    ← Back to Restaurants
                  </button>

                  <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 mt-4 mb-6 shadow-md">
                    <img
                      src={selectedRestaurant.imageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop"}
                      alt={selectedRestaurant.name}
                      className="w-24 h-24 object-cover rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop";
                      }}
                    />
                    <div className="flex flex-col justify-center">
                      <h2 className="text-2xl font-bold text-white">{selectedRestaurant.name}</h2>
                      <p className="text-gray-400 text-sm">{selectedRestaurant.cuisine}</p>
                      <span className="bg-gray-800/60 border border-white/5 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 w-fit mt-3">
                        {getCountryFlag(selectedRestaurant.country)} {selectedRestaurant.country}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-white mb-4">Menu Selection</h3>
                  {selectedRestaurant.menuItems?.length === 0 ? (
                    <p className="text-gray-500 text-sm">No items found.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedRestaurant.menuItems?.map((item) => {
                        const cartQty = cart[item.id]?.quantity || 0;
                        return (
                          <div
                            key={item.id}
                            className="bg-gray-900/40 hover:bg-gray-900/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-44 shadow-sm transition-all"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-white text-base">{item.name}</span>
                                <span className="font-extrabold text-indigo-400">
                                  {item.price} {item.currency}
                                </span>
                              </div>
                              <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mt-1">
                                {item.description}
                              </p>
                            </div>
                            
                            <div className="flex justify-end mt-4">
                              {cartQty > 0 ? (
                                <div className="flex items-center gap-3 bg-gray-950/40 border border-white/5 px-2.5 py-1.5 rounded-xl">
                                  <button
                                    onClick={() => updateCartQuantity(item.id, -1)}
                                    className="w-6 h-6 rounded-full bg-gray-800 hover:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center transition-colors"
                                  >
                                    -
                                  </button>
                                  <span className="font-bold text-sm min-w-4 text-center">{cartQty}</span>
                                  <button
                                    onClick={() => updateCartQuantity(item.id, 1)}
                                    className="w-6 h-6 rounded-full bg-gray-800 hover:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(item)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shadow-indigo-600/10"
                                >
                                  🛒 Add to Cart
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: ORDERS LEDGER */}
          {!loadingDashboard && activeTab === "orders" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Order Ledger</h2>
                <p className="text-gray-400 text-xs mt-1">
                  {activeUserObj?.role === "ADMIN"
                    ? "Global Corporate Ledger (All Countries)"
                    : `Regional Corporate Ledger (${activeUserObj?.country})`}
                </p>
              </div>

              {(dashboardData as any)?.orders?.length === 0 ? (
                <div className="text-center py-16 bg-gray-900/30 border border-white/5 rounded-2xl text-gray-500">
                  No orders recorded in this ledger region.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {(dashboardData as any)?.orders?.map((o: Order) => {
                    const isPending = o.status === "PENDING_PAYMENT";
                    const isCancellable = o.status !== "CANCELLED";
                    const orderDate = new Date(o.createdAt).toLocaleString();
                    const isManagerOrAdmin = activeUserObj?.role === "ADMIN" || activeUserObj?.role === "MANAGER";

                    return (
                      <div
                        key={o.id}
                        className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-sm hover:border-white/10 transition-all"
                      >
                        {/* Order Header */}
                        <div className="bg-white/2 px-5 py-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-3">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="font-extrabold text-indigo-400 text-sm">
                              ORDER #{o.id}
                            </span>
                            <span className="text-[11px] text-gray-400">{orderDate}</span>
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              👤 User: <strong>{o.user.name}</strong> ({o.user.role})
                            </span>
                          </div>
                          
                          <span
                            className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide border ${
                              o.status === "PAID"
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                : o.status === "CANCELLED"
                                ? "bg-red-500/10 text-red-300 border-red-500/20"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                            }`}
                          >
                            {o.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Order Body */}
                        <div className="p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                          <div className="flex flex-col gap-1.5 max-w-xl">
                            {o.items.map((oi) => (
                              <div key={oi.id} className="text-sm text-gray-300 flex items-center">
                                <span className="text-gray-500 font-bold mr-2 text-xs">{oi.quantity}x</span>
                                <span>{oi.menuItem.name}</span>
                                <span className="text-[10px] text-gray-500 ml-2 font-medium">
                                  ({oi.price} {o.currency})
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col md:items-end gap-3 min-w-[180px]">
                            <div className="flex flex-col md:items-end">
                              <span className="text-xl font-extrabold text-white">
                                {o.totalAmount} {o.currency}
                              </span>
                              {o.status === "PAID" && o.paymentMethod && (
                                <span className="text-[10px] text-gray-500 mt-1">
                                  Paid via: {o.paymentMethod.methodType} ({o.paymentMethod.details})
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 w-full justify-end">
                              {isPending && (
                                <button
                                  onClick={() => handlePayOrder(o.id)}
                                  disabled={!isManagerOrAdmin}
                                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-[11px] font-bold px-3 py-2 rounded-lg text-white transition-all"
                                  title={!isManagerOrAdmin ? "Only Managers or Admins can checkout/pay" : ""}
                                >
                                  💳 Pay Corporate Bill
                                </button>
                              )}
                              
                              {isCancellable && (
                                <button
                                  onClick={() => handleCancelOrder(o.id)}
                                  disabled={!isManagerOrAdmin}
                                  className="border border-red-500/20 hover:bg-red-500/10 text-red-400 disabled:opacity-40 disabled:hover:bg-transparent text-[11px] font-bold px-3 py-2 rounded-lg transition-all"
                                  title={!isManagerOrAdmin ? "Only Managers or Admins can cancel orders" : ""}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                            
                            {!isManagerOrAdmin && isPending && (
                              <p className="text-[10px] text-gray-500 italic md:text-right leading-tight">
                                * Member accounts are restricted from paying or cancelling. Contact Manager/Admin.
                              </p>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BILLING ACCOUNTS */}
          {!loadingDashboard && activeTab === "payments" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Billing Controls</h2>
                <p className="text-gray-400 text-xs mt-1">Manage corporate payment methods and gateways</p>
              </div>

              {activeUserObj?.role !== "ADMIN" ? (
                /* Access Denied message illustrating RBAC */
                <div className="bg-red-500/[0.02] border border-red-500/10 rounded-2xl p-8 flex flex-col items-center text-center gap-4 shadow-sm">
                  <span className="text-4xl">🔒</span>
                  <h3 className="text-lg font-bold text-red-400">Access Denied (RBAC Rules)</h3>
                  <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
                    You are logged in as a <strong>{activeUserObj?.role}</strong> ({activeUserObj?.name}). 
                    Only the **ADMIN (Nick Fury)** role is authorized to modify payment settings and modify corporate channels.
                  </p>

                  <div className="w-full max-w-md text-left mt-6 pt-6 border-t border-white/5 flex flex-col gap-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Seeded Regional View:
                    </h4>
                    {(dashboardData as any)?.paymentMethods?.length === 0 ? (
                      <p className="text-xs text-gray-500">No regional gateways registered.</p>
                    ) : (
                      (dashboardData as any)?.paymentMethods?.map((pm: PaymentMethod) => (
                        <div key={pm.id} className="bg-gray-950/40 border border-white/5 rounded-xl p-4 text-xs">
                          <strong>{getCountryFlag(pm.country)} {pm.country} Channel:</strong> {pm.methodType} ({pm.details})
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Admin Gateway Editor */
                <div className="flex flex-col gap-6">
                  <div className="bg-indigo-950/20 border border-indigo-500/20 text-indigo-300 rounded-2xl p-4 text-xs font-semibold">
                    ℹ️ <strong>Nick Fury Admin Mode:</strong> You possess full read/write privileges to modify global corporate accounts.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(dashboardData as any)?.paymentMethods?.map((pm: PaymentMethod) => (
                      <div
                        key={pm.id}
                        className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col gap-4"
                      >
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="font-bold text-white text-base">
                            {getCountryFlag(pm.country)} {pm.country} Gateway
                          </span>
                        </div>

                        {editPmId === pm.id ? (
                          <form onSubmit={handleSavePm} className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Gateway Name</label>
                              <input
                                type="text"
                                className="bg-gray-950/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                value={editPmType}
                                onChange={(e) => setEditPmType(e.target.value)}
                                required
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Account Details</label>
                              <input
                                type="text"
                                className="bg-gray-950/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                value={editPmDetails}
                                onChange={(e) => setEditPmDetails(e.target.value)}
                                required
                              />
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button
                                type="submit"
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold py-2 rounded-lg transition-all"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="flex-1 border border-white/10 hover:bg-white/5 text-xs font-bold py-2 rounded-lg transition-all text-gray-400"
                                onClick={() => setEditPmId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-col justify-between flex-1 gap-4">
                            <div className="flex flex-col gap-3">
                              <div>
                                <span className="text-[10px] text-gray-500 font-bold block">GATEWAY</span>
                                <strong className="text-white text-base font-semibold">{pm.methodType}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 font-bold block">ACCOUNT INFO</span>
                                <code className="text-gray-300 text-xs">{pm.details}</code>
                              </div>
                            </div>
                            <button
                              onClick={() => handleStartEditPm(pm)}
                              className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold py-2.5 rounded-xl transition-all"
                            >
                              Modify Billing Account
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* FLOATING CART BUTTON */}
      {getCartTotalCount() > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:scale-105 transition-all z-40"
        >
          <span className="text-xl">🛒</span>
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white border-2 border-[#090d16] rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px]">
            {getCartTotalCount()}
          </span>
        </button>
      )}

      {/* FLOATING CART DRAWER */}
      {showCart && (
        <div className="fixed bottom-6 right-6 w-96 max-h-[500px] bg-gray-900 border border-indigo-500/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-50 animate-slide-up">
          <div className="bg-white/2 px-5 py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span>🛒</span> Shopping Cart
            </h3>
            <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-white text-lg">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {Object.values(cart).map(({ item, quantity }) => (
              <div key={item.id} className="flex justify-between items-center text-xs pb-3 border-b border-white/5">
                <div className="flex flex-col gap-0.5 max-w-[60%]">
                  <span className="font-bold text-white text-sm">{item.name}</span>
                  <span className="text-gray-400">{item.price} {item.currency} each</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-950/40 border border-white/5 p-1 rounded-lg">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="w-5 h-5 rounded-full bg-gray-800 text-white font-bold text-[10px] flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-bold text-[11px] min-w-3 text-center">{quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="w-5 h-5 rounded-full bg-gray-800 text-white font-bold text-[10px] flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <strong className="text-white min-w-[50px] text-right">
                    {item.price * quantity} {item.currency}
                  </strong>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 border-t border-white/5 bg-gray-950/40 flex flex-col gap-4">
            <div className="flex justify-between font-bold text-sm">
              <span>Total Bill:</span>
              <span className="text-emerald-400 text-base">
                {getCartTotal().amount} {getCartTotal().currency}
              </span>
            </div>
            <button
              onClick={handlePlaceOrder}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-600/10"
            >
              Place Pending Order
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
