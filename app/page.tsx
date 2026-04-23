"use client";

import Link from "next/link";

export default function HubPage() {
  return (
    <div className="hub-root">
      {/* Background */}
      <div className="hub-bg" aria-hidden />

      {/* Header */}
      <header className="hub-header">
        <div className="hub-logo">
          <span className="hub-logo-dcac">dC</span>
          <span className="hub-logo-ac">aC</span>
        </div>
        <span className="hub-tagline">Plataforma Comercial Interna</span>
      </header>

      {/* Hero */}
      <main className="hub-main">
        <div className="hub-hero">
          <h1 className="hub-title">
            Hub <span className="hub-title-accent">Comercial</span>
          </h1>
          <p className="hub-subtitle">
            Seleccioná el módulo con el que querés trabajar
          </p>
        </div>

        {/* Módulos */}
        <div className="hub-cards">
          {/* Módulo A - Asignaciones */}
          <Link href="/asignaciones" className="hub-card hub-card-asignaciones">
            <div className="hub-card-icon">📋</div>
            <div className="hub-card-body">
              <h2 className="hub-card-title">Asignaciones Comerciales</h2>
              <p className="hub-card-desc">
                Monitor de asignaciones, CRM de leads, silencio comercial,
                onboarding y métricas de la red de asesores.
              </p>
              <div className="hub-card-tags">
                <span className="hub-tag">Dashboard</span>
                <span className="hub-tag">Leads</span>
                <span className="hub-tag">AC / Representantes</span>
              </div>
            </div>
            <div className="hub-card-arrow">→</div>
          </Link>

          {/* Módulo B - Gestión de Sociedades */}
          <Link href="/sociedades" className="hub-card hub-card-sociedades">
            <div className="hub-card-icon">🗺️</div>
            <div className="hub-card-body">
              <h2 className="hub-card-title">Gestión de Sociedades</h2>
              <p className="hub-card-desc">
                Tablero de tráfico y operaciones, mapa de prospectos ganaderos,
                funnel por departamento y cuentas habilitadas.
              </p>
              <div className="hub-card-tags">
                <span className="hub-tag">Mapa</span>
                <span className="hub-tag">Funnel</span>
                <span className="hub-tag">Prospectos</span>
              </div>
            </div>
            <div className="hub-card-arrow">→</div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="hub-footer">
        <span>© {new Date().getFullYear()} De Campo a Campo · Uso interno</span>
      </footer>

      <style>{`
        .hub-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0f172a;
          color: #f8fafc;
          position: relative;
          overflow: hidden;
        }

        /* Animated background gradient */
        .hub-bg {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 0%, rgba(30, 64, 175, 0.35) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 100%, rgba(5, 150, 105, 0.25) 0%, transparent 60%),
            #0f172a;
          z-index: 0;
        }

        .hub-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem 2.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .hub-logo {
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: -0.05em;
          line-height: 1;
        }
        .hub-logo-dcac { color: #60a5fa; }
        .hub-logo-ac   { color: #a7f3d0; }

        .hub-tagline {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding-left: 1rem;
          border-left: 1px solid rgba(255,255,255,0.1);
        }

        .hub-main {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 1.5rem;
          gap: 3rem;
        }

        .hub-hero {
          text-align: center;
        }

        .hub-title {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.1;
          color: #f1f5f9;
        }
        .hub-title-accent {
          background: linear-gradient(135deg, #60a5fa 0%, #a7f3d0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hub-subtitle {
          margin-top: 1rem;
          font-size: 1.1rem;
          color: #94a3b8;
          font-weight: 400;
        }

        /* Cards */
        .hub-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.5rem;
          width: 100%;
          max-width: 900px;
        }

        .hub-card {
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
          padding: 1.75rem;
          border-radius: 1.25rem;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
          background: rgba(255,255,255,0.04);
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .hub-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .hub-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.07);
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }

        .hub-card-asignaciones:hover { border-color: rgba(96,165,250,0.4); box-shadow: 0 20px 60px rgba(30,64,175,0.25); }
        .hub-card-sociedades:hover   { border-color: rgba(167,243,208,0.4); box-shadow: 0 20px 60px rgba(5,150,105,0.25); }

        .hub-card-icon {
          font-size: 2.5rem;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .hub-card-body {
          flex: 1;
          min-width: 0;
        }

        .hub-card-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .hub-card-desc {
          font-size: 0.875rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .hub-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .hub-tag {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          background: rgba(255,255,255,0.08);
          color: #94a3b8;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .hub-card-asignaciones .hub-tag { color: #93c5fd; border-color: rgba(96,165,250,0.25); background: rgba(30,64,175,0.12); }
        .hub-card-sociedades .hub-tag   { color: #6ee7b7; border-color: rgba(52,211,153,0.25); background: rgba(5,150,105,0.12); }

        .hub-card-arrow {
          font-size: 1.25rem;
          color: #475569;
          flex-shrink: 0;
          align-self: center;
          transition: transform 0.2s, color 0.2s;
        }
        .hub-card:hover .hub-card-arrow {
          transform: translateX(4px);
          color: #94a3b8;
        }

        .hub-footer {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 1.5rem;
          font-size: 0.75rem;
          color: #334155;
          border-top: 1px solid rgba(255,255,255,0.04);
        }

        @media (max-width: 640px) {
          .hub-main { padding: 2rem 1rem; }
          .hub-cards { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
