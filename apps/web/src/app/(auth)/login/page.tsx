import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[#0057b7] overflow-hidden font-sans">
      {/* Background Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#003c8f] via-[#005ec4] to-[#007bfb]" />

      {/* Decorative 3D Curve Elements (SVG) */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        {/* Curved loop top right */}
        <svg
          className="absolute -right-20 -top-20 w-[450px] h-[450px] opacity-70 blur-[1px] transform rotate-12"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50,150 C80,80 180,120 150,50 C120,-20 30,20 60,90 C80,140 160,160 140,190"
            stroke="url(#gradient-3d-1)"
            strokeWidth="24"
            strokeLinecap="round"
            filter="url(#shadow-3d)"
          />
          <defs>
            <linearGradient id="gradient-3d-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#80bfff" />
              <stop offset="50%" stopColor="#0055ff" />
              <stop offset="100%" stopColor="#001a66" />
            </linearGradient>
            <filter id="shadow-3d" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="4" dy="12" stdDeviation="8" floodColor="#001845" floodOpacity="0.4" />
            </filter>
          </defs>
        </svg>

        {/* Floating wavy loop bottom left */}
        <svg
          className="absolute -left-24 -bottom-20 w-[500px] h-[500px] opacity-70 blur-[1px]"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M30,30 C90,20 180,60 160,120 C140,180 60,190 40,130 C20,70 120,80 150,160"
            stroke="url(#gradient-3d-2)"
            strokeWidth="26"
            strokeLinecap="round"
            filter="url(#shadow-3d-2)"
          />
          <defs>
            <linearGradient id="gradient-3d-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#66b2ff" />
              <stop offset="40%" stopColor="#0066cc" />
              <stop offset="100%" stopColor="#002244" />
            </linearGradient>
            <filter id="shadow-3d-2" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="-4" dy="16" stdDeviation="10" floodColor="#000c24" floodOpacity="0.5" />
            </filter>
          </defs>
        </svg>

        {/* Wavy zig-zag elements top left */}
        <svg
          className="absolute left-16 top-24 w-[160px] h-[160px] opacity-80"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10,20 L30,40 L60,15 L90,35"
            stroke="url(#gradient-zig)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow-zig)"
          />
          <path
            d="M10,50 L30,70 L60,45 L90,65"
            stroke="url(#gradient-zig)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow-zig)"
          />
          <defs>
            <linearGradient id="gradient-zig" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b3d9ff" />
              <stop offset="100%" stopColor="#3399ff" />
            </linearGradient>
            <filter id="glow-zig" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="6" stdDeviation="4" floodColor="#001845" floodOpacity="0.3" />
            </filter>
          </defs>
        </svg>

        {/* Small waves bottom right */}
        <svg
          className="absolute right-24 bottom-32 w-[180px] h-[100px] opacity-80"
          viewBox="0 0 100 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10,15 Q30,5 50,15 T90,15"
            stroke="url(#gradient-zig)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M10,35 Q30,25 50,35 T90,35"
            stroke="url(#gradient-zig)"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>

        {/* Top center loop */}
        <svg
          className="absolute left-[35%] -top-12 w-[120px] h-[120px] opacity-50 blur-[2px]"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20,80 C30,30 80,30 80,70 C80,100 40,90 50,40"
            stroke="#66b2ff"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Main Form Container */}
      <div className="relative z-10 w-full max-w-[460px] px-4 md:px-0">
        <LoginForm />
      </div>
    </div>
  );
}

