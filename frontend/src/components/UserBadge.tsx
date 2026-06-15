import React from "react";

interface User {
  id: string;
  name: string;
  role: string;
  country: string;
}

interface UserBadgeProps {
  user: User | null;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ user }) => {
  if (!user) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 animate-pulse text-center text-gray-400 text-sm">
        Loading user profile...
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/15 text-red-300 border border-red-500/30";
      case "MANAGER":
        return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
      default:
        return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
    }
  };

  const getCountryFlag = (country: string) => {
    switch (country.toLowerCase()) {
      case "india":
        return "🇮🇳";
      case "america":
        return "🇺🇸";
      default:
        return "🌐";
    }
  };

  return (
    <div className="bg-gray-900/70 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-lg text-white shadow-[0_4px_10px_rgba(99,102,241,0.3)]">
          {getInitials(user.name)}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white text-base">{user.name}</span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit mt-1 uppercase tracking-wider ${getRoleBadgeClass(user.role)}`}>
            {user.role}
          </span>
        </div>
      </div>
      
      <div className="flex justify-between text-xs pt-3 border-t border-white/5">
        <span className="text-gray-400 font-medium">Assigned Region</span>
        <span className="font-semibold text-white flex items-center gap-1.5">
          <span className="text-base">{getCountryFlag(user.country)}</span>
          {user.country}
        </span>
      </div>
    </div>
  );
};
