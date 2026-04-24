import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // We create the scanner instance on mount
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
      /* verbose= */ false
    );

    const onScanSuccess = (decodedText: string) => {
      // Provide audio feedback if possible
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {}); // catch and ignore if autoplay is blocked
      } catch {
        // ignore audio errors
      }

      onScan(decodedText);
      // Automatically stop scanning and close after success
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };

    const onScanFailure = () => {
      // Usually fails multiple times a second when no code is found, so we just ignore
    };

    try {
      scannerRef.current.render(onScanSuccess, onScanFailure);
    } catch {
      // eslint-disable-next-line
      setError("Impossibile avviare la fotocamera. Verifica i permessi del browser.");
    }

    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="font-bold flex items-center gap-2 text-slate-800">
             <Camera size={20} className="text-indigo-600" />
             Scansiona Codice
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 transition-colors rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 flex flex-col items-center">
           {error ? (
             <div className="text-red-600 text-sm text-center font-medium bg-red-50 p-3 rounded-lg border border-red-100">
               {error}
             </div>
           ) : (
             <p className="text-sm text-slate-500 mb-4 text-center">
               Inquadra il codice a barre del prodotto all'interno del riquadro.
             </p>
           )}
           <div id="qr-reader" className="w-full rounded-lg overflow-hidden border-2 border-indigo-100"></div>
        </div>
      </div>
    </div>
  );
}
