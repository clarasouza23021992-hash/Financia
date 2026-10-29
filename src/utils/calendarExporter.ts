import { Bill } from '../types/finance';

export interface CalendarExportOptions {
  reminderOption: 'same_day_9am' | 'day_before_9am' | 'three_days_before' | 'none';
  includeOnlyPending?: boolean;
}

/**
 * Formats a date string (YYYY-MM-DD) into iCalendar DATE format (YYYYMMDD)
 */
function toICalDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
  return dateStr.replace(/-/g, '');
}

/**
 * Generates RFC 5545 compliant iCalendar (.ics) string from a list of bills
 */
export function generateICalendarString(
  bills: Bill[],
  monthLabel: string = 'Mês',
  options: CalendarExportOptions = { reminderOption: 'same_day_9am' }
): string {
  const filtered = options.includeOnlyPending
    ? bills.filter(b => b.status !== 'paid')
    : bills;

  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Financas da Minha Casa//pt-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Contas a Pagar - ${monthLabel}`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  for (const bill of filtered) {
    if (!bill.dueDate) continue;

    const startDate = toICalDate(bill.dueDate);
    // All day event end date in iCal is exclusive, so next day
    const [y, m, d] = bill.dueDate.split('-').map(Number);
    const nextDay = new Date(y, m - 1, d + 1);
    const endDate = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;

    const cleanTitle = `Conta: ${bill.name} (R$ ${Number(bill.amount || 0).toFixed(2).replace('.', ',')})`;
    
    let description = `*Vencimento de Conta da Casa*\n` +
      `📌 Conta: ${bill.name}\n` +
      `💰 Valor: R$ ${Number(bill.amount || 0).toFixed(2).replace('.', ',')}\n` +
      `🏢 Favorecido: ${bill.favored || 'Não especificado'}\n` +
      `📂 Categoria: ${bill.category}\n` +
      `📊 Status: ${bill.status === 'paid' ? 'Paga ✅' : 'Pendente ⏳'}`;

    if (bill.barcode) {
      description += `\n📄 Código de Barras: ${bill.barcode}`;
    }
    if (bill.pixKey) {
      description += `\n🔑 Chave Pix (${bill.pixType || 'Pix'}): ${bill.pixKey}`;
    }
    if (bill.notes) {
      description += `\n📝 Observações: ${bill.notes}`;
    }

    // Escape iCal text
    const escapedDesc = description.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const escapedSummary = cleanTitle.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:bill-${bill.id}-${startDate}@financasdaminhacasa.app`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
    lines.push(`SUMMARY:${escapedSummary}`);
    lines.push(`DESCRIPTION:${escapedDesc}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:TRANSPARENT');

    // Add Alarm if requested
    if (options.reminderOption !== 'none') {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Lembrete: Vence hoje ${escapedSummary}`);

      if (options.reminderOption === 'same_day_9am') {
        // Trigger at 09:00 AM on the event day
        lines.push('TRIGGER:PT9H');
      } else if (options.reminderOption === 'day_before_9am') {
        // 1 day before
        lines.push('TRIGGER:-P1D');
      } else if (options.reminderOption === 'three_days_before') {
        // 3 days before
        lines.push('TRIGGER:-P3D');
      }

      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers browser download of .ics file which Apple Calendar and Google Calendar directly import
 */
export function downloadICalendarFile(
  bills: Bill[],
  monthLabel: string = 'Mes',
  options: CalendarExportOptions = { reminderOption: 'same_day_9am' }
): boolean {
  try {
    const icsContent = generateICalendarString(bills, monthLabel, options);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const cleanName = monthLabel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `contas_${cleanName}.ics`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Error exporting iCalendar:', err);
    return false;
  }
}

/**
 * Creates direct web link to Google Calendar for a single bill
 */
export function getGoogleCalendarLink(bill: Bill): string {
  if (!bill.dueDate) return '';

  const cleanDate = toICalDate(bill.dueDate);
  // Next day for all day event
  const [y, m, d] = bill.dueDate.split('-').map(Number);
  const nextDay = new Date(y, m - 1, d + 1);
  const nextDate = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;

  const title = `Vencer Hoje: ${bill.name} (R$ ${Number(bill.amount || 0).toFixed(2).replace('.', ',')})`;
  
  let details = `Conta da Casa: ${bill.name}\nValor: R$ ${Number(bill.amount || 0).toFixed(2).replace('.', ',')}\nFavorecido: ${bill.favored || ''}`;
  if (bill.barcode) details += `\nCódigo de barras: ${bill.barcode}`;
  if (bill.pixKey) details += `\nPix: ${bill.pixKey}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${cleanDate}/${nextDate}`,
    details: details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
