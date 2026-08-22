import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function PdfExportButton() {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    const el = document.getElementById('farm-report-content');
    if (!el) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      pdf.save(`senseorbit-report-${Date.now()}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isExporting}
        className="rounded-lg bg-earth-800 px-4 py-2 text-sm font-medium text-white hover:bg-earth-900 disabled:opacity-60 shadow-xs"
      >
        {isExporting ? t('report.exportingPdf', 'Exporting PDF…') : t('report.downloadPdf')}
      </button>
    </div>
  );
}
