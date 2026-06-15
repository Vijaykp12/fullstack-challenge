import React from "react";

interface User {
  id: string;
  name: string;
  role: string;
  country: string;
}

interface RBACIndicatorProps {
  user: User | null;
}

export const RBACIndicator: React.FC<RBACIndicatorProps> = ({ user }) => {
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const isManager = user.role === "MANAGER";

  const renderStatus = (allowed: boolean) => {
    return allowed ? (
      <span className="text-emerald-400 font-bold text-xs">✅ Yes</span>
    ) : (
      <span className="text-red-400 font-bold text-xs">❌ No</span>
    );
  };

  return (
    <div className="bg-gray-900/70 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 pb-2">
          RBAC Policy Matrix
        </h3>
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-300">View Restaurants</span>
            {renderStatus(true)}
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-300">Create Cart / Order</span>
            {renderStatus(true)}
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-300">Checkout & Pay</span>
            {renderStatus(isAdmin || isManager)}
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-300">Cancel Order</span>
            {renderStatus(isAdmin || isManager)}
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-300">Update Payment Methods</span>
            {renderStatus(isAdmin)}
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-2">
          Re-BAC Relational Scope
        </h3>
        <div className="text-[11px] leading-relaxed mt-1">
          {isAdmin ? (
            <span className="text-indigo-300 font-medium">
              🌐 GLOBAL SECURITY: Nick Fury bypasses regional gates. Full view/operate over India & America.
            </span>
          ) : (
            <span className="text-gray-400">
              🔒 REGIONAL GATE: Logged in inside <strong>{user.country}</strong>. You are limited to resources within{" "}
              <strong>{user.country}</strong>. Cross-border resources are blocked.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
