import { useCallback, useEffect, useRef, useState } from "react";
import * as Quagga from "quagga";
import { motion } from "framer-motion";
import { Scan, X, Flashlight, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

interface TorchCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  console.log("BarcodeScanner initialized, Quagga:", Quagga);
  const scannerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const torchEnabledRef = useRef(false);
  const isProcessingRef = useRef(false);
  const lastDetectedRef = useRef<string>("");

  useEffect(() => {
    torchEnabledRef.current = torchEnabled;
  }, [torchEnabled]);

  const toggleTorch = useCallback(async (enable: boolean, silent = false) => {
    if (!videoTrackRef.current) return;

    try {
      const capabilities = videoTrackRef.current.getCapabilities?.() as
        | TorchCapabilities
        | undefined;

      if (!capabilities?.torch) {
        if (!silent) {
          toast.error("Torch is not supported on this device.");
        }
        return;
      }

      await videoTrackRef.current.applyConstraints({
        advanced: [{ torch: enable } as TorchConstraintSet],
      });
      setTorchEnabled(enable);
    } catch (error) {
      console.error("Torch not supported:", error);
      if (!silent) {
        toast.error("Unable to toggle torch on this camera.");
      }
    }
  }, []);

  const stopScanner = useCallback(() => {
    try {
      Quagga.stop();
    } catch (error) {
      console.error("Failed to stop scanner:", error);
    }
  }, []);

  useEffect(() => {
    if (!scannerRef.current || showManualInput) return;

    let mounted = true;

    videoTrackRef.current = null;

    // Clear any existing elements to prevent duplicates
    if (scannerRef.current) {
      scannerRef.current.innerHTML = "";
    }

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment",
          },
        },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "code_128_reader",
            "code_39_reader",
            "upc_reader",
            "upc_e_reader",
          ],
        },
        locate: true,
      },
      (err) => {
        if (!mounted) return;
        if (err) {
          console.error("Error initializing Quagga:", err);
          toast.error("Camera access failed. Please use manual entry.");
          return;
        }
        Quagga.start();
        setIsInitialized(true);

        // Get video track for torch control
        setTimeout(() => {
          if (!mounted) return;
          const videoElement = scannerRef.current?.querySelector('video');
          if (videoElement && videoElement.srcObject) {
            const mediaStream = videoElement.srcObject as MediaStream;
            const videoTrack = mediaStream.getVideoTracks()[0];
            if (videoTrack) {
              videoTrackRef.current = videoTrack;
              setIsTorchAvailable(true);
            }
          }
        }, 500);
      }
    );

    const detectedHandler = (result: Quagga.QuaggaJSResultObject) => {
      if (!mounted || isProcessingRef.current) return;
      
      const barcode = result.codeResult.code?.replace(/[^\d]/g, "");
      if (!barcode) return;

      // Validate barcode format (basic check for common formats)
      const isValidBarcode = /^[0-9]{8,14}$/.test(barcode);
      if (!isValidBarcode) {
        console.log("Invalid barcode format detected:", barcode);
        return;
      }

      // Prevent duplicate detections
      if (barcode === lastDetectedRef.current) {
        return;
      }

      // Mark as processing to prevent multiple detections
      isProcessingRef.current = true;
      lastDetectedRef.current = barcode;
      
      // Stop scanner immediately
      stopScanner();
      setIsInitialized(false);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Call the callback with the detected barcode
      onDetected(barcode);
    };

    Quagga.onDetected(detectedHandler);

    return () => {
      mounted = false;
      isProcessingRef.current = false;
      setIsTorchAvailable(false);
      Quagga.offDetected(detectedHandler);
      stopScanner();
      if (videoTrackRef.current && torchEnabledRef.current) {
        void toggleTorch(false, true);
      }
      videoTrackRef.current = null;
    };
  }, [onDetected, showManualInput, stopScanner, toggleTorch]);

  const handleManualSubmit = () => {
    const sanitizedBarcode = manualBarcode.replace(/[^\d]/g, "");

    if (!sanitizedBarcode) {
      toast.error("Please enter a barcode.");
      return;
    }

    if (!/^\d{8,14}$/.test(sanitizedBarcode)) {
      toast.error("Please enter a valid barcode (8-14 digits).");
      return;
    }

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    onDetected(sanitizedBarcode);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {!showManualInput && isInitialized && isTorchAvailable && (
            <Button
              onClick={() => toggleTorch(!torchEnabled)}
              variant="ghost"
              size="icon"
              aria-label="Toggle flashlight"
              className={`bg-white/10 backdrop-blur-md hover:bg-white/20 ${torchEnabled ? 'text-yellow-400' : ''}`}
            >
              <Flashlight className="h-6 w-6" />
            </Button>
          )}
          <Button
            onClick={() => setShowManualInput(!showManualInput)}
            variant="ghost"
            size="icon"
              aria-label="Toggle manual barcode entry"
            className="bg-white/10 backdrop-blur-md hover:bg-white/20"
          >
            <Keyboard className="h-6 w-6" />
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
              aria-label="Close barcode scanner"
            className="bg-white/10 backdrop-blur-md hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {showManualInput ? (
          <Card className="w-full max-w-md p-6 bg-white/90 dark:bg-white/10 backdrop-blur-md border-gray-300 dark:border-white/20">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Enter Barcode Manually</h3>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter barcode number"
                value={manualBarcode}
                onChange={(e) =>
                  setManualBarcode(e.target.value.replace(/[^\d]/g, "").slice(0, 14))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                className="bg-white dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/50"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleManualSubmit}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-500"
                  disabled={!manualBarcode.trim()}
                >
                  Submit
                </Button>
                <Button
                  onClick={() => setShowManualInput(false)}
                  variant="outline"
                  className="bg-white/10 dark:bg-white/10 border-gray-300 dark:border-white/20 hover:bg-white/20 text-gray-900 dark:text-white"
                >
                  Scan Instead
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden">
              <div
                ref={scannerRef}
                className="relative w-full h-full"
              />
              
              {/* Scanning frame overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-4 border-primary/50 rounded-2xl">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                </div>
                
                {/* Scanning line animation */}
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-primary shadow-lg shadow-primary/50"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>

            <div className="mt-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-white mb-2">
                <Scan className="h-5 w-5 animate-pulse" />
                <p className="text-lg font-medium">
                  {isInitialized ? "Scanning for barcode..." : "Initializing camera..."}
                </p>
              </div>
              <p className="text-white/70 text-sm">
                Position the barcode within the frame
              </p>
              <Button
                onClick={() => setShowManualInput(true)}
                variant="outline"
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Enter Code Manually
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}