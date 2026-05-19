import DOMPurify from 'dompurify';
import { Marked } from 'marked';

export const printToPdf = (markdown: string) => {
    const rawHtml = new Marked().parse(markdown || "") as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);

    const printContainer = document.createElement('div');
    printContainer.id = 'aqua-print-mount';
    printContainer.innerHTML = `
        <style>
            @media screen { 
                #aqua-print-mount { display: none; } 
            }
            @media print {
                body > *:not(#aqua-print-mount) { display: none !important; }
                #aqua-print-mount { 
                    display: block !important; 
                    width: 100% !important;
                    color: black !important;
                    background: white !important;
                }
                .print-content { padding: 2cm; line-height: 1.6; font-family: sans-serif; }
                h1 { color: #0ea5e9; }
                pre { background: #f4f4f4; padding: 1em; border-radius: 5px; }
            }
        </style>
        <div class="print-content">${cleanHtml}</div>
    `;

    document.body.appendChild(printContainer);

    setTimeout(() => {
        window.print();
        document.body.removeChild(printContainer);
    }, 50);
};
