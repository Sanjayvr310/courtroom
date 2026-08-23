"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle, AlertCircle, Copy, Check,
  User, Users, Trophy, MapPin, Calendar, ExternalLink,
} from "lucide-react";
import { getTournament, addRegistration, createId, Tournament, TournamentCategory, formatPrize } from "@/lib/store";

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ n, current, label }: { n: number; current: number; label: string }) {
  const done = current > n;
  const active = current === n;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        style={done ? { background: "#16A34A", color: "white" } : active ? { background: "#C9A84C", color: "#1A3318" } : { background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}>
        {done ? <Check size={14} /> : n}
      </div>
      <span className="text-[10px] font-medium hidden sm:block"
        style={{ color: active ? "rgba(255,255,255,0.9)" : done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#8A8070" }}>
        {label} {required && <span style={{ color: "#DC2626" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", required }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
      style={{ border: "1.5px solid rgba(232,224,208,0.8)", color: "#1A3318", background: "white" }}
      onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(232,224,208,0.8)")} />
  );
}

// ─── Copy link button ─────────────────────────────────────────────────────────
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
      style={{ background: copied ? "#F0FDF4" : "#F8F4EE", color: copied ? "#16A34A" : "#1A3318", border: "1px solid rgba(232,224,208,0.8)" }}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RegisterPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [selectedCat, setSelectedCat] = useState<TournamentCategory | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isDoubles, setIsDoubles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [registrationId, setRegistrationId] = useState("");

  // Player 1
  const [p1Name, setP1Name] = useState("");
  const [p1Email, setP1Email] = useState("");
  const [p1Phone, setP1Phone] = useState("");
  const [p1DuprId, setP1DuprId] = useState("");
  const [p1Rating, setP1Rating] = useState("");
  const [p1City, setP1City] = useState("");

  // Player 2
  const [p2Name, setP2Name] = useState("");
  const [p2Email, setP2Email] = useState("");
  const [p2Phone, setP2Phone] = useState("");
  const [p2DuprId, setP2DuprId] = useState("");
  const [p2Rating, setP2Rating] = useState("");

  const [registrationUrl, setRegistrationUrl] = useState("");

  useEffect(() => {
    const t = getTournament(id);
    setTournament(t);
    if (t) {
      const openCats = t.categories.filter((c) => c.registrationOpen);
      if (openCats.length > 0) setSelectedCat(openCats[0]);
    }
    if (typeof window !== "undefined") {
      setRegistrationUrl(window.location.href);
    }
  }, [id]);

  function goToStep2() {
    if (!selectedCat) { setError("Please select a category."); return; }
    // Auto-detect doubles from category name
    const catNameLower = selectedCat.name.toLowerCase();
    setIsDoubles(catNameLower.includes("double") || catNameLower.includes("mixed"));
    setError("");
    setStep(2);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!p1Name.trim() || !p1Email.trim() || !p1Phone.trim()) {
      setError("Please fill in all required fields for Player 1.");
      return;
    }
    if (isDoubles && !p2Name.trim()) {
      setError("Please enter your partner's name for doubles.");
      return;
    }
    setSubmitting(true);
    const regId = createId();
    addRegistration(id, {
      id: regId,
      categoryId: selectedCat!.id,
      player1Name: p1Name.trim(),
      player1Email: p1Email.trim(),
      player1Phone: p1Phone.trim(),
      player1DuprId: p1DuprId.trim() || undefined,
      player1Rating: p1Rating ? parseFloat(p1Rating) : undefined,
      player2Name: isDoubles && p2Name.trim() ? p2Name.trim() : undefined,
      player2Email: isDoubles && p2Email.trim() ? p2Email.trim() : undefined,
      player2Phone: isDoubles && p2Phone.trim() ? p2Phone.trim() : undefined,
      player2DuprId: isDoubles && p2DuprId.trim() ? p2DuprId.trim() : undefined,
      player2Rating: isDoubles && p2Rating ? parseFloat(p2Rating) : undefined,
      status: "pending",
      submittedAt: new Date().toISOString(),
      notes: p1City.trim() ? `City: ${p1City.trim()}` : undefined,
    });
    setRegistrationId(regId);
    setTimeout(() => { setSubmitting(false); setStep(3); }, 600);
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F4EE" }}>
        <p style={{ color: "#8A8070" }}>Tournament not found.</p>
      </div>
    );
  }

  const openCategories = tournament.categories.filter((c) => c.registrationOpen);
  const regCount = (tournament.registrations ?? []).filter((r) => r.categoryId === selectedCat?.id).length;
  const approvedCount = (tournament.registrations ?? []).filter((r) => r.categoryId === selectedCat?.id && r.status === "approved").length;

  // Derive isDoubles: prefer explicit type field, fall back to name matching
  const catIsDoubles = selectedCat
    ? selectedCat.type === "doubles"
      || (!selectedCat.type && (
        selectedCat.name.toLowerCase().includes("double") ||
        selectedCat.name.toLowerCase().includes("mixed") ||
        selectedCat.name.toLowerCase().includes("pair")
      ))
    : false;

  // ── Step 3: Success ──────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="min-h-screen" style={{ background: "#F8F4EE" }}>
        <div style={{ background: "linear-gradient(135deg, #1A3318 0%, #2D5A27 100%)" }}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center gap-3 mb-2">
              <StepDot n={1} current={4} label="Category" />
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
              <StepDot n={2} current={4} label="Details" />
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
              <StepDot n={3} current={4} label="Confirm" />
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white rounded-3xl p-10 text-center" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#F0FDF4" }}>
              <CheckCircle size={40} style={{ color: "#16A34A" }} />
            </div>
            <h2 className="font-display text-3xl font-bold mb-2" style={{ color: "#1A3318" }}>You&apos;re Registered! 🎉</h2>
            <p className="text-sm mb-1" style={{ color: "#8A8070" }}>
              <strong style={{ color: "#1A3318" }}>{p1Name}</strong>{isDoubles && p2Name ? ` & ${p2Name}` : ""} — <strong style={{ color: "#1A3318" }}>{selectedCat?.name}</strong>
            </p>
            <p className="text-sm mb-6" style={{ color: "#8A8070" }}>
              at <strong style={{ color: "#1A3318" }}>{tournament.name}</strong>
            </p>

            {/* Registration ID */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-6" style={{ background: "#F8F4EE" }}>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Ref ID</span>
              <span className="text-sm font-bold font-mono" style={{ color: "#1A3318" }}>{registrationId.toUpperCase().slice(0, 8)}</span>
            </div>

            <div className="p-4 rounded-2xl mb-6 text-left" style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "#92400E" }}>⏳ Pending Review</p>
              <p className="text-xs" style={{ color: "#92400E" }}>
                Your registration is pending organizer approval. You&apos;ll be notified once it&apos;s confirmed. Keep your reference ID handy.
              </p>
            </div>

            {/* Share registration link */}
            <div className="p-4 rounded-2xl mb-6 text-left" style={{ background: "#F8F4EE", border: "1px solid rgba(232,224,208,0.8)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#8A8070" }}>Share Registration Link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs font-mono truncate" style={{ background: "white", border: "1px solid rgba(232,224,208,0.8)", color: "#8A8070" }}>
                  {registrationUrl}
                </div>
                <CopyLinkButton url={registrationUrl} />
              </div>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link href={`/tournaments/${id}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm"
                style={{ background: "#1A3318", color: "white" }}>
                View Tournament
              </Link>
              <button onClick={() => { setStep(1); setP1Name(""); setP1Email(""); setP1Phone(""); setP1DuprId(""); setP1Rating(""); setP2Name(""); setP2Email(""); setP2Phone(""); setP2DuprId(""); setP2Rating(""); setIsDoubles(false); }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: "#F8F4EE", color: "#1A3318", border: "1px solid rgba(232,224,208,0.8)" }}>
                Register Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8F4EE" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A3318 0%, #2D5A27 100%)" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <Link href={`/tournaments/${id}`} className="inline-flex items-center gap-1.5 text-sm mb-5 transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.4)" }}>
            <ChevronLeft size={14} /> {tournament.name}
          </Link>

          {/* Tournament mini-card */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.15)" }}>
              <Trophy size={22} style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{tournament.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {tournament.city && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    <MapPin size={10} /> {tournament.city}
                  </span>
                )}
                {tournament.startDate && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    <Calendar size={10} /> {tournament.startDate}
                  </span>
                )}
                {tournament.prize && (
                  <span className="text-xs font-bold" style={{ color: "#C9A84C" }}>{formatPrize(tournament.prize)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <StepDot n={1} current={step} label="Category" />
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
            <StepDot n={2} current={step} label="Details" />
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
            <StepDot n={3} current={step} label="Confirm" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* ── No open categories ── */}
        {openCategories.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
            <AlertCircle size={32} style={{ color: "#D97706", margin: "0 auto 12px" }} />
            <h2 className="font-display text-xl font-bold mb-2" style={{ color: "#1A3318" }}>Registration Closed</h2>
            <p className="text-sm mb-6" style={{ color: "#8A8070" }}>Registration is not currently open for any category in this tournament.</p>
            <Link href={`/tournaments/${id}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm" style={{ background: "#1A3318", color: "white" }}>
              Back to Tournament
            </Link>
          </div>
        )}

        {/* ── Step 1: Category ── */}
        {openCategories.length > 0 && step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
              <h2 className="font-display text-lg font-bold mb-1" style={{ color: "#1A3318" }}>Choose Your Category</h2>
              <p className="text-xs mb-5" style={{ color: "#8A8070" }}>Select the event you want to register for</p>
              <div className="space-y-3">
                {openCategories.map((cat) => {
                  const catRegs = (tournament.registrations ?? []).filter((r) => r.categoryId === cat.id);
                  const catApproved = catRegs.filter((r) => r.status === "approved").length;
                  const spotsLeft = cat.maxTeams ? cat.maxTeams - catApproved : null;
                  const isFull = spotsLeft !== null && spotsLeft <= 0;
                  return (
                    <label key={cat.id}
                      className="flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all"
                      style={isFull
                        ? { background: "#F8F4EE", border: "2px solid transparent", opacity: 0.5, cursor: "not-allowed" }
                        : selectedCat?.id === cat.id
                          ? { background: "rgba(26,51,24,0.05)", border: "2px solid #1A3318" }
                          : { background: "#F8F4EE", border: "2px solid transparent" }}>
                      <input type="radio" name="category" value={cat.id} checked={selectedCat?.id === cat.id}
                        disabled={isFull}
                        onChange={() => !isFull && setSelectedCat(cat)} className="sr-only" />
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: selectedCat?.id === cat.id ? "#1A3318" : "#C9A84C" }}>
                        {selectedCat?.id === cat.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#1A3318" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm" style={{ color: "#1A3318" }}>{cat.name}</span>
                          {isFull && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#FEF2F2", color: "#DC2626" }}>Full</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs" style={{ color: "#8A8070" }}>{cat.scoringFormat}</span>
                          {cat.entryFee && <span className="text-xs font-bold" style={{ color: "#C9A84C" }}>₹{cat.entryFee}</span>}
                          {spotsLeft !== null && !isFull && (
                            <span className="text-xs font-semibold" style={{ color: spotsLeft <= 5 ? "#D97706" : "#16A34A" }}>
                              {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                            </span>
                          )}
                          {catApproved > 0 && (
                            <span className="text-xs" style={{ color: "#8A8070" }}>{catApproved} registered</span>
                          )}
                        </div>
                      </div>
                      {selectedCat?.id === cat.id && (
                        <CheckCircle size={18} style={{ color: "#1A3318", flexShrink: 0 }} />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Registration link share */}
            <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A8070" }}>Share Registration Link</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8A8070" }}>Send this link to players so they can register directly</p>
                </div>
                <ExternalLink size={14} style={{ color: "#8A8070" }} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs font-mono truncate" style={{ background: "#F8F4EE", color: "#8A8070" }}>
                  {registrationUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/tournaments/${id}/register`}
                </div>
                <CopyLinkButton url={registrationUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/tournaments/${id}/register`} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                <AlertCircle size={16} style={{ color: "#DC2626" }} />
                <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>
              </div>
            )}

            <button onClick={goToStep2}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all hover:scale-[1.01]"
              style={{ background: "#C9A84C", color: "#1A3318" }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Player Details ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category summary */}
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <Trophy size={16} style={{ color: "#C9A84C" }} />
              <div className="flex-1">
                <span className="text-sm font-bold" style={{ color: "#1A3318" }}>{selectedCat?.name}</span>
                {selectedCat?.entryFee && <span className="ml-2 text-sm font-bold" style={{ color: "#C9A84C" }}>₹{selectedCat.entryFee}</span>}
              </div>
              <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold" style={{ color: "#8A8070" }}>Change</button>
            </div>

            {/* Player 1 — always shown */}
            <div className="bg-white rounded-3xl p-6" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#1A3318", color: "white" }}>
                  {catIsDoubles ? "1" : <User size={13} />}
                </div>
                <h2 className="font-display text-lg font-bold" style={{ color: "#1A3318" }}>
                  {catIsDoubles ? "Player 1 (You)" : "Your Details"}
                </h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name" required>
                    <Input value={p1Name} onChange={setP1Name} placeholder="Your full name" required />
                  </Field>
                  <Field label="Phone" required>
                    <Input value={p1Phone} onChange={setP1Phone} placeholder="+91 98765 43210" required />
                  </Field>
                </div>
                <Field label="Email" required>
                  <Input type="email" value={p1Email} onChange={setP1Email} placeholder="your@email.com" required />
                </Field>
                <Field label="City" required>
                  <Input value={p1City} onChange={setP1City} placeholder="e.g. Mumbai" required />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="DUPR Rating" required>
                    <Input type="number" value={p1Rating} onChange={setP1Rating} placeholder="e.g. 4.250" required />
                  </Field>
                  <Field label="DUPR ID" required>
                    <Input value={p1DuprId} onChange={setP1DuprId} placeholder="Your DUPR profile ID" required />
                  </Field>
                </div>
              </div>
            </div>

            {/* Player 2 (doubles only) */}
            {catIsDoubles && (
              <div className="bg-white rounded-3xl p-6" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#C9A84C", color: "#1A3318" }}>2</div>
                  <h2 className="font-display text-lg font-bold" style={{ color: "#1A3318" }}>Partner Details</h2>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" required>
                      <Input value={p2Name} onChange={setP2Name} placeholder="Partner's full name" required />
                    </Field>
                    <Field label="Phone" required>
                      <Input value={p2Phone} onChange={setP2Phone} placeholder="+91 98765 43210" required />
                    </Field>
                  </div>
                  <Field label="Email" required>
                    <Input type="email" value={p2Email} onChange={setP2Email} placeholder="partner@email.com" required />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="DUPR Rating" required>
                      <Input type="number" value={p2Rating} onChange={setP2Rating} placeholder="e.g. 4.250" required />
                    </Field>
                    <Field label="DUPR ID" required>
                      <Input value={p2DuprId} onChange={setP2DuprId} placeholder="Partner's DUPR ID" required />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* Team rating preview for doubles */}
            {catIsDoubles && p1Rating && p2Rating && (
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: "rgba(45,90,39,0.06)", border: "1px solid rgba(45,90,39,0.15)" }}>
                <CheckCircle size={16} style={{ color: "#16A34A" }} />
                <div className="text-sm" style={{ color: "#1A3318" }}>
                  Team Avg DUPR: <strong>{((parseFloat(p1Rating) + parseFloat(p2Rating)) / 2).toFixed(3)}</strong>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                <AlertCircle size={16} style={{ color: "#DC2626" }} />
                <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="px-6 py-4 rounded-2xl font-semibold text-sm"
                style={{ background: "white", color: "#8A8070", border: "1px solid rgba(232,224,208,0.8)" }}>
                ← Back
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-4 rounded-2xl font-bold text-base transition-all hover:scale-[1.01] disabled:opacity-60"
                style={{ background: "#C9A84C", color: "#1A3318" }}>
                {submitting ? "Submitting..." : "Submit Registration →"}
              </button>
            </div>
            <p className="text-xs text-center" style={{ color: "#8A8070" }}>
              Your registration will be reviewed by the organizer. You will be notified of the outcome.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
