// src/TourSystem.jsx
import { useState, useEffect, useCallback } from "react";
import supabase from "./supabase.js";
import { TOURS } from "./tourData.js";

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useTour(userId, currentView) {
  const [completedSections, setCompletedSections] = useState(new Set());
  const [activeTour, setActiveTour] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("tour_progress")
      .select("section")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setCompletedSections(new Set(data.map((r) => r.section)));
        setLoaded(true);
      });
  }, [userId]);

  useEffect(() => {
    if (!loaded || !userId || !currentView) return;
    if (!TOURS[currentView]) return;
    if (completedSections.has(currentView)) return;
    if (activeTour) return;
    const t = setTimeout(() => {
      setActiveTour({ section: currentView, stepIndex: 0 });
    }, 600);
    return () => clearTimeout(t);
  }, [currentView, loaded, completedSections]);

  const markComplete = useCallback(async (section) => {
    setCompletedSections((prev) => new Set([...prev, section]));
    await supabase
      .from("tour_progress")
      .upsert({ user_id: userId, section }, { onConflict: "user_id,section" });
  }, [userId]);

  const launchTour = useCallback((section) => {
    if (!TOURS[section]) return;
    setActiveTour({ section, stepIndex: 0 });
  }, []);

  const closeTour = useCallback(() => {
    if (activeTour) markComplete(activeTour.section);
    setActiveTour(null);
  }, [activeTour, markComplete]);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    const steps = TOURS[activeTour.section];
    if (activeTour.stepIndex < steps.length - 1) {
      setActiveTour((prev) => ({ ...prev, stepIndex: prev.stepIndex + 1 }));
    } else {
      closeTour();
    }
  }, [activeTour, closeTour]);

  const prevStep = useCallback(() => {
    if (!activeTour || activeTour.stepIndex === 0) return;
    setActiveTour((prev) => ({ ...prev, stepIndex: prev.stepIndex - 1 }));
  }, [activeTour]);

  return { activeTour, launchTour, closeTour, nextStep, prevStep };
}

// ─── Tooltip visual ───────────────────────────────────────────────────────────
export function TourTooltip({ activeTour, onNext, onPrev, onClose }) {
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    if (!activeTour) { setTargetRect(null); return; }
    const step = TOURS[activeTour.section]?.[activeTour.stepIndex];
    if (!step || !step.selector) { setTargetRect(null); return; }
    const el = document.querySelector(step.selector);
    if (!el) { setTargetRect(null); return; }
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeTour]);

  if (!activeTour) return null;
  const steps = TOURS[activeTour.section];
  if (!steps) return null;
  const step = steps[activeTour.stepIndex];
  if (!step) return null;

  const isFirst = activeTour.stepIndex === 0;
  const isLast = activeTour.stepIndex === steps.length - 1;
  const total = steps.length;
  const current = activeTour.stepIndex + 1;
  const TW = 320, TH = 200;

  let tooltipStyle = {};
  if (!targetRect || step.position === "center") {
    tooltipStyle = {
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
    };
  } else {
    const margin = 16;
    if (step.position === "bottom") {
      tooltipStyle = {
        position: "fixed",
        top: Math.min(targetRect.bottom + margin, window.innerHeight - TH - 20),
        left: Math.max(margin, Math.min(targetRect.left, window.innerWidth - TW - margin)),
      };
    } else if (step.position === "top") {
      tooltipStyle = {
        position: "fixed",
        top: Math.max(margin, targetRect.top - TH - margin),
        left: Math.max(margin, Math.min(targetRect.left, window.innerWidth - TW - margin)),
      };
    } else if (step.position === "right") {
      tooltipStyle = {
        position: "fixed",
        top: Math.max(margin, Math.min(targetRect.top, window.innerHeight - TH - margin)),
        left: Math.min(targetRect.right + margin, window.innerWidth - TW - margin),
      };
    } else if (step.position === "left") {
      tooltipStyle = {
        position: "fixed",
        top: Math.max(margin, Math.min(targetRect.top, window.innerHeight - TH - margin)),
        left: Math.max(margin, targetRect.left - TW - margin),
      };
    }
  }

  return (
    <>
      <div style={{
        position: "fixed", inset: 0, zIndex: 99990,
        background: "rgba(0,0,0,0.45)", pointerEvents: "none",
      }} />

      {targetRect && (
        <div style={{
          position: "fixed",
          top: targetRect.top - 4, left: targetRect.left - 4,
          width: targetRect.width + 8, height: targetRect.height + 8,
          border: "2px solid #26C3D4", borderRadius: 6,
          zIndex: 99991, pointerEvents: "none",
          boxShadow: "0 0 0 4px rgba(38,195,212,0.2)",
          transition: "all 0.3s ease",
        }} />
      )}

      <div style={{
        ...tooltipStyle, zIndex: 99992, width: TW,
        background: "#ffffff", border: "1px solid #d4cfc6",
        borderRadius: 8, padding: "18px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        fontFamily: "Quicksand, sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#e6f7f5", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="ti ti-help-circle" style={{ fontSize: 16, color: "#0d9488" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{step.title}</span>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "#888880", padding: 2,
          }}>
            <i className="ti ti-x" style={{ fontSize: 15 }} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#555550", lineHeight: 1.6, margin: "0 0 16px" }}>
          {step.text}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 5 }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: i === activeTour.stepIndex ? 18 : 6,
                height: 6, borderRadius: 3,
                background: i === activeTour.stepIndex ? "#0d9488" : "#d4cfc6",
                transition: "all 0.2s",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#888880", marginRight: 4 }}>{current}/{total}</span>
            {!isFirst && (
              <button onClick={onPrev} style={{
                padding: "5px 12px", borderRadius: 4, border: "1px solid #d4cfc6",
                background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
                fontFamily: "Quicksand, sans-serif", color: "#555550",
              }}>
                Anterior
              </button>
            )}
            <button onClick={onNext} style={{
              padding: "5px 14px", borderRadius: 4, border: "none",
              background: "#0d9488", color: "#fff", cursor: "pointer",
              fontSize: 12, fontWeight: 700, fontFamily: "Quicksand, sans-serif",
            }}>
              {isLast ? "Finalizar ✓" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Botón ? en el topbar ─────────────────────────────────────────────────────
export function TourLaunchButton({ currentView, onLaunch }) {
  if (!TOURS[currentView]) return null;
  return (
    <button
      onClick={() => onLaunch(currentView)}
      title="Ver guía de esta sección"
      style={{
        background: "transparent", border: "1px solid #d4cfc6",
        borderRadius: 4, padding: "5px 10px", cursor: "pointer",
        color: "#555550", display: "flex", alignItems: "center", gap: 4,
        fontFamily: "Quicksand, sans-serif", fontSize: 12, fontWeight: 600,
      }}
    >
      <i className="ti ti-help-circle" style={{ fontSize: 16 }} />
    </button>
  );
}