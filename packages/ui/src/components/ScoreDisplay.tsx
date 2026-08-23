import React from "react";

interface ScoreDisplayProps {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  team1GamesWon?: number;
  team2GamesWon?: number;
  currentGame?: number;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
}

const sizes = {
  sm: { score: "text-4xl", name: "text-sm", game: "text-xs" },
  md: { score: "text-6xl", name: "text-base", game: "text-sm" },
  lg: { score: "text-8xl", name: "text-lg", game: "text-base" },
  xl: { score: "text-[10rem]", name: "text-xl", game: "text-lg" },
};

export function ScoreDisplay({
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  team1GamesWon = 0,
  team2GamesWon = 0,
  currentGame = 1,
  size = "lg",
  variant = "dark",
}: ScoreDisplayProps) {
  const s = sizes[size];
  const isDark = variant === "dark";

  return (
    <div className={`w-full ${isDark ? "bg-[#1E3A1E] text-white" : "bg-white text-[#1E3A1E]"} rounded-3xl p-6`}>
      {/* Game indicator */}
      <div className="text-center mb-4">
        <span className={`text-xs font-bold tracking-widest uppercase ${isDark ? "text-[#C8D5B0]/60" : "text-[#3D6B35]/60"}`}>
          Game {currentGame}
        </span>
      </div>

      {/* Scores */}
      <div className="flex items-center justify-between gap-4">
        {/* Team 1 */}
        <div className="flex-1 text-center">
          <div className={`${s.name} font-semibold mb-2 truncate ${isDark ? "text-[#C8D5B0]" : "text-[#3D6B35]"}`}>
            {team1Name}
          </div>
          <div
            className={`${s.score} font-bold leading-none tabular-nums transition-all duration-200`}
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {team1Score}
          </div>
          {/* Games won dots */}
          <div className="flex justify-center gap-1 mt-3">
            {Array.from({ length: Math.max(team1GamesWon + team2GamesWon + 1, 3) }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < team1GamesWon
                    ? "bg-[#D4E04A]"
                    : isDark ? "bg-white/20" : "bg-[#3D6B35]/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className={`text-4xl font-light ${isDark ? "text-white/20" : "text-[#3D6B35]/20"}`}>—</div>

        {/* Team 2 */}
        <div className="flex-1 text-center">
          <div className={`${s.name} font-semibold mb-2 truncate ${isDark ? "text-[#C8D5B0]" : "text-[#3D6B35]"}`}>
            {team2Name}
          </div>
          <div
            className={`${s.score} font-bold leading-none tabular-nums transition-all duration-200`}
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {team2Score}
          </div>
          {/* Games won dots */}
          <div className="flex justify-center gap-1 mt-3">
            {Array.from({ length: Math.max(team1GamesWon + team2GamesWon + 1, 3) }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < team2GamesWon
                    ? "bg-[#D4E04A]"
                    : isDark ? "bg-white/20" : "bg-[#3D6B35]/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
