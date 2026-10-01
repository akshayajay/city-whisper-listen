import { useState } from "react";
import { Plus, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, cities, categories, CivicEvent } from "./types";
export default function ReportDialog({
  onSaved,
}: {
  onSaved: (event: CivicEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(() => crypto.randomUUID());
  const [content, setContent] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState(cities[0]);
  const [category, setCategory] = useState(categories[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<CivicEvent | null>(null);
  const reset = () => {
    setSaved(null);
    setContent("");
    setArea("");
    setId(crypto.randomUUID());
    setError("");
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          if (!value && saved) reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <button className="primary">
          <Plus size={16} />
          Report an issue
        </button>
      </DialogTrigger>
      <DialogContent className="report-dialog">
        <DialogHeader>
          <DialogTitle>
            {saved ? "Report received" : "Make your city heard."}
          </DialogTitle>
          <DialogDescription>
            {saved
              ? "Your report is saved and included in the live analytics."
              : "Share a local issue or improvement. Reports are public. Please avoid personal details."}
          </DialogDescription>
        </DialogHeader>
        {saved ? (
          <div className="report-success">
            <CheckCircle2 size={42} />
            <h3>Thanks for speaking up.</h3>
            <p>
              {saved.category} · {saved.area}, {saved.city}
            </p>
            <code>{saved.id}</code>
            <p className="muted">
              This is an independent civic analytics project. Reports are not
              forwarded to municipal authorities.
            </p>
            <button
              className="primary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              View live reports
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError("");
              try {
                const result = await api<{ event: CivicEvent }>(
                  "/api/reports",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, content, area, city, category }),
                  },
                );
                setSaved(result.event);
                onSaved(result.event);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="form-grid">
              <label>
                City
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Neighborhood or area
              <input
                required
                minLength={2}
                maxLength={100}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Adyar, Gandhi Road"
              />
            </label>
            <label>
              What’s happening?
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tell us what you noticed and where…"
              />
            </label>
            <div className="form-hint">
              Avoid names, phone numbers, and other personal details.
              <span>{content.length}/2000</span>
            </div>
            <p className="form-note">
              Every submission goes to the real citizen dataset, even while
              you’re exploring the demo. For emergencies, contact local
              emergency services.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Saving report…
                </>
              ) : (
                "Submit report"
              )}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
