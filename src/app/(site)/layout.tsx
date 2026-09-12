import { Splash } from "@/components/brand/splash";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { QuoteProvider } from "@/components/quote/quote-context";
import { ToastProvider } from "@/components/ui/toast";
import { getSiteContent, getStorefrontCategories } from "@/lib/queries";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, categories] = await Promise.all([
    getSiteContent(),
    getStorefrontCategories(),
  ]);

  return (
    <ToastProvider>
      <QuoteProvider>
        <Splash />
        <div className="flex min-h-screen flex-col">
          <Header phone={content.contact.phones[0]} />
          <main className="flex-1">{children}</main>
          <Footer
            contact={content.contact}
            footer={content.footer}
            categories={categories}
          />
        </div>
      </QuoteProvider>
    </ToastProvider>
  );
}
