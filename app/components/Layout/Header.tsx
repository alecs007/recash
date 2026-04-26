"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Map, PlusCircle, MessageSquare, User, Bell } from "lucide-react";

const navItems = [
  { href: "/", label: "Acasă", icon: Home },
  { href: "/map", label: "Hartă", icon: Map },
  { href: "/post", label: "Postează", icon: PlusCircle, primary: true },
  { href: "/mesaje", label: "Mesaje", icon: MessageSquare },
  { href: "/profil", label: "Profil", icon: User },
];

export default function Header({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = pathname?.startsWith("/auth");
  if (isAuthPage) return <>{children}</>;

  const unreadCount = 3;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/recash-header-logo.avif"
              alt="Recash Logo"
              width={643}
              height={138}
              className="h-8 w-auto object-contain"
              priority
              draggable={false}
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/notificari"
              className="relative grid place-items-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              aria-label="Notificări"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/profil"
              className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-lime-500 text-black font-bold shadow-sm hover:scale-105 transition-transform"
              aria-label="Profil"
            >
              🌱
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 lg:pb-12">{children}</main>
    </div>
  );
}
