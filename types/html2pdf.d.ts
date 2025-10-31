// Type definitions for html2pdf.js
declare function html2pdf(): html2pdf.Html2PdfInstance;

declare namespace html2pdf {
    interface Html2PdfInstance {
        set(options: any): Html2PdfInstance;
        from(element: HTMLElement): Html2PdfInstance;
        save(): Promise<void>;
        outputPdf(type: 'blob'): Promise<Blob>;
    }
}

interface Window {
    html2pdf: typeof html2pdf;
}