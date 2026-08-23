"use client";

import Link from "next/link";
import { Trophy, Globe } from "lucide-react";
import { getTournaments } from "@/lib/store";
import { useState, useEffect } from "react";
import { Tournament } from "@/lib/store";

export default function LivePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    setTournaments(getTournaments());
  }, []);

  const ongoingTournaments = tournaments.filter((t) => t.status === "ongoing");
  const publishedCategories = tournaments.flatMap((t) =>
    t.categories
      .filter((c) => c.drawPublished)
      .map((c) => ({ tournament: t, category: c }))
  );

  return (
    <div className="min-h-screen" style={{ background: "#F8F4EE" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A3318 0%, #2D5A27 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm font-bold tracking-widest uppercase">Live</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Live Scores</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            {ongoingTournaments.length > 0
              ? `${ongoingTournaments.length} tournament${ongoingTournaments.length > 1 ? "s" : ""} in progress`
              : "No live tournaments right now"}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tournaments.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center" style={{ border: "2px dashed rgba(201,168,76,0.3)" }}>
            <Trophy size={48} style={{ color: "#C9A84C", margin: "0 auto 16px" }} />
            <h2 className="font-display text-2xl font-bold mb-3" style={{ color: "#1A3318" }}>No tournaments yet</h2>
            <p className="text-sm mb-6" style={{ color: "#8A8070" }}>
              Once a tournament is created and its draw is published, live scores will appear here.
            </p>
            <Link href="/tournaments"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm"
              style={{ background: "#1A3318", color: "white" }}>
              Browse Tournaments
            </Link>
          </div>
        ) : publishedCategories.length === 0 ? (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-12 text-center" style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F8F4EE" }}>
                <Trophy size={28} style={{ color: "#8A8070" }} />
              </div>
              <h2 className="font-display text-xl font-bold mb-2" style={{ color: "#1A3318" }}>No draws published yet</h2>
              <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: "#8A8070" }}>
                Live scores will appear here once a tournament draw is published. Check back soon!
              </p>
              <Link href="/tournaments"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: "#1A3318", color: "white" }}>
                View Tournaments
              </Link>
            </div>

            {/* Show all tournaments even without published draws */}
            <div>
              <h2 className="font-display text-xl font-bold mb-4" style={{ color: "#1A3318" }}>Upcoming Tournaments</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {tournaments.map((t) => (
                  <Link key={t.id} href={`/tournaments/${t.id}`}>
                    <div className="bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all"
                      style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                      <div className="flex">
                        {t.bannerImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.bannerImage} alt="" className="w-24 flex-shrink-0 object-cover" style={{ minHeight: 90 }} />
                        ) : (
                          <div className="w-24 flex-shrink-0 flex items-center justify-center" style={{ background: "#1A3318", minHeight: 90 }}>
                            <Trophy size={20} style={{ color: "#C9A84C" }} />
                          </div>
                        )}
                        <div className="flex-1 p-4">
                          <h3 className="font-display font-bold text-sm" style={{ color: "#1A3318" }}>{t.name}</h3>
                          {t.city && <p className="text-xs mt-0.5" style={{ color: "#8A8070" }}>{t.city}{t.startDate ? ` · ${t.startDate}` : ""}</p>}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {t.categories.map((cat) => (
                              <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                                style={{ background: "#F8F4EE", color: "#8A8070", border: "1px solid rgba(232,224,208,0.8)" }}>
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold" style={{ color: "#1A3318" }}>
              Published Draws ({publishedCategories.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {publishedCategories.map(({ tournament, category }) => (
                <Link key={category.id} href={`/tournaments/${tournament.id}`}>
                  <div className="bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all"
                    style={{ border: "1px solid rgba(232,224,208,0.8)" }}>
                    <div className="px-5 py-3 flex items-center justify-between" style={{ background: "#1A3318" }}>
                      <div className="flex items-center gap-2">
                        <Globe size={12} style={{ color: "#C9A84C" }} />
                        <span className="text-xs font-bold" style={{ color: "#C9A84C" }}>{category.name}</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{tournament.name}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "#F0FDF4", color: "#16A34A" }}>Draw Live</span>
                    </div>
                    <div className="p-5">
                      <div className="text-sm font-semibold mb-1" style={{ color: "#1A3318" }}>{tournament.name}</div>
                      <div className="text-xs" style={{ color: "#8A8070" }}>
                        {category.scoringFormat}
                        {tournament.city ? ` · ${tournament.city}` : ""}
                        {tournament.startDate ? ` · ${tournament.startDate}` : ""}
                      </div>
                      <div className="mt-3 text-xs font-semibold" style={{ color: "#2D5A27" }}>
                        View draw →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
