"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type DesignerState = {
  date: string;
  payee: string;
  amount: number;
  amountInWords: string;
  [key: string]: unknown;
};

function readNumber(doc: Document, id: string, fallback = 0) {
  const el = doc.getElementById(id) as HTMLInputElement | null;
  const n = Number(el?.value);
  return Number.isFinite(n) ? n : fallback;
}

function readValue(doc: Document, id: string, fallback = "") {
  const el = doc.getElementById(id) as HTMLInputElement | null;
  return el?.value ?? fallback;
}

function readText(doc: Document, id: string) {
  return (doc.getElementById(id)?.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function DesignerShell() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Loading v24 designer…");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const readDesignerState = useCallback((): DesignerState | null => {
    const doc = frame.current?.contentDocument;
    if (!doc) return null;

    const amount = readNumber(doc, "amountInput", 0);
    const words = [readText(doc, "wordsLine1"), readText(doc, "wordsLine2")]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      date: readValue(doc, "dateInput"),
      payee: readValue(doc, "payeeInput"),
      amount,
      amountInWords: words,
      calibration: {
        acPayee: {
          x: readNumber(doc, "x", 10),
          y: readNumber(doc, "y", 10),
          font: readNumber(doc, "font", 12),
          angle: readNumber(doc, "angle", -40),
          lineWidth: readNumber(doc, "lineWidth", 25),
          lineGap: readNumber(doc, "lineGap", 0),
          topLineY: readNumber(doc, "topLineY", -2.3),
          bottomLineY: readNumber(doc, "bottomLineY", 2.3),
        },
        date: {
          x: readNumber(doc, "dateX", 0),
          y: readNumber(doc, "dateY", 0),
          font: readNumber(doc, "dateFont", 12),
          spacing: readNumber(doc, "dateSpacing", 0.8),
        },
        payee: {
          x: readNumber(doc, "payeeX", 0),
          y: readNumber(doc, "payeeY", 0),
          font: readNumber(doc, "payeeFont", 12),
          width: readNumber(doc, "payeeWidth", 70),
        },
        amount: {
          x: readNumber(doc, "amountX", 0),
          y: readNumber(doc, "amountY", 0),
          font: readNumber(doc, "amountFont", 12),
          width: readNumber(doc, "amountWidth", 35),
        },
        words: {
          font: readNumber(doc, "wordsFont", 11),
          line1: {
            x: readNumber(doc, "words1X", 0),
            y: readNumber(doc, "words1Y", 0),
            width: readNumber(doc, "words1Width", 120),
            height: readNumber(doc, "words1Height", 6),
          },
          line2: {
            x: readNumber(doc, "words2X", 0),
            y: readNumber(doc, "words2Y", 0),
            width: readNumber(doc, "words2Width", 120),
            height: readNumber(doc, "words2Height", 6),
          },
        },
      },
    };
  }, []);

  const saveCheque = useCallback(
    async (statusToSave: "draft" | "printed" = "draft") => {
      const state = readDesignerState();
      if (!state) {
        setStatus("Designer is still loading…");
        return false;
      }

      setSaving(true);
      setStatus(statusToSave === "printed" ? "Saving printed cheque…" : "Saving draft…");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return false;
      }

      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        user_id: user.id,
        cheque_date: state.date,
        payee: state.payee,
        amount: state.amount,
        amount_in_words: state.amountInWords,
        status: statusToSave,
        layout_snapshot: state,
        notes: "",
        updated_at: now,
      };

      if (statusToSave === "printed") {
        payload.first_printed_at = now;
        payload.last_printed_at = now;
        payload.print_count = 1;
      }

      const { data: cheque, error } = await supabase
        .from("cheques")
        .insert(payload)
        .select("id,print_count")
        .single();

      if (error || !cheque) {
        setSaving(false);
        setStatus(error?.message || "Unable to save cheque");
        return false;
      }

      if (statusToSave === "printed") {
        const { error: historyError } = await supabase.from("print_history").insert({
          cheque_id: cheque.id,
          user_id: user.id,
          print_number: 1,
          printed_at: now,
          layout_snapshot: state,
          notes: "",
        });

        if (historyError) {
          setSaving(false);
          setStatus(`Cheque saved, but print history failed: ${historyError.message}`);
          return false;
        }
      }

      setSaving(false);
      setStatus(statusToSave === "printed" ? "Printed cheque saved ✓" : "Draft saved ✓");
      return true;
    },
    [readDesignerState, router],
  );

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;

    const onLoad = () => {
      setStatus("Ready");

      // v24 keeps the physical calibration and print UI. We only wrap its
      // print button so the application can persist a snapshot before the
      // browser print dialog opens. No calibration values are changed here.
      try {
        const doc = iframe.contentDocument;
        const printButton = doc?.getElementById("print") as HTMLButtonElement | null;
        if (!printButton || printButton.dataset.appWrapped === "1") return;

        printButton.dataset.appWrapped = "1";
        printButton.onclick = async () => {
          const saved = await saveCheque("printed");
          if (saved) {
            iframe.contentWindow?.print();
          }
        };
      } catch {
        setStatus("Ready — browser blocked designer integration");
      }
    };

    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [saveCheque]);

  return (
    <div className="designer-wrap">
      <div className="designer-actions">
        <button className="btn secondary" disabled={saving} onClick={() => void saveCheque("draft")}>
          {saving ? "Saving…" : "Save Draft"}
        </button>
        <span className="badge designer-status">{status}</span>
      </div>
      <iframe
        ref={frame}
        className="designer-frame"
        src="/cheque-designer-v24.html"
        title="Cheque designer v24"
      />
    </div>
  );
}
