import { Providers } from "@/components/providers";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { CartProvider } from "@/lib/hooks/useCart";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Toaster } from "sonner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthProvider>
        <CartProvider>
          <Providers>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster position="top-right" richColors />
          </Providers>
        </CartProvider>
      </AuthProvider>
    </div>
  );
}
