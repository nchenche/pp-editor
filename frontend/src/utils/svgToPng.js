import { API_URL } from '../config';

/**
 * Convert an SVG string to a PNG blob via the backend endpoint.
 *
 * @param {string} svgString  – The raw SVG markup.
 * @param {{ width?: number, height?: number }} [opts]
 * @returns {Promise<Blob>} PNG image blob.
 */
export async function svgToPngBlob(svgString, { width = 1600, height = 1600 } = {}) {
    if (!svgString) throw new Error('No SVG content provided');

    const url = `${API_URL}/molecules/svg-to-png?width=${width}&height=${height}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'image/svg+xml' },
        body: svgString,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`SVG→PNG conversion failed (${res.status}): ${text}`);
    }

    return res.blob();
}

/**
 * Convert a data-URI (e.g. from Mol* screenshot) to a Blob.
 */
export function dataUriToBlob(dataUri) {
    const [meta, b64] = dataUri.split(',');
    const mime = meta.match(/:(.*?);/)?.[1] || 'image/png';
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}
