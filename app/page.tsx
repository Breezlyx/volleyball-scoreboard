"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Monitor, Gamepad2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

export default function Home() {
  const router = useRouter()
  const [matchCode, setMatchCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Función para limitar y formatear el código a mayúsculas
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (value.length <= 4) {
      setMatchCode(value)
    }
  }

  // Lógica para crear un partido nuevo en Supabase y abrir la TV
  const handleStartMatch = async () => {
    setIsLoading(true)
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()

    const { error } = await supabase.from("matches").insert([{ join_code: code }])

    if (error) {
      console.error("Error creando el partido:", error)
      alert("Hubo un error al crear el partido.")
      setIsLoading(false)
      return
    }

    router.push(`/display/${code}`)
  }

  // Lógica para ir al controlador móvil
  const handleConnect = () => {
    if (matchCode.length === 4) {
      router.push(`/controller/${matchCode}`)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950 select-none">
      {/* Background Geometric Accents */}
      <div
        className="absolute -left-32 top-1/4 h-[600px] w-[400px] bg-cyan-500/10"
        style={{ clipPath: "polygon(30% 0, 100% 0, 70% 100%, 0 100%)" }}
      />
      <div
        className="absolute -right-32 bottom-1/4 h-[600px] w-[400px] bg-rose-500/10"
        style={{ clipPath: "polygon(30% 0, 100% 0, 70% 100%, 0 100%)" }}
      />
      <div
        className="absolute left-1/4 top-0 h-[300px] w-[200px] bg-cyan-500/5"
        style={{ clipPath: "polygon(0 0, 100% 20%, 100% 100%, 0 80%)" }}
      />
      <div
        className="absolute bottom-0 right-1/4 h-[300px] w-[200px] bg-rose-500/5"
        style={{ clipPath: "polygon(0 20%, 100% 0, 100% 80%, 0 100%)" }}
      />

      {/* Main Container */}
      <div
        className="relative z-10 mx-4 w-full max-w-4xl bg-white shadow-2xl"
        style={{
          clipPath:
            "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))",
        }}
      >
        {/* Header/Branding */}
        <div className="px-8 pb-4 pt-12 text-center md:px-16">
          <h1
            className="text-6xl font-black tracking-tighter md:text-8xl"
            style={{ fontStretch: "condensed" }}
          >
            <span className="text-slate-900">VOLEY</span>
            <span className="text-cyan-500">SCORE</span>
          </h1>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
            Broadcast Control Hub
          </p>
        </div>

        {/* Zones Container */}
        <div className="relative flex flex-col gap-0 px-8 pb-12 pt-8 md:flex-row md:px-16">
          
          {/* Zone 1: Create Match (TV) */}
          <div className="flex flex-1 flex-col items-center justify-center py-8 md:pr-8">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Modo Pantalla TV
            </div>
            <button
              onClick={handleStartMatch}
              disabled={isLoading}
              className={cn(
                "group relative flex items-center gap-4 px-8 py-5",
                "bg-cyan-500 text-white transition-all duration-200",
                "hover:bg-cyan-600 hover:shadow-lg hover:shadow-cyan-500/30",
                "active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
              )}
              style={{
                clipPath:
                  "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
              }}
            >
              {isLoading ? (
                <Loader2 className="h-7 w-7 animate-spin" strokeWidth={2.5} />
              ) : (
                <Monitor className="h-7 w-7" strokeWidth={2.5} />
              )}
              <span
                className="text-xl font-black uppercase tracking-wide"
                style={{ fontStretch: "condensed" }}
              >
                {isLoading ? "CREANDO..." : "INICIAR PARTIDO"}
              </span>
            </button>
            <p className="mt-4 max-w-[200px] text-center text-xs text-slate-400">
              Abre el marcador en pantalla completa
            </p>
          </div>

          {/* Geometric Divider */}
          <div className="relative flex items-center justify-center py-4 md:py-0">
            <div className="h-px w-full bg-slate-200 md:hidden" />
            <div className="hidden h-full w-px bg-slate-200 md:block" />
            <div
              className="absolute flex h-12 w-12 items-center justify-center bg-slate-900"
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }}
            >
              <span className="text-xs font-black text-white">VS</span>
            </div>
          </div>

          {/* Zone 2: Join Match (Mobile) */}
          <div className="flex flex-1 flex-col items-center justify-center py-8 md:pl-8">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Modo Controlador
            </div>

            {/* Match ID Input */}
            <div
              className="relative mb-4 bg-slate-100"
              style={{
                clipPath:
                  "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
              }}
            >
              <input
                type="text"
                value={matchCode}
                onChange={handleCodeChange}
                placeholder="CÓDIGO"
                className={cn(
                  "w-[200px] bg-transparent px-6 py-4 text-center font-mono text-3xl font-black uppercase tracking-[0.3em] text-slate-900",
                  "placeholder:text-slate-300 placeholder:tracking-[0.2em] placeholder:text-xl",
                  "focus:outline-none"
                )}
                maxLength={4}
              />
              <div className="absolute left-0 top-0 h-2 w-2 border-l-2 border-t-2 border-rose-500" />
              <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-rose-500" />
            </div>

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={matchCode.length !== 4}
              className={cn(
                "group relative flex items-center gap-4 px-8 py-5",
                "bg-rose-500 text-white transition-all duration-200",
                "hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/30",
                "active:scale-[0.98]",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
              )}
              style={{
                clipPath:
                  "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
              }}
            >
              <Gamepad2 className="h-7 w-7" strokeWidth={2.5} />
              <span
                className="text-xl font-black uppercase tracking-wide"
                style={{ fontStretch: "condensed" }}
              >
                CONECTAR
              </span>
            </button>
            <p className="mt-4 max-w-[200px] text-center text-xs text-slate-400">
              Ingresa el código que aparece en la TV
            </p>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="flex h-2 w-full">
          <div className="flex-1 bg-cyan-500" />
          <div className="flex-1 bg-rose-500" />
        </div>
      </div>

      {/* Corner decorative elements */}
      <div
        className="absolute bottom-8 left-8 h-16 w-16 border-2 border-cyan-500/30"
        style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
      />
      <div
        className="absolute right-8 top-8 h-16 w-16 border-2 border-rose-500/30"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      />
    </div>
  )
}