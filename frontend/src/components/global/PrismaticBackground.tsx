/**
 * PrismaticBackground — soft iridescent gradient orbs.
 * Against the warm grey (#3a3a3c) base, these create the ethereal
 * pearlescent glow seen in the cynora.ai reference aesthetics.
 */
export default function PrismaticBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: 'linear-gradient(145deg, #3e3e40 0%, #353537 40%, #3a3a3c 100%)',
      }}
      aria-hidden
    >
      {/* Pink/coral bloom — top right */}
      <div style={{
        position: 'absolute',
        top: '-25%',
        right: '-10%',
        width: '70vw',
        height: '70vw',
        maxWidth: '900px',
        maxHeight: '900px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249, 114, 121, 0.35) 0%, rgba(255, 138, 101, 0.15) 30%, transparent 60%)',
        filter: 'blur(40px)',
        animation: 'orbDrift1 20s ease-in-out infinite',
      }} />

      {/* Teal/cyan bloom — bottom left */}
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '65vw',
        height: '65vw',
        maxWidth: '850px',
        maxHeight: '850px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(77, 208, 225, 0.3) 0%, rgba(42, 114, 163, 0.12) 30%, transparent 60%)',
        filter: 'blur(40px)',
        animation: 'orbDrift2 25s ease-in-out infinite',
      }} />

      {/* Lavender/pearl — center */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '55vw',
        height: '55vw',
        maxWidth: '700px',
        maxHeight: '700px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(198, 216, 230, 0.25) 0%, rgba(179, 136, 255, 0.12) 35%, transparent 60%)',
        filter: 'blur(50px)',
        animation: 'orbDrift3 30s ease-in-out infinite',
      }} />

      {/* Warm peach accent — right center */}
      <div style={{
        position: 'absolute',
        top: '45%',
        right: '5%',
        width: '30vw',
        height: '30vw',
        maxWidth: '400px',
        maxHeight: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 138, 101, 0.28) 0%, rgba(249, 114, 121, 0.1) 40%, transparent 60%)',
        filter: 'blur(30px)',
        animation: 'orbDrift1 18s ease-in-out infinite reverse',
      }} />

      {/* Cool blue accent — top left */}
      <div style={{
        position: 'absolute',
        top: '0%',
        left: '8%',
        width: '25vw',
        height: '25vw',
        maxWidth: '320px',
        maxHeight: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(42, 114, 163, 0.22) 0%, rgba(77, 208, 225, 0.08) 40%, transparent 55%)',
        filter: 'blur(25px)',
        animation: 'orbDrift2 22s ease-in-out infinite reverse',
      }} />

      <style>{`
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 20px) scale(1.05); }
          66% { transform: translate(20px, -15px) scale(0.95); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -25px) scale(1.03); }
          66% { transform: translate(-15px, 15px) scale(0.97); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, -20px) scale(1.04); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes orbDrift1 { 0%, 100% { transform: none; } }
          @keyframes orbDrift2 { 0%, 100% { transform: none; } }
          @keyframes orbDrift3 { 0%, 100% { transform: none; } }
        }
      `}</style>
    </div>
  )
}
