import Link from "next/link";

import { CartBadge } from "@/components/layout/cart-badge";

export function SiteHeader() {
  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-40">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="font-heading text-lg font-bold tracking-tight">
          eDoctor Place
        </Link>

        <nav aria-label="Navigation principale" className="ml-6 hidden sm:block">
          <Link
            href="/produits"
            className="hover:bg-primary-foreground/10 inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors"
          >
            Nos produits
          </Link>
        </nav>

        <div className="ml-auto">
          <CartBadge />
        </div>
      </div>
    </header>
  );
}
