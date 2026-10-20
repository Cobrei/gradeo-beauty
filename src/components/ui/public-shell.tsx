import type { ReactNode } from "react";
import { formatPhone } from "@/lib/phone";
import { PoweredBy, SalonMark } from "./salon-brand";

type Salon = { salonName: string; logoData: string | null; brandColor: string | null; whatsapp: string | null; instagram: string | null; addressJson: unknown; slug: string };

/** Moldura das páginas que a CLIENTE vê: a marca do salão em destaque, a gradeo só assina. */
export function PublicShell({ salon, children }: { salon: Salon; children: ReactNode }) {
  const address = (salon.addressJson as { text?: string } | null)?.text;
  return (
    <main className="min-h-dvh bg-mist" style={salon.brandColor ? ({ "--color-brand": salon.brandColor } as React.CSSProperties) : undefined}>
      <div className="mx-auto max-w-lg px-4 py-6">
        <header className="mb-5 flex flex-col items-center text-center">
          <SalonMark name={salon.salonName} logo={salon.logoData} color={salon.brandColor} size={salon.logoData ? 72 : 56} showName={false} />
          <h1 className="mt-2 text-xl font-bold tracking-tight">{salon.salonName}</h1>
          <p className="text-sm text-muted">{[address, salon.instagram ? `@${salon.instagram}` : null, salon.whatsapp ? formatPhone(salon.whatsapp) : null].filter(Boolean).join(" · ")}</p>
        </header>
        {children}
        <footer className="mt-8 text-center">
          <PoweredBy />
        </footer>
      </div>
    </main>
  );
}
