"use client";

import dynamic from "next/dynamic";
import { LoginForm } from "@/components/auth/login-form";

// Importação dinâmica do Canvas 3D desativando o SSR
const Background3D = dynamic(() => import("@/components/auth/background-3d"), {
  ssr: false,
});

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[#0057b7] overflow-hidden font-sans">
      {/* Dynamic 3D WebGL Shapes Background */}
      <Background3D />

      {/* Main Form Container */}
      <div className="relative z-10 w-full max-w-[460px] px-4 md:px-0">
        <LoginForm />
      </div>
    </div>
  );
}


