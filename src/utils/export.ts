import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export const exportToHtml = async (content: string, title: string = 'export') => {

    try {
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => el.outerHTML)
            .join('\n');

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                ${styles}
            </head>
            <body>
                <div class="preview">${content}</div>
            </body>
            </html>
        `;

        const path = await save({
            filters: [{ name: 'HTML', extensions: ['html']}],
            defaultPath: `${title}.html`
        });

        if (path) {
            await writeTextFile(path, fullHtml);
        }
    }
    catch (error) {
        console.error("Error exporting to HTML:", error);
    }

};

export const printToPdf = () => {
    window.print();
}