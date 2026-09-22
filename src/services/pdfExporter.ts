import { jsPDF } from 'jspdf';
import { Bill, Revenue } from '../types/finance';

export function exportFinancialPDF(
  bills: Bill[],
  revenues: Revenue[],
  monthTitle: string = 'Setembro de 2026'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [11, 19, 43]; // #0B132B
  const accentTeal = [0, 196, 159];  // #00C49F
  const dangerRed = [220, 38, 38];
  const warningOrange = [217, 119, 6];

  let y = 18;

  // Header Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(14, y, 182, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Finanças da Minha Casa', 20, y + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório Consolidado de Fluxo de Caixa • ${monthTitle}`, 20, y + 16);

  doc.setFontSize(8);
  doc.text('iCloud CloudKit • 2 iPhones Sincronizados', 120, y + 16);

  y += 30;

  // Financial Metrics Calculation
  const totalRevenues = revenues.reduce((acc, r) => acc + r.amount, 0);
  const totalBills = bills.reduce((acc, b) => acc + b.amount, 0);
  const totalPaid = bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + b.amount, 0);
  const totalPending = bills.filter(b => b.status === 'pending').reduce((acc, b) => acc + b.amount, 0);
  const totalOverdue = bills.filter(b => b.status === 'overdue').reduce((acc, b) => acc + b.amount, 0);
  const netBalance = totalRevenues - totalBills;

  // KPI Summary Boxes
  const boxWidth = 43;
  const boxHeight = 18;

  // Box 1: Receitas
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.rect(14, y, boxWidth, boxHeight, 'FD');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEITAS TOTAIS', 17, y + 6);
  doc.setFontSize(10);
  doc.text(`R$ ${totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 17, y + 13);

  // Box 2: Total Contas
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(60, y, boxWidth, boxHeight, 'FD');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7);
  doc.text('TOTAL DE CONTAS', 63, y + 6);
  doc.setFontSize(10);
  doc.text(`R$ ${totalBills.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 63, y + 13);

  // Box 3: Já Pago
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.rect(106, y, boxWidth, boxHeight, 'FD');
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(7);
  doc.text('JÁ PAGO (LIQUIDADO)', 109, y + 6);
  doc.setFontSize(10);
  doc.text(`R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 109, y + 13);

  // Box 4: Saldo Previsto
  doc.setFillColor(netBalance >= 0 ? 240 : 254, netBalance >= 0 ? 253 : 242, netBalance >= 0 ? 250 : 242);
  doc.setDrawColor(203, 213, 225);
  doc.rect(152, y, boxWidth, boxHeight, 'FD');
  doc.setTextColor(netBalance >= 0 ? 15 : 185, netBalance >= 0 ? 118 : 28, netBalance >= 0 ? 110 : 28);
  doc.setFontSize(7);
  doc.text('SALDO PREVISTO', 155, y + 6);
  doc.setFontSize(10);
  doc.text(`R$ ${netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 155, y + 13);

  y += 26;

  // Section Header: Contas & Dívidas
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento das Contas da Casa e Dívidas', 14, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`(${bills.length} contas cadastradas • Pendente: R$ ${totalPending.toFixed(2)} • Atrasado: R$ ${totalOverdue.toFixed(2)})`, 95, y);

  y += 5;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('VENCIMENTO', 16, y + 5);
  doc.text('CONTA / DESPESA', 42, y + 5);
  doc.text('CATEGORIA', 95, y + 5);
  doc.text('FAVORECIDO', 130, y + 5);
  doc.text('VALOR', 165, y + 5);
  doc.text('STATUS', 183, y + 5);

  y += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  bills.forEach((bill, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    // Row alternating background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 7, 'F');
    }

    doc.setTextColor(30, 41, 59);
    // Format date DD/MM
    const dateFormatted = bill.dueDate ? bill.dueDate.split('-').reverse().slice(0, 2).join('/') : '-';
    doc.text(dateFormatted, 16, y);

    const nameTruncated = bill.name.length > 28 ? bill.name.substring(0, 26) + '...' : bill.name;
    doc.text(nameTruncated, 42, y);

    const catTruncated = bill.category.length > 18 ? bill.category.substring(0, 16) + '...' : bill.category;
    doc.text(catTruncated, 95, y);

    const favTruncated = bill.favored.length > 18 ? bill.favored.substring(0, 16) + '...' : bill.favored;
    doc.text(favTruncated, 130, y);

    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 165, y);
    doc.setFont('helvetica', 'normal');

    // Status Pill / Tag
    if (bill.status === 'paid') {
      doc.setTextColor(22, 101, 52);
      doc.text('Pago', 183, y);
    } else if (bill.status === 'overdue') {
      doc.setTextColor(220, 38, 38);
      doc.text('Atrasado', 183, y);
    } else {
      doc.setTextColor(217, 119, 6);
      doc.text('Pendente', 183, y);
    }

    y += 6.5;
  });

  y += 8;

  // Revenues section
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Receitas e Entradas do Mês', 14, y);
  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DATA', 16, y + 5);
  doc.text('FONTE / DESCRIÇÃO', 42, y + 5);
  doc.text('CATEGORIA', 100, y + 5);
  doc.text('TITULAR', 145, y + 5);
  doc.text('VALOR', 175, y + 5);

  y += 8;
  doc.setFont('helvetica', 'normal');

  revenues.forEach((rev, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 7, 'F');
    }
    doc.setTextColor(30, 41, 59);
    const dateFormatted = rev.date ? rev.date.split('-').reverse().slice(0, 2).join('/') : '-';
    doc.text(dateFormatted, 16, y);
    doc.text(rev.name, 42, y);
    doc.text(rev.category, 100, y);
    doc.text(rev.profileName, 145, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`R$ ${rev.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 175, y);
    doc.setFont('helvetica', 'normal');
    y += 6.5;
  });

  // Footer note
  y += 12;
  if (y > 275) {
    doc.addPage();
    y = 25;
  }
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const nowStr = new Date().toLocaleString('pt-BR');
  doc.text(`Documento gerado automaticamente em ${nowStr} • Criptografia ponta a ponta Apple CloudKit • Finanças da Minha Casa`, 14, y);

  // Save
  doc.save(`Relatorio_Financeiro_${monthTitle.replace(/\s+/g, '_')}.pdf`);
}

export function exportFinancialCSV(bills: Bill[], revenues: Revenue[]) {
  const rows: string[] = [];

  // UTF-8 BOM for Brazilian Excel compatibility
  const BOM = '\uFEFF';

  // Section 1: Contas & Dívidas
  rows.push('--- CONTAS DA CASA E DÍVIDAS ---');
  rows.push('ID;Nome da Conta;Favorecido;Categoria;Valor (R$);Vencimento;Status;Recorrência;Divisão Carlos;Divisão Paula;Chave Pix;Código de Barras;Possui Comprovante;Anotações');

  bills.forEach(b => {
    const carlosShare = b.splitDetails.find(s => s.name === 'Carlos')?.amount || 0;
    const paulaShare = b.splitDetails.find(s => s.name === 'Paula' || s.name === 'Camila')?.amount || 0;
    const hasReceipt = b.receiptName ? 'Sim' : 'Não';
    const statusPt = b.status === 'paid' ? 'Pago' : b.status === 'overdue' ? 'Atrasado' : 'Pendente';

    rows.push(
      [
        `"${b.id}"`,
        `"${b.name}"`,
        `"${b.favored}"`,
        `"${b.category}"`,
        b.amount.toFixed(2).replace('.', ','),
        `"${b.dueDate}"`,
        `"${statusPt}"`,
        `"${b.recurrence}"`,
        carlosShare.toFixed(2).replace('.', ','),
        paulaShare.toFixed(2).replace('.', ','),
        `"${b.pixKey || ''}"`,
        `"${b.barcode || ''}"`,
        `"${hasReceipt}"`,
        `"${(b.notes || '').replace(/"/g, '""')}"`,
      ].join(';')
    );
  });

  rows.push('');
  rows.push('--- RECEITAS E ENTRADAS ---');
  rows.push('ID;Nome da Receita;Categoria;Valor (R$);Data;Titular;Recorrência;Anotações');

  revenues.forEach(r => {
    rows.push(
      [
        `"${r.id}"`,
        `"${r.name}"`,
        `"${r.category}"`,
        r.amount.toFixed(2).replace('.', ','),
        `"${r.date}"`,
        `"${r.profileName}"`,
        `"${r.recurrence}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(';')
    );
  });

  const csvContent = BOM + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Financas_Minha_Casa_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
