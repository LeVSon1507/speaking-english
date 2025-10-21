"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname.startsWith("/speaking");
  const isBookmarks = pathname.startsWith("/bookmarks");
  const isSaved = pathname.startsWith("/saved");
  const isAccount = pathname.startsWith("/account");

  const activeItem = "font-semibold px-2 py-1 rounded-full bg-neutral-100 border border-black/10";
  const inactiveItem = "text-neutral-500 hover:text-black transition-colors";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10">
      <div className="max-w-[960px] mx-auto px-6 py-2 grid grid-cols-4 text-center text-xs">
        <Link href="/" prefetch={false} className={isHome ? activeItem : inactiveItem}>Home</Link>
        <Link href="/bookmarks" prefetch={false} className={isBookmarks ? activeItem : inactiveItem}>Bookmarks</Link>
        <Link href="/saved" prefetch={false} className={isSaved ? activeItem : inactiveItem}>Saved</Link>
        <Link href="/account" prefetch={false} className={isAccount ? activeItem : inactiveItem}>Account</Link>
      </div>
    </nav>
  );
}
