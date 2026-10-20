/** Serviços prontos por segmento: a dona marca o que faz e já começa com preços editáveis. */
export interface ServicePreset { name: string; category: string; durationMin: number; price: number; returnIntervalDays?: number }

export const SEGMENTS: Record<string, { label: string; services: ServicePreset[] }> = {
  SALAO: {
    label: "Salão de beleza",
    services: [
      { name: "Corte feminino", category: "Cabelo", durationMin: 60, price: 90, returnIntervalDays: 60 },
      { name: "Corte masculino", category: "Cabelo", durationMin: 40, price: 55, returnIntervalDays: 30 },
      { name: "Escova", category: "Cabelo", durationMin: 50, price: 70, returnIntervalDays: 14 },
      { name: "Coloração", category: "Química", durationMin: 120, price: 220, returnIntervalDays: 35 },
      { name: "Retoque de raiz", category: "Química", durationMin: 90, price: 160, returnIntervalDays: 30 },
      { name: "Mechas / luzes", category: "Química", durationMin: 180, price: 380, returnIntervalDays: 90 },
      { name: "Progressiva", category: "Química", durationMin: 180, price: 300, returnIntervalDays: 90 },
      { name: "Hidratação", category: "Tratamento", durationMin: 45, price: 80, returnIntervalDays: 21 },
      { name: "Botox capilar", category: "Tratamento", durationMin: 90, price: 180, returnIntervalDays: 45 },
      { name: "Manicure", category: "Unhas", durationMin: 45, price: 40, returnIntervalDays: 15 },
      { name: "Pedicure", category: "Unhas", durationMin: 50, price: 45, returnIntervalDays: 21 },
      { name: "Design de sobrancelha", category: "Sobrancelha", durationMin: 30, price: 45, returnIntervalDays: 21 },
      { name: "Maquiagem", category: "Make", durationMin: 60, price: 150 },
      { name: "Penteado", category: "Cabelo", durationMin: 60, price: 150 },
    ],
  },
  BARBEARIA: {
    label: "Barbearia",
    services: [
      { name: "Corte", category: "Cabelo", durationMin: 40, price: 50, returnIntervalDays: 25 },
      { name: "Barba", category: "Barba", durationMin: 30, price: 40, returnIntervalDays: 20 },
      { name: "Corte + barba", category: "Combo", durationMin: 60, price: 80, returnIntervalDays: 25 },
      { name: "Pezinho / acabamento", category: "Cabelo", durationMin: 15, price: 20, returnIntervalDays: 14 },
      { name: "Sobrancelha", category: "Rosto", durationMin: 15, price: 20, returnIntervalDays: 25 },
      { name: "Pigmentação de barba", category: "Barba", durationMin: 40, price: 60 },
      { name: "Hidratação / relaxamento", category: "Tratamento", durationMin: 40, price: 60, returnIntervalDays: 30 },
      { name: "Luzes / platinado", category: "Química", durationMin: 120, price: 180, returnIntervalDays: 60 },
    ],
  },
  ESTETICA: {
    label: "Clínica de estética",
    services: [
      { name: "Limpeza de pele", category: "Facial", durationMin: 60, price: 150, returnIntervalDays: 30 },
      { name: "Peeling", category: "Facial", durationMin: 45, price: 180, returnIntervalDays: 21 },
      { name: "Drenagem linfática", category: "Corporal", durationMin: 60, price: 120, returnIntervalDays: 7 },
      { name: "Massagem modeladora", category: "Corporal", durationMin: 60, price: 130, returnIntervalDays: 7 },
      { name: "Depilação a laser (sessão)", category: "Depilação", durationMin: 30, price: 150, returnIntervalDays: 30 },
      { name: "Depilação com cera", category: "Depilação", durationMin: 40, price: 70, returnIntervalDays: 30 },
      { name: "Microagulhamento", category: "Facial", durationMin: 60, price: 250, returnIntervalDays: 30 },
      { name: "Avaliação", category: "Consulta", durationMin: 30, price: 0 },
    ],
  },
  UNHAS: {
    label: "Nail designer / esmalteria",
    services: [
      { name: "Manicure", category: "Unhas", durationMin: 45, price: 40, returnIntervalDays: 15 },
      { name: "Pedicure", category: "Unhas", durationMin: 50, price: 45, returnIntervalDays: 21 },
      { name: "Pé e mão", category: "Unhas", durationMin: 90, price: 80, returnIntervalDays: 15 },
      { name: "Esmaltação em gel", category: "Gel", durationMin: 60, price: 80, returnIntervalDays: 21 },
      { name: "Alongamento em gel", category: "Gel", durationMin: 120, price: 180, returnIntervalDays: 21 },
      { name: "Manutenção de alongamento", category: "Gel", durationMin: 90, price: 120, returnIntervalDays: 21 },
      { name: "Spa dos pés", category: "Tratamento", durationMin: 60, price: 90, returnIntervalDays: 30 },
      { name: "Nail art (por unha)", category: "Decoração", durationMin: 10, price: 8 },
    ],
  },
  SOBRANCELHA: {
    label: "Sobrancelha e cílios",
    services: [
      { name: "Design de sobrancelha", category: "Sobrancelha", durationMin: 30, price: 50, returnIntervalDays: 21 },
      { name: "Design com henna", category: "Sobrancelha", durationMin: 45, price: 70, returnIntervalDays: 21 },
      { name: "Brow lamination", category: "Sobrancelha", durationMin: 60, price: 150, returnIntervalDays: 45 },
      { name: "Micropigmentação", category: "Sobrancelha", durationMin: 120, price: 600, returnIntervalDays: 365 },
      { name: "Extensão de cílios (aplicação)", category: "Cílios", durationMin: 120, price: 180, returnIntervalDays: 21 },
      { name: "Manutenção de cílios", category: "Cílios", durationMin: 75, price: 110, returnIntervalDays: 21 },
      { name: "Lash lifting", category: "Cílios", durationMin: 60, price: 130, returnIntervalDays: 45 },
      { name: "Depilação buço", category: "Depilação", durationMin: 15, price: 20, returnIntervalDays: 21 },
    ],
  },
  SPA: {
    label: "Spa / massoterapia",
    services: [
      { name: "Massagem relaxante", category: "Massagem", durationMin: 60, price: 140, returnIntervalDays: 14 },
      { name: "Massagem terapêutica", category: "Massagem", durationMin: 60, price: 160, returnIntervalDays: 14 },
      { name: "Pedras quentes", category: "Massagem", durationMin: 75, price: 190, returnIntervalDays: 30 },
      { name: "Drenagem linfática", category: "Corporal", durationMin: 60, price: 130, returnIntervalDays: 7 },
      { name: "Day spa", category: "Pacote", durationMin: 180, price: 390 },
      { name: "Reflexologia", category: "Massagem", durationMin: 45, price: 100, returnIntervalDays: 14 },
    ],
  },
};

