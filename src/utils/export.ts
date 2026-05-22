import { save } from '@tauri-apps/plugin-dialog';

import DOMPurify from 'dompurify';
import { Marked } from 'marked';

export const printToPdf = (markdown: string) => {
    // 1. Prepare Content
    const rawHtml = new Marked().parse(markdown || "") as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);

    // 2. Create a Print Container
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

    // 3. Trigger Print
    // We use a small delay to ensure the DOM has painted the style tag
    setTimeout(() => {
        window.print();
        // 4. Cleanup
        document.body.removeChild(printContainer);
    }, 50);
};