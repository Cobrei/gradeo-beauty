/** Endereço público do sistema (links nas mensagens de WhatsApp). */
export function appUrl(path: string): string {
  const host = process.env.NEXT_PUBLIC_APP_HOST || "gradeo-beauty.vercel.app";
  return `https://${host}${path.startsWith("/") ? path : `/${path}`}`;
}