export const SEGMENT_KEYS = Object.keys(SEGMENTS);

export const DEFAULT_HOURS = {
  "0": null,
  "1": { open: "09:00", close: "19:00" },
  "2": { open: "09:00", close: "19:00" },
  "3": { open: "09:00", close: "19:00" },
  "4": { open: "09:00", close: "19:00" },
  "5": { open: "09:00", close: "19:00" },
  "6": { open: "08:00", close: "17:00" },
};

export const DEFAULT_AUTOMATIONS: { kind: string; label: string; template: string; settings: Record<string, unknown>; enabled: boolean }[] = [
  { kind: "REMINDER_24H", label: "Lembrete do horário (com link de confirmação)", enabled: true, template: "Oi {nome}! Passando para lembrar do seu horário {data} às {hora} ({servico}) com {profissional}, no {salao}. Confirme por aqui: {confirmar} 💕", settings: { hoursBefore: 24 } },
  { kind: "THANKS", label: "Agradecimento + avaliação (2h depois)", enabled: true, template: "{nome}, obrigada pela visita hoje! Ficou como você queria? Se puder, deixa uma avaliação pra gente: {link} ✨", settings: { hoursAfter: 2 } },
  { kind: "RETURN_INVITE", label: "Convite de retorno (no ciclo do serviço)", enabled: true, template: "Oi {nome}! Já está na época de renovar o seu {servico} 😉 Quer que eu reserve um horário essa semana no {salao}?", settings: { daysAfterCycle: 0 } },
  { kind: "BIRTHDAY", label: "Aniversário", enabled: true, template: "Parabéns, {nome}! 🎉 O {salao} preparou um presente: {voucher} válido até {validade}. Vem comemorar com a gente!", settings: { voucherKind: "PERCENT", voucherValue: 15, voucherDays: 30 } },
  { kind: "WIN_BACK", label: "Resgate de sumidas (60 dias sem vir)", enabled: false, template: "Oi {nome}, sentimos sua falta no {salao}! Volta pra gente com {voucher} até {validade}? É só responder aqui que eu reservo 💕", settings: { inactiveDays: 60, voucherKind: "PERCENT", voucherValue: 15, voucherDays: 15 } },
];
