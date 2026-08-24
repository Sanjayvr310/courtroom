"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Calendar, Trophy, ChevronRight, ArrowLeft } from "lucide-react";
import { getTournaments, Tournament } from "@/lib/store";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    setTournaments(getTournaments());
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#F8F4EE" }}>
      <div style={{ background: "linear-gradient(135deg, #1A3318 0%, #2D5A27 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.4)" }}>
            <ArrowLeft size={14} /> Home
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white">Tournaments</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>Browse all tournaments and check your draw</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {tournaments.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-16 text-center" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
            <Trophy size={40} style={{ color: "#C9A84C", margin: "0 auto 16px" }} />
            <h2 className="font-display text-xl font-bold mb-2" style={{ color: "#1A3318" }}>No tournaments yet</h2>
            <p className="text-sm" style={{ color: "#8A8070" }}>Check back soon for upcoming events.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.id}`}>
                <div className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group"
                  style={{ border: "1px solid rgba(232,224,208,0.8)", boxShadow: "0 2px 12px rgba(26,51,24,0.06)" }}>
                  {/* Banner */}
                  {t.bannerImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.bannerImage} alt={t.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center" style={{ background: "#1A3318" }}>
                      <Trophy size={36} style={{ color: "#C9A84C" }} />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold group-hover:text-[#2D5A27] transition-colors" style={{ color: "#1A3318" }}>
                      {t.name}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {t.city && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#8A8070" }}>
                          <MapPin size={10} /> {t.city}
                        </span>
                      )}
                      {t.startDate && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#8A8070" }}>
                          <Calendar size={10} /> {t.startDate}
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs mt-2 line-clamp-2" style={{ color: "#8A8070" }}>{t.description}</p>
                    )}
                    {/* Categories */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {t.categories.map((cat) => (
                        <span key={cat.id}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={cat.drawPublished
                            ? { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }
                            : { background: "#F8F4EE", color: "#8A8070", border: "1px solid rgba(232,224,208,0.8)" }}>
                          {cat.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      {t.prize && <span className="text-sm font-bold" style={{ color: "#C9A84C" }}>{t.prize}</span>}
                      <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold group-hover:translate-x-1 transition-transform" style={{ color: "#2D5A27" }}>
                        View <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
