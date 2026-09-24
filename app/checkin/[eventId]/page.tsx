"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type ScanResult =
  | { status: "idle" }
  | { status: "success"; name: string; eventName: string }
  | { status: "duplicate"; name: string; checkedAt: string }
  | { status: "error"; message: string };

type Scanner = { stop: () => Promise<void> };

export default function CheckinScannerPage() {
  const params = useParams<{ eventId: string }>();
  const scannerRef = useRef<Scanner | null>(null);
  const isProcessingRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState<ScanResult>({ status: "idle" });

  // Desliga a câmera ao sair da página
  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function startCamera() {
    setCameraError("");
    try {
      // Import dinâmico: a lib usa a câmera, só roda no navegador
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      // facingMode evita listar câmeras, o que falha no iPhone
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text: string) => handleScan(text),
        () => {} // frame sem QR na mira: ignorado de propósito
      );
      setRunning(true);
    } catch (err) {
      scannerRef.current = null;
      setRunning(false);
      setCameraError(err instanceof Error ? err.message : String(err));
    }
  }

  async function stopCamera() {
    await scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setRunning(false);
  }

  // Alternativa: tirar uma foto do QR (abre a câmera nativa do celular)
  async function scanPhoto(file: File) {
    const { Html5Qrcode } = await import("html5-qrcode");
    const reader = new Html5Qrcode("qr-file-reader");
    try {
      const text = await reader.scanFile(file, false);
      await handleScan(text);
    } catch {
      setResult({ status: "error", message: "Não encontrei um QR code na foto. Tente de mais perto." });
    } finally {
      reader.clear();
    }
  }

  async function handleScan(token: string) {
    // A lib lê ~10x por segundo: evita processar o mesmo QR várias vezes
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
        setResult({ status: "success", name: data.name, eventName: data.eventName });
      } else if (response.status === 409) {
        setResult({ status: "duplicate", name: data.name, checkedAt: data.alreadyCheckedInAt });
      } else if (response.status === 401) {
        setResult({ status: "error", message: "Entre na sua conta para fazer check-in" });
      } else {
        setResult({ status: "error", message: data.error ?? "Erro ao validar QR code" });
      }
    } catch {
      setResult({ status: "error", message: "Falha de conexão com o servidor" });
    }

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 2000);
  }

  const boxColor =
    result.status === "success"
      ? "#dcfce7"
      : result.status === "duplicate"
      ? "#fef9c3"
      : result.status === "error"
      ? "#fee2e2"
      : "#f3f4f6";

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Check-in — Evento {params.eventId}
      </h1>

      <div id="qr-reader" style={{ width: "100%" }} />
      <div id="qr-file-reader" style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {!running ? (
          <button
            onClick={startCamera}
            style={{ padding: "10px 16px", borderRadius: 8, background: "#4f46e5", color: "#fff", fontWeight: 600 }}
          >
            Ligar câmera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            style={{ padding: "10px 16px", borderRadius: 8, background: "#e5e7eb", fontWeight: 600 }}
          >
            Desligar câmera
          </button>
        )}
        <label
          style={{ padding: "10px 16px", borderRadius: 8, background: "#e5e7eb", fontWeight: 600, cursor: "pointer" }}
        >
          Tirar foto do QR
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) scanPhoto(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {cameraError && (
        <p role="alert" style={{ marginTop: 12, color: "#b91c1c", fontSize: 14 }}>
          Não foi possível abrir a câmera: {cameraError}
        </p>
      )}

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 8,
          textAlign: "center",
          fontWeight: 600,
          backgroundColor: boxColor,
        }}
      >
        {result.status === "idle" && "Ligue a câmera e aponte para o QR code"}
        {result.status === "success" &&
          `✅ ${result.name} — check-in confirmado em ${result.eventName}`}
        {result.status === "duplicate" &&
          `⚠️ ${result.name} já fez check-in às ${new Date(result.checkedAt).toLocaleTimeString("pt-BR")}`}
        {result.status === "error" && `❌ ${result.message}`}
      </div>
    </main>
  );
}
