"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

// --- DISEÑO DE BOOT SCREEN VNL ANIMADO ---
function BootScreenUI({ mainStatus, secondaryStatus }: { mainStatus: string; secondaryStatus: string }) {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-slate-950 font-sans select-none">
      {/* Animación de entrada para el contenido central */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center gap-12"
      >
        {/* Logo con acentos geométricos */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="h-3 w-8 bg-cyan-500" style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)" }} />
            <div className="h-3 w-8 bg-rose-500" style={{ clipPath: "polygon(15% 0, 85% 0, 100% 100%, 0 100%)" }} />
          </div>
          <h1 className="text-[120px] font-black tracking-tighter text-white" style={{ fontStretch: "condensed" }}>
            <span className="text-cyan-500">VOLEY</span>SCORE
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-cyan-500/20" style={{ clipPath: "polygon(0 0, 100% 0, 95% 100%, 0 100%)" }} />
            <div className="h-2 w-2 rotate-45 bg-slate-600" />
            <div className="h-1 w-24 bg-gradient-to-l from-rose-500 to-rose-500/20" style={{ clipPath: "polygon(5% 0, 100% 0, 100% 100%, 0 100%)" }} />
          </div>
        </div>

        {/* Barra de Progreso con carga infinita */}
        <div className="flex w-[600px] flex-col items-center gap-8">
          <div className="relative h-2 w-full overflow-hidden bg-slate-800" style={{ clipPath: "polygon(2% 0, 98% 0, 100% 100%, 0 100%)" }}>
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute inset-0 flex"
            >
              <div className="h-full w-1/2 bg-cyan-500" />
              <div className="h-full w-1/2 bg-rose-500" />
            </motion.div>
          </div>
        </div>

        {/* Texto de estado animado */}
        <div className="flex flex-col items-center gap-4">
          <motion.p 
            key={mainStatus} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold uppercase text-slate-400 tracking-wider"
            style={{ fontStretch: "condensed" }}
          >
            {mainStatus}
          </motion.p>
          <p className="text-sm font-medium uppercase text-slate-500 tracking-[0.4em]">{secondaryStatus}</p>
        </div>
      </motion.div>

      {/* Marcadores Técnicos */}
      <div className="absolute bottom-8 left-8 flex items-center gap-2 text-slate-600">
        <div className="h-4 w-4 border border-slate-700" />
        <span className="font-mono text-xs tracking-wider">SYS_INIT_VNL</span>
      </div>
    </div>
  );
}

// --- LÓGICA DE PÁGINA (CREACIÓN DEL PARTIDO) ---
export default function KioskPage() {
  const hasInitialized = useRef(false);
  const [status, setStatus] = useState({ main: "STARTING ENGINE", sub: "SYNCING WITH CLOUD" });

  useEffect(() => {
    // Evita la doble ejecución en modo desarrollo que causa bucles
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initMatch = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setStatus({ main: "GENERATING SESSION", sub: "CREATING SECURE MATCH ID" });
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();

        const { error } = await supabase.from("matches").insert([{ join_code: code }]);

        if (error) {
          console.error("Error de Supabase:", error);
          throw new Error("No se pudo guardar en la base de datos");
        }

        // Mostramos el código generado en la pantalla sutilmente
        setStatus({ main: "SUCCESS", sub: `SALA CREADA: ${code} - INICIALIZANDO TV...` });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // NAVEGACIÓN NATIVA: Esto es a prueba de balas y rompe el bucle de Next.js
        window.location.href = `/display/${code}`;
        
      } catch (err) {
        console.error("Kiosk Error Detallado:", err);
        // Si hay un error, nos quedamos congelados para ver qué pasó
        setStatus({ main: "ERROR DE SISTEMA", sub: "PRESIONA F12 Y REVISA LA CONSOLA" });
      }
    };

    initMatch();
  }, []); 

  return <BootScreenUI mainStatus={status.main} secondaryStatus={status.sub} />;
}