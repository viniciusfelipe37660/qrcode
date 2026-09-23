"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type ScanResult =
  | { status: "idle" }
  | { status: "success"; name: string; eventName: string }
  | { status: "duplicate"; name: string; checkedAt: string }
  | { status: "error"; message: string };

export default function CheckinScannerPage() {
  const params = useParams<{ eventId: string }>();
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const [result, setResult] = useState<ScanResult>({ status: "idle" });
  const isProcessingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // Import dinâmico: essa lib só funciona no navegador (usa a câmera),
    // então não pode ser carregada durante a renderização no servidor.
    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (!isMounted) return;

      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText: string) => handleScan(decodedText),
        () => {
          // Erro de leitura de um frame individual (acontece o tempo todo
          // enquanto não há QR na mira da câmera) — ignorado de propósito.
        }
      );

      scannerRef.current = scanner;
    });

    return () => {
      isMounted = false;
      scannerRef.current?.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScan(token: string) {
    // Evita processar o mesmo QR várias vezes seguidas enquanto ele
    // continua na mira da câmera (a lib escaneia ~10x por segundo).
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (response.ok) {
        setResult({
          status: "success",
          name: data.name,
          eventName: data.eventName,
        });
      } else if (response.status === 409) {
        setResult({
          status: "duplicate",
          name: data.name,
          checkedAt: data.alreadyCheckedInAt,
        });
      } else {
        setResult({
          status: "error",
          message: data.error ?? "Erro ao validar QR code",
        });
      }
    } catch {
      setResult({ status: "error", message: "Falha de conexão com o servidor" });
    }

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 2000);
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Check-in — Evento {params.eventId}
      </h1>

      <div id="qr-reader" style={{ width: "100%" }} />

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 8,
          textAlign: "center",
          fontWeight: 600,
          backgroundColor:
            result.status === "success"
              ? "#dcfce7"
              : result.status === "duplicate"
              ? "#fef9c3"
              : result.status === "error"
              ? "#fee2e2"
              : "#f3f4f6",
        }}
      >
        {result.status === "idle" && "Aponte a câmera para o QR code"}
        {result.status === "success" &&
          `✅ ${result.name} — check-in confirmado em ${result.eventName}`}
        {result.status === "duplicate" &&
          `⚠️ ${result.name} já fez check-in às ${new Date(
            result.checkedAt
          ).toLocaleTimeString("pt-BR")}`}
        {result.status === "error" && `❌ ${result.message}`}
      </div>
    </main>
  );
}