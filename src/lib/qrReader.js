// Prefer the browser's own reader when it can handle QR codes. Otherwise
// use the ZXing-based reader so a scan still returns the code text.
export async function createQrDetector() {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const formats = window.BarcodeDetector.getSupportedFormats
        ? await window.BarcodeDetector.getSupportedFormats()
        : ['qr_code'];
      if (formats.includes('qr_code')) {
        return new window.BarcodeDetector({ formats: ['qr_code'] });
      }
    } catch {
      // The built-in reader refused the format. Fall through to the library.
    }
  }

  const { BarcodeDetector } = await import('barcode-detector/ponyfill');
  return new BarcodeDetector({ formats: ['qr_code'] });
}
