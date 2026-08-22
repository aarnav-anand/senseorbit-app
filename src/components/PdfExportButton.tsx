import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useFarmStore } from '../store/farmStore';

export function PdfExportButton() {
  const { t, i18n } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const boundary = useFarmStore((s) => s.boundary);

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

  const handleShare = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', i18n.language.startsWith('hi') ? 'hi' : 'en');
    if (boundary?.centroid) {
      url.searchParams.set('lat', String(boundary.centroid[0]));
      url.searchParams.set('lon', String(boundary.centroid[1]));
    }

    try {
      await navigator.clipboard.writeText(url.toString());
      setShareMessage(t('report.shareCopied'));
    } catch {
      setShareMessage(t('report.shareFailed'));
    }
    setTimeout(() => setShareMessage(null), 3000);
  }, [boundary, i18n.language, t]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isExporting}
        className="rounded-lg bg-earth-800 px-4 py-2 text-sm font-medium text-white hover:bg-earth-900 disabled:opacity-60"
      >
        {t('report.downloadPdf')}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="rounded-lg border border-earth-200 px-4 py-2 text-sm font-medium text-earth-800 hover:bg-earth-50"
      >
        {t('report.share')}
      </button>
      {shareMessage && <span className="text-sm text-field-700">{shareMessage}</span>}
    </div>
  );
}
