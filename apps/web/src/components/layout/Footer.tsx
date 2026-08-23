import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-court-green-dark text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-court-yellow rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#1E3A1E" strokeWidth="2"/>
                  <circle cx="8" cy="8" r="1.5" fill="#1E3A1E"/>
                  <circle cx="12" cy="6" r="1.5" fill="#1E3A1E"/>
                  <circle cx="16" cy="8" r="1.5" fill="#1E3A1E"/>
                  <circle cx="12" cy="12" r="1.5" fill="#1E3A1E"/>
                  <circle cx="8" cy="16" r="1.5" fill="#1E3A1E"/>
                  <circle cx="12" cy="18" r="1.5" fill="#1E3A1E"/>
                  <circle cx="16" cy="16" r="1.5" fill="#1E3A1E"/>
                </svg>
              </div>
              <div>
                <div className="text-[9px] font-medium text-court-yellow/60 tracking-widest uppercase">the</div>
                <div className="font-display font-bold text-white text-base leading-none">Court Room</div>
              </div>
            </div>
            <p className="text-court-sage/70 text-sm leading-relaxed">
              The premier pickleball tournament platform. Live scores, brackets, and standings.
            </p>
          </div>

          {/* Tournaments */}
          <div>
            <h4 className="font-semibold text-court-yellow mb-4 text-sm tracking-wide uppercase">Tournaments</h4>
            <ul className="space-y-2.5">
              {["Browse All", "Live Now", "Upcoming", "Completed", "Rankings"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-court-sage/70 hover:text-white text-sm transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Players */}
          <div>
            <h4 className="font-semibold text-court-yellow mb-4 text-sm tracking-wide uppercase">Players</h4>
            <ul className="space-y-2.5">
              {["Player Directory", "DUPR Ratings", "My Profile", "Match History", "Register"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-court-sage/70 hover:text-white text-sm transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold text-court-yellow mb-4 text-sm tracking-wide uppercase">Platform</h4>
            <ul className="space-y-2.5">
              {["For Organizers", "Umpire App", "Admin Portal", "API Docs", "Support"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-court-sage/70 hover:text-white text-sm transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-court-sage/50 text-xs">
            © {new Date().getFullYear()} The Court Room. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-court-sage/50 hover:text-white text-xs transition-colors">Privacy</Link>
            <Link href="#" className="text-court-sage/50 hover:text-white text-xs transition-colors">Terms</Link>
            <Link href="#" className="text-court-sage/50 hover:text-white text-xs transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
