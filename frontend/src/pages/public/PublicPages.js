import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { plansAPI, paymentsAPI, legalAPI, hotspotAPI, publicFetch, PUBLIC_API } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Fetch public settings without auth ──────────────────────────────────────
const useSiteSettings = () => {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    publicFetch('/settings')
      .then(r => r.json())
      .then(r => { if (r.success) setSettings(r.data.settings || {}); })
      .catch(() => {});
  }, []);
  return settings;
};

// ══════════════════════════════════════════════════════════════════════════════
// HOMEPAGE
// ══════════════════════════════════════════════════════════════════════════════
export function Homepage() {
  const settings = useSiteSettings();
  const navigate = useNavigate();
  const [plans, setPlans]  = useState([]);
  const [anncs, setAnncs]  = useState([]);

  useEffect(() => {
    publicFetch('/plans').then(r => r.json()).then(r => { if (r.success) setPlans(r.data.plans || []); }).catch(() => {});

    publicFetch('/announcements').then(r => r.json()).then(r => { if (r.success) setAnncs(r.data.announcements || []); }).catch(() => {});
  }, []);

  const primary   = settings.primary_color   || '#6366F1';
  const secondary = settings.secondary_color || '#8B5CF6';
  const accent    = settings.accent_color    || '#EC4899';

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A14', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#F1F5F9' }}>
      <style>{`
        @keyframes fadeUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse2{0%,100%{opacity:.7}50%{opacity:1}}
        .plan-card:hover{transform:translateY(-6px) scale(1.02);box-shadow:0 16px 48px rgba(99,102,241,.25)!important}
        .plan-card{transition:all 0.25s ease!important;cursor:pointer}
        a{text-decoration:none}
      `}</style>

      {/* Announcements banner */}
      {anncs.filter(a => a.isActive).slice(0, 1).map(a => (
        <div key={a.id} style={{ background: a.type === 'DANGER' ? '#EF4444' : a.type === 'WARNING' ? '#F59E0B' : a.type === 'SUCCESS' ? '#10B981' : primary, padding: '10px 5%', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
          {a.title} — {a.content}
        </div>
      ))}

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,20,0.96)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #1E1E2E' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, maxWidth: 1200, margin: '0 auto', padding: '0 5%' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: `linear-gradient(135deg,${primary},${accent})`, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📡</div>
            <span style={{ fontWeight: 900, fontSize: 17, background: `linear-gradient(135deg,${primary},${accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {settings.company_name || 'Blue Dot Networks'}
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <a href="#plans"          style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>Plans</a>
            <a href="#how-it-works"   style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>How It Works</a>
            <a href="#faq"            style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>FAQ</a>
            <Link to="/buy" style={{ background: `linear-gradient(135deg,${primary},${secondary})`, color: '#fff', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13 }}>Buy Voucher</Link>
            <Link to="/login" style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>Login</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '72px 5% 52px', maxWidth: 1200, margin: '0 auto', textAlign: 'center', animation: 'fadeUp 0.8s ease' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${primary}22`, border: `1px solid ${primary}44`, borderRadius: 20, padding: '6px 16px', marginBottom: 24, animation: 'pulse2 2.5s infinite' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Network Online — 99.9% Uptime</span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px,4.5vw,56px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 16px', background: `linear-gradient(135deg,#F1F5F9 40%,${accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {settings.company_tagline || 'Fast & Reliable Wi-Fi Access'}
        </h1>
        <p style={{ fontSize: 16, color: '#64748B', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.7 }}>
          Connect instantly. Pay securely with Paystack or Flutterwave. Browse freely with MikroTik-powered speeds.
        </p>
        <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['500+','Happy Customers'],['99.9%','Uptime'],['24/7','Support'],['MikroTik','Powered']].map(([v,l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{v}</div>
              <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CONNECT NOW — VOUCHER + QR FIRST ═══ */}
      <section style={{ background: '#0D0D1A', padding: '0 5% 64px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Section label */}
          <div style={{ textAlign: 'center', paddingTop: 56, marginBottom: 36 }}>
            <p style={{ color: primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 11, margin: '0 0 8px' }}>Get Connected</p>
            <h2 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 10px' }}>Already Have a Voucher?</h2>
            <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Enter your code or scan your QR card to connect instantly</p>
          </div>

          {/* Tabs: Voucher Code | QR Code | Buy Now */}
          <ConnectBlock primary={primary} secondary={secondary} accent={accent} navigate={navigate} plans={plans} />
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" style={{ padding: '80px 5%', background: '#0D0D1A' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 12, margin: '0 0 8px' }}>Pricing</p>
            <h2 style={{ fontSize: 34, fontWeight: 900, margin: '0 0 10px' }}>Choose Your Plan</h2>
            <p style={{ color: '#64748B' }}>Instant activation · Secure payment · MikroTik powered</p>
          </div>

          {plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
              <p>Loading plans...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 18 }}>
              {plans.map((plan, i) => (
                <div key={plan.id} className="plan-card"
                  onClick={() => navigate('/buy', { state: { planId: plan.id } })}
                  style={{ background: '#12121E', border: `2px solid ${i === 1 ? primary : '#2D2D3F'}`, borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden' }}>
                  {i === 1 && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: primary, color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderBottomLeftRadius: 10, textTransform: 'uppercase' }}>
                      Popular
                    </div>
                  )}
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: primary + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 20 }}>📡</div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>{plan.name}</h3>
                  <p style={{ color: '#64748B', fontSize: 12, margin: '0 0 16px' }}>{plan.validityLabel} · {plan.downloadSpeed}Mbps</p>
                  <div style={{ fontSize: 32, fontWeight: 900, color: primary, marginBottom: 16 }}>₦{Number(plan.price).toLocaleString()}</div>
                  {[
                    plan.unlimited ? 'Unlimited Data' : `${plan.dataLimit}MB Data`,
                    `${plan.downloadSpeed}/${plan.uploadSpeed} Mbps`,
                    plan.validityLabel,
                    'Instant Activation',
                  ].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
                      <span style={{ color: '#10B981', fontWeight: 900 }}>✓</span> {f}
                    </div>
                  ))}
                  <div style={{ background: `linear-gradient(135deg,${primary},${secondary})`, borderRadius: 8, padding: 10, textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#fff', marginTop: 16 }}>
                    Get Started →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '80px 5%' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 48 }}>How It Works</h2>
          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              ['📶','01','Connect to Wi-Fi','Connect to our hotspot with any device'],
              ['🎟','02','Choose a Plan','Select the plan that fits your budget'],
              ['💳','03','Pay Securely','Pay with Paystack or Flutterwave instantly'],
              ['🌐','04','Browse Freely','Your session activates immediately'],
            ].map(([icon,num,title,desc]) => (
              <div key={title} style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 16, padding: 28, maxWidth: 210, flex: '1 1 180px', textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: primary, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 10 }}>{num}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                <h4 style={{ margin: '0 0 8px', fontWeight: 800 }}>{title}</h4>
                <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* FAQ */}
      <section id="faq" style={{ padding: '80px 5%' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 30, fontWeight: 900, textAlign: 'center', marginBottom: 36 }}>Frequently Asked Questions</h2>
          {[
            ['How do I connect?','Connect to our Wi-Fi network. You will automatically be redirected to the login page. Enter your voucher code and click connect.'],
            ['How do I get a voucher?','Click "Buy Voucher" above, select a plan, and pay securely with Paystack or Flutterwave. Your voucher code is shown instantly and emailed to you.'],
            ['When does my voucher activate?','Your voucher activates on first use. The timer starts when you connect — not when you buy.'],
            ['Can I share my voucher?','Each voucher allows connection from one device at a time by default.'],
            ['What if my voucher is not working?','Check the code carefully (no spaces). Contact support if the issue persists.'],
          ].map(([q,a]) => (
            <details key={q} style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
              <summary style={{ padding: '15px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14, userSelect: 'none' }}>{q}</summary>
              <div style={{ padding: '0 20px 16px', color: '#64748B', fontSize: 14, lineHeight: 1.7 }}>{a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0A0A14', borderTop: '1px solid #1E1E2E', padding: '40px 5%' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>{settings.company_name || 'Blue Dot Networks'}</div>
            <div style={{ color: '#64748B', fontSize: 13 }}>{settings.company_email}</div>
            <div style={{ color: '#64748B', fontSize: 13 }}>{settings.company_phone}</div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {[['privacy-policy','Privacy Policy'],['terms','Terms & Conditions'],['refund-policy','Refund Policy'],['faq','FAQ'],['contact','Contact']].map(([slug,label]) => (
              <Link key={slug} to={`/legal/${slug}`} style={{ color: '#64748B', fontSize: 13 }}>{label}</Link>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 24 }}>
          {settings.captive_footer || `© ${new Date().getFullYear()} Blue Dot Networks. All rights reserved.`}
        </div>
      </footer>
    </div>
  );
}

// ─── Standalone Voucher Entry Component ──────────────────────────────────────


// ─── QRLoginBlock ─────────────────────────────────────────────────────────────
// Live camera QR scanner using browser BarcodeDetector API + manual paste fallback
function QRLoginBlock({ primary, secondary, accent }) {
  const videoRef    = React.useRef(null);
  const streamRef   = React.useRef(null);
  const rafRef      = React.useRef(null);

  const [scanning,  setScanning]  = useState(false);
  const [scanError, setScanError] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [detected,  setDetected]  = useState('');

  // Stop camera
  const stopCamera = () => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setScanning(false);
  };

  // Extract token from a URL like http://host/auth/qr/TOKEN
  const extractToken = (text) => {
    try {
      const match = text.match(/\/auth\/qr\/([^/?#\s]+)/);
      return match ? match[1] : null;
    } catch { return null; }
  };

  // Lookup a token against the API
  const lookupToken = async (token) => {
    setLoading(true); setResult(null);
    try {
      const res = await publicFetch(`/vouchers/qr/${token.trim()}`).then(r => r.json());
      if (res.success) {
        setResult({
          success: true,
          code: res.data.code,
          plan: res.data.plan,
        });
        setDetected(token.trim());
      } else {
        setResult({ success: false, message: res.message || 'Invalid QR code.' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Try again.' });
    } finally { setLoading(false); }
  };

  // Start live camera scan
  const startCamera = async () => {
    setScanError(''); setResult(null); setDetected('');

    // Check BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      setScanError('Your browser does not support live QR scanning. Please paste the QR link manually below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

      const scan = async () => {
        if (!videoRef.current || !scanning) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const raw   = barcodes[0].rawValue;
            const token = extractToken(raw);
            if (token) {
              stopCamera();
              await lookupToken(token);
              return;
            }
          }
        } catch {}
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setScanError('Camera permission denied. Please allow camera access and try again.');
      } else {
        setScanError('Could not access camera: ' + err.message);
      }
    }
  };

  // Manual URL/token submit
  const handleManual = async () => {
    const trimmed = manualUrl.trim();
    if (!trimmed) return;
    const token = extractToken(trimmed) || trimmed;
    await lookupToken(token);
  };

  // Cleanup on unmount
  React.useEffect(() => () => stopCamera(), []);

  const inp = {
    width: '100%', background: '#0A0A14', border: '1px solid #2D2D3F',
    borderRadius: 9, color: '#F1F5F9', padding: '11px 13px',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <p style={{ color: '#64748B', fontSize: 14, textAlign: 'center', marginTop: 0, marginBottom: 24, lineHeight: 1.6 }}>
        Use your phone camera to scan the QR code on your voucher card, or paste the QR link below.
      </p>

      {/* Camera viewfinder */}
      <div style={{
        position: 'relative', background: '#0A0A14',
        border: `2px solid ${scanning ? primary : '#2D2D3F'}`,
        borderRadius: 16, overflow: 'hidden', marginBottom: 20,
        aspectRatio: '4/3', maxHeight: 320,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color .3s',
      }}>
        {/* Video element always in DOM so ref works */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: scanning ? 'block' : 'none',
          }}
        />

        {/* Idle state */}
        {!scanning && !result && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>📷</div>
            <div style={{ color: '#94A3B8', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Live QR Scanner</div>
            <div style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
              {scanError || 'Click Start to open your camera and scan a voucher QR code'}
            </div>
            {scanError && (
              <div style={{ background: '#EF444411', border: '1px solid #EF444433', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#EF4444' }}>
                {scanError}
              </div>
            )}
            <button onClick={startCamera}
              style={{ background: `linear-gradient(135deg,${primary},${secondary})`, border: 'none', borderRadius: 10, color: '#fff', padding: '12px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              📷 Start Camera
            </button>
          </div>
        )}

        {/* Scanning overlay */}
        {scanning && (
          <>
            {/* Corner brackets */}
            {[
              { top: '20%', left: '20%',  borderTop: `3px solid ${primary}`, borderLeft:  `3px solid ${primary}` },
              { top: '20%', right: '20%', borderTop: `3px solid ${primary}`, borderRight: `3px solid ${primary}` },
              { bottom: '20%', left: '20%',  borderBottom: `3px solid ${primary}`, borderLeft:  `3px solid ${primary}` },
              { bottom: '20%', right: '20%', borderBottom: `3px solid ${primary}`, borderRight: `3px solid ${primary}` },
            ].map((style, i) => (
              <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...style }} />
            ))}

            {/* Scanning label */}
            <div style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,.7)', borderRadius: 20, padding: '6px 16px',
              color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse2 1s infinite' }} />
              Scanning for QR code...
            </div>

            {/* Stop button */}
            <button onClick={stopCamera} style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: 8,
              color: '#fff', padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>✕ Stop</button>
          </>
        )}

        {/* Success result overlay */}
        {result?.success && (
          <div style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ color: '#10B981', fontWeight: 900, fontSize: 18, marginBottom: 6 }}>QR Code Verified!</div>
            <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 900, color: primary, letterSpacing: 3, marginBottom: 8 }}>{result.code}</div>
            <div style={{ color: '#64748B', fontSize: 13, marginBottom: 18 }}>
              {result.plan?.name} · {result.plan?.validityLabel}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={startCamera}
                style={{ background: '#2D2D3F', border: 'none', borderRadius: 8, color: '#94A3B8', padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                📷 Scan Another
              </button>
              <button onClick={() => { navigator.clipboard?.writeText(result.code); }}
                style={{ background: '#2D2D3F', border: 'none', borderRadius: 8, color: '#94A3B8', padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                📋 Copy Code
              </button>
            </div>
          </div>
        )}

        {/* Error result overlay */}
        {result && !result.success && (
          <div style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <div style={{ color: '#EF4444', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>QR Code Invalid</div>
            <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>{result.message}</div>
            <button onClick={() => { setResult(null); startCamera(); }}
              style={{ background: `linear-gradient(135deg,${primary},${secondary})`, border: 'none', borderRadius: 8, color: '#fff', padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Manual paste fallback */}
      <div style={{ background: '#0A0A14', border: '1px solid #2D2D3F', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          📋 Paste QR Link or Token Manually
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={manualUrl}
            onChange={e => { setManualUrl(e.target.value); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            placeholder="Paste the QR link or token from your voucher..."
            style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }}
          />
          <button onClick={handleManual} disabled={loading || !manualUrl.trim()}
            style={{ background: `linear-gradient(135deg,${primary},${secondary})`, border: 'none', borderRadius: 9, color: '#fff', padding: '11px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0, opacity: (loading || !manualUrl.trim()) ? .6 : 1 }}>
            {loading ? '...' : 'Submit'}
          </button>
        </div>
        <div style={{ color: '#334155', fontSize: 11, marginTop: 8 }}>
          Example: <span style={{ fontFamily: 'monospace', color: '#64748B' }}>http://yoursite.com/auth/qr/abc123</span> or just the token part <span style={{ fontFamily: 'monospace', color: '#64748B' }}>abc123</span>
        </div>
      </div>

      {/* Browser compatibility note */}
      <div style={{ marginTop: 14, padding: '10px 14px', background: '#6366F111', border: '1px solid #6366F133', borderRadius: 10 }}>
        <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
          <strong style={{ color: '#A5B4FC' }}>💡 Tip:</strong> Live scanning works in Chrome, Edge, and Samsung Browser.
          On iPhone, use Safari 17+ or just use your native camera app to scan — it will open this page automatically.
        </div>
      </div>
    </div>
  );
}


// ─── ConnectBlock ─────────────────────────────────────────────────────────────
// Full-width tabbed widget shown first on homepage: Voucher | QR Code | Buy Now
function ConnectBlock({ primary, secondary, accent, navigate, plans }) {
  const [tab, setTab]             = useState('voucher');
  const [code, setCode]           = useState('');
  const [qrToken, setQrToken]     = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [selectedPlan, setSelPlan] = useState(null);
  const [buyForm, setBuyForm]     = useState({ name: '', email: '', phone: '' });
  const [gateway, setGateway]     = useState('PAYSTACK');
  const [paying, setPaying]       = useState(false);

  // ── Validate then LOGIN — activates the voucher (UNUSED → ACTIVE) ──────────
  const checkCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { alert('Please enter a voucher code'); return; }
    setLoading(true); setResult(null);
    try {
      // Step 1: validate (check it exists and is not suspended/expired)
      const validateRes = await publicFetch('/vouchers/validate', {
        method: 'POST',
        body: JSON.stringify({ code: trimmed }),
      }).then(r => r.json());

      if (!validateRes.success) {
        setResult(validateRes);
        return;
      }

      // Step 2: actually LOGIN — this activates the voucher (UNUSED → ACTIVE)
      // and starts the session timer
      const loginRes = await publicFetch('/hotspot/login', {
        method: 'POST',
        body: JSON.stringify({ code: trimmed }),
      }).then(r => r.json());

      if (loginRes.success) {
        // Merge plan info from validate into login result
        setResult({
          success: true,
          message: loginRes.message,
          data: {
            voucher: {
              ...loginRes.data?.voucher,
              plan: loginRes.data?.voucher?.plan || validateRes.data?.voucher?.plan,
            },
          },
          sessionId: loginRes.data?.sessionId,
          activated: true,
        });
      } else {
        setResult(loginRes);
      }
    } catch (e) {
      setResult({ success: false, message: 'Network error. Try again.' });
    } finally { setLoading(false); }
  };

  // ── QR token lookup ────────────────────────────────────────────────────────
  const checkQR = async () => {
    const t = qrToken.trim();
    if (!t) { alert('Please paste the QR token'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await publicFetch(`/vouchers/qr/${t}`).then(r => r.json());
      if (res.success) {
        setResult({ success: true, message: 'QR voucher valid!', data: { voucher: { code: res.data.code, plan: res.data.plan, status: 'UNUSED' } } });
        setCode(res.data.code);
        setTab('voucher');
      } else {
        setResult(res);
      }
    } catch { setResult({ success: false, message: 'QR lookup failed. Try again.' }); }
    finally { setLoading(false); }
  };

  // ── Buy & pay ──────────────────────────────────────────────────────────────
  const pay = async () => {
    if (!selectedPlan) { alert('Please select a plan'); return; }
    if (!buyForm.name.trim() || !buyForm.email.trim()) { alert('Please enter your name and email'); return; }
    setPaying(true);
    try {
      const endpointPath = gateway === 'PAYSTACK' ? '/payments/paystack/init' : '/payments/flutterwave/init';
      const res = await publicFetch(endpointPath, { method:'POST', body: JSON.stringify({ planId: selectedPlan.id, ...buyForm }) }).then(r => r.json());
      if (res.success) {
        const url = res.data.authorizationUrl || res.data.paymentLink;
        if (url) window.location.href = url;
        else alert('No payment URL received');
      } else { alert(res.message || 'Payment failed'); }
    } catch { alert('Network error. Try again.'); }
    finally { setPaying(false); }
  };

  const inp = {
    width: '100%', background: '#0A0A14', border: '1px solid #2D2D3F',
    borderRadius: 9, color: '#F1F5F9', padding: '12px 14px',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
  };
  const lbl = { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' };

  const TABS = [
    { id: 'voucher', icon: '🎟', label: 'Voucher Code' },
    { id: 'qr',      icon: '📱', label: 'QR Code'      },
    { id: 'buy',     icon: '💳', label: 'Buy Voucher'   },
  ];

  return (
    <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>

      {/* Tab Bar */}
      <div style={{ display: 'flex', background: '#0D0D1A', borderBottom: '1px solid #2D2D3F' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); }}
            style={{
              flex: 1, border: 'none', padding: '18px 10px', cursor: 'pointer', fontWeight: 700,
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: tab === t.id ? '#12121E' : 'transparent',
              color:      tab === t.id ? '#F1F5F9'  : '#64748B',
              borderBottom: tab === t.id ? `3px solid ${primary}` : '3px solid transparent',
              transition: 'all .15s',
            }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '32px 28px' }}>

        {/* ── VOUCHER CODE TAB ──────────────────────────────────────────── */}
        {tab === 'voucher' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <p style={{ color: '#64748B', fontSize: 14, marginTop: 0, marginBottom: 22, textAlign: 'center', lineHeight: 1.6 }}>
              Enter the voucher code from your card or email below to validate and connect.
            </p>

            {/* Code input + button */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); }}
                onKeyDown={e => e.key === 'Enter' && checkCode()}
                placeholder="e.g.  NW-ABCD1234"
                maxLength={20}
                style={{
                  ...inp,
                  fontFamily: 'monospace', letterSpacing: 3, fontSize: 18,
                  fontWeight: 900, textAlign: 'center', textTransform: 'uppercase',
                }}
              />
              <button onClick={checkCode} disabled={loading}
                style={{ background: `linear-gradient(135deg,${primary},${secondary})`, border: 'none', borderRadius: 9, color: '#fff', padding: '12px 24px', fontWeight: 800, fontSize: 14, cursor: 'pointer', flexShrink: 0, minWidth: 100, opacity: loading ? .7 : 1 }}>
                {loading ? '...' : 'Verify'}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div style={{ background: result.success ? '#10B98111' : '#EF444411', border: `1px solid ${result.success ? '#10B98133' : '#EF444433'}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                {result.success ? (
                  <>
                    <div style={{ color: '#10B981', fontWeight: 800, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>✅</span> Valid Voucher — Ready to Use!
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                      {[
                        ['Plan',     result.data?.voucher?.plan?.name          || '—'],
                        ['Duration', result.data?.voucher?.plan?.validityLabel  || '—'],
                        ['Speed',    result.data?.voucher?.plan?.downloadSpeed  ? `${result.data.voucher.plan.downloadSpeed} Mbps` : '—'],
                        ['Status',   result.data?.voucher?.status               || '—'],
                        ['Data',     result.data?.voucher?.plan?.unlimited ? 'Unlimited' : result.data?.voucher?.plan?.dataLimit ? `${result.data.voucher.plan.dataLimit} MB` : '—'],
                        ['Expires',  result.data?.voucher?.expiresAt ? new Date(result.data.voucher.expiresAt).toLocaleDateString() : 'On first use'],
                      ].map(([l, v]) => (
                        <div key={l} style={{ background: '#12121E', borderRadius: 8, padding: '10px 13px' }}>
                          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {result.activated ? (
                      <div style={{ background: 'linear-gradient(135deg,#10B981,#059669)', borderRadius: 10, padding: '13px 20px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#fff' }}>
                        ✅ Session Active — You are Connected!
                      </div>
                    ) : (
                      <div style={{ background: `linear-gradient(135deg,${primary},${accent})`, borderRadius: 10, padding: '13px 20px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#fff', cursor: 'pointer' }}
                        onClick={checkCode}>
                        🌐 Connect Now →
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>❌</span>
                    <div>
                      <div style={{ color: '#EF4444', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Voucher Invalid</div>
                      <div style={{ color: '#94A3B8', fontSize: 13 }}>{result.message}</div>
                      <button onClick={() => setTab('buy')}
                        style={{ marginTop: 10, background: `linear-gradient(135deg,${primary},${secondary})`, border: 'none', borderRadius: 8, color: '#fff', padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        Buy a New Voucher →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Don't have a voucher? </span>
              <button onClick={() => setTab('buy')} style={{ background: 'none', border: 'none', color: primary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Buy one now →
              </button>
            </div>
          </div>
        )}

        {/* ── QR CODE TAB ───────────────────────────────────────────────── */}
        {tab === 'qr' && (
          <QRLoginBlock primary={primary} secondary={secondary} accent={accent} />
        )}

        {/* ── BUY VOUCHER TAB ───────────────────────────────────────────── */}
        {tab === 'buy' && (
          <div>
            {!selectedPlan ? (
              <>
                <p style={{ color: '#64748B', fontSize: 14, textAlign: 'center', marginTop: 0, marginBottom: 24 }}>
                  Pick a plan — payment is instant and secure
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14 }}>
                  {plans.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748B', padding: 24 }}>Loading plans...</div>
                  ) : plans.map((plan, i) => (
                    <div key={plan.id}
                      onClick={() => setSelPlan(plan)}
                      style={{
                        background: '#0A0A14', border: `2px solid ${i === 1 ? primary : '#2D2D3F'}`,
                        borderRadius: 14, padding: '20px 16px', cursor: 'pointer',
                        textAlign: 'center', transition: 'all .2s',
                        position: 'relative',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = i === 1 ? primary : '#2D2D3F'; e.currentTarget.style.transform = 'none'; }}>
                      {i === 1 && (
                        <div style={{ position: 'absolute', top: -1, right: -1, background: primary, color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: '0 12px 0 8px', textTransform: 'uppercase' }}>Popular</div>
                      )}
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{plan.name}</div>
                      <div style={{ color: '#64748B', fontSize: 11, marginBottom: 12 }}>{plan.validityLabel}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: primary, marginBottom: 8 }}>₦{Number(plan.price).toLocaleString()}</div>
                      <div style={{ color: '#94A3B8', fontSize: 11 }}>{plan.unlimited ? '∞ Unlimited' : `${plan.dataLimit}MB`} · {plan.downloadSpeed}Mbps</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ maxWidth: 560, margin: '0 auto' }}>
                {/* Selected plan header */}
                <div style={{ background: `${primary}11`, border: `1px solid ${primary}33`, borderRadius: 12, padding: '14px 18px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{selectedPlan.name}</div>
                    <div style={{ color: '#64748B', fontSize: 12 }}>{selectedPlan.validityLabel} · {selectedPlan.downloadSpeed}Mbps · {selectedPlan.unlimited ? 'Unlimited' : selectedPlan.dataLimit + 'MB'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: primary }}>₦{Number(selectedPlan.price).toLocaleString()}</div>
                    <button onClick={() => setSelPlan(null)}
                      style={{ background: '#2D2D3F', border: 'none', borderRadius: 7, color: '#94A3B8', padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      Change
                    </button>
                  </div>
                </div>

                {/* Contact fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={lbl}>Full Name *</label>
                    <input style={inp} value={buyForm.name} onChange={e => setBuyForm(f => ({ ...f, name: e.target.value }))} placeholder="Aminu Bello" />
                  </div>
                  <div>
                    <label style={lbl}>Email *</label>
                    <input type="email" style={inp} value={buyForm.email} onChange={e => setBuyForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label style={lbl}>Phone</label>
                    <input type="tel" style={inp} value={buyForm.phone} onChange={e => setBuyForm(f => ({ ...f, phone: e.target.value }))} placeholder="08012345678" />
                  </div>
                </div>

                {/* Payment method */}
                <div style={{ marginBottom: 18 }}>
                  <label style={lbl}>Payment Method</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[['PAYSTACK','💳 Paystack'],['FLUTTERWAVE','💸 Flutterwave']].map(([gw, label]) => (
                      <div key={gw} onClick={() => setGateway(gw)}
                        style={{
                          flex: 1, border: `2px solid ${gateway === gw ? primary : '#2D2D3F'}`,
                          borderRadius: 9, padding: '11px', textAlign: 'center', cursor: 'pointer',
                          background: gateway === gw ? primary + '22' : 'transparent',
                          fontWeight: 700, fontSize: 13,
                          color: gateway === gw ? '#fff' : '#64748B',
                          transition: 'all .15s',
                        }}>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={pay} disabled={paying}
                  style={{ width: '100%', background: `linear-gradient(135deg,${primary},${accent})`, border: 'none', borderRadius: 10, color: '#fff', padding: '14px', fontWeight: 900, fontSize: 16, cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? .7 : 1 }}>
                  {paying ? 'Redirecting to payment...' : `Pay ₦${Number(selectedPlan.price).toLocaleString()} →`}
                </button>
                <p style={{ color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 10 }}>🔒 Secured by {gateway} · SSL encrypted · Instant activation</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}


function VoucherEntry({ primary = '#6366F1' }) {
  const [code, setCode]       = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const [activated, setActivated] = useState(false);

  const check = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { toast.error('Please enter a voucher code'); return; }
    setLoading(true); setResult(null); setActivated(false);
    try {
      // Step 1: validate
      const validateRes = await publicFetch('/vouchers/validate', {
        method: 'POST', body: JSON.stringify({ code: trimmed }),
      }).then(r => r.json());

      if (!validateRes.success) {
        setResult(validateRes);
        toast.error(validateRes.message);
        return;
      }

      // Step 2: login — activates voucher (UNUSED → ACTIVE), starts timer
      const loginRes = await publicFetch('/hotspot/login', {
        method: 'POST', body: JSON.stringify({ code: trimmed }),
      }).then(r => r.json());

      if (loginRes.success) {
        const merged = {
          success: true,
          data: {
            voucher: {
              ...loginRes.data?.voucher,
              plan: loginRes.data?.voucher?.plan || validateRes.data?.voucher?.plan,
            }
          }
        };
        setResult(merged);
        setActivated(true);
        toast.success('Connected! Your session is now active.');
      } else {
        setResult(loginRes);
        toast.error(loginRes.message);
      }
    } catch { toast.error('Connection error. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="e.g. NW-ABCD1234"
          maxLength={20}
          style={{ flex: 1, background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '12px 16px', fontSize: 16, outline: 'none', fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' }}
        />
        <button onClick={check} disabled={loading}
          style={{ background: `linear-gradient(135deg,${primary},#8B5CF6)`, border: 'none', borderRadius: 8, color: '#fff', padding: '12px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer', minWidth: 90 }}>
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>

      {result && (
        <div style={{ background: result.success ? '#10B98111' : '#EF444411', border: `1px solid ${result.success ? '#10B98133' : '#EF444433'}`, borderRadius: 12, padding: 18, textAlign: 'left' }}>
          {result.success ? (
            <>
              <div style={{ color: '#10B981', fontWeight: 800, marginBottom: 10, fontSize: 15 }}>
                {activated ? '✅ Session Active — You are now connected!' : '✓ Valid Voucher'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Plan',    result.data?.voucher?.plan?.name      || '—'],
                  ['Duration',result.data?.voucher?.plan?.validityLabel || '—'],
                  ['Status',  result.data?.voucher?.status          || '—'],
                  ['Expires', result.data?.voucher?.expiresAt ? new Date(result.data.voucher.expiresAt).toLocaleDateString() : 'On first use'],
                ].map(([l,v]) => (
                  <div key={l} style={{ background: '#12121E', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <a href="/captive-portal" style={{ background: `linear-gradient(135deg,${primary},#8B5CF6)`, color: '#fff', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, display: 'inline-block' }}>
                  Connect Now →
                </a>
              </div>
            </>
          ) : (
            <div style={{ color: '#EF4444', fontWeight: 700, fontSize: 14 }}>
              ✗ {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BUY VOUCHER PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function BuyVoucher() {
  const navigate = useNavigate();
  const location = window.location;
  const [plans, setPlans]           = useState([]);
  const [selectedPlan, setSelected] = useState(null);
  const [step, setStep]             = useState(1);
  const [gateway, setGateway]       = useState('PAYSTACK');
  const [form, setForm]             = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading]       = useState(false);
  const [ispStatus, setIspStatus]   = useState(null); // null=checking, true=ok, false=down
  const [ispMessage, setIspMessage] = useState('');
  const settings = useSiteSettings();

  // Check ISP availability when page loads
  useEffect(() => {
    publicFetch('/routers/isp-status')
      .then(r => r.json())
      .then(r => {
        setIspStatus(r.available !== false);
        setIspMessage(r.message || '');
      })
      .catch(() => setIspStatus(true)); // if check fails, allow payment
  }, []);

  useEffect(() => {
    publicFetch('/plans').then(r => r.json()).then(r => {
      if (r.success) {
        const ps = r.data.plans || [];
        setPlans(ps);
        // Auto-select if planId passed via state
        const stateId = window.history.state?.usr?.planId;
        if (stateId) {
          const found = ps.find(p => p.id === stateId);
          if (found) { setSelected(found); setStep(2); }
        }
      }
    }).catch(() => {});
  }, []);

  const pay = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Please enter your name and email');
      return;
    }
    setLoading(true);
    try {
      const endpoint = gateway === 'PAYSTACK' ? '/payments/paystack/init' : '/payments/flutterwave/init';

      const res = await publicFetch(endpoint.replace('/api/v1', ''), { method: 'POST', body: JSON.stringify({ planId: selectedPlan.id, ...form }) }).then(r => r.json());

      if (res.success) {
        const url = res.data.authorizationUrl || res.data.paymentLink;
        if (url) window.location.href = url;
        else toast.error('No payment URL received');
      } else {
        toast.error(res.message || 'Payment initialization failed');
      }
    } catch { toast.error('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const primary   = settings.primary_color   || '#6366F1';
  const secondary = settings.secondary_color || '#8B5CF6';

  const inp = { width: '100%', background: '#0D0D1A', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '11px 13px', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const lbl = { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A14', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#F1F5F9', padding: '40px 5%' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link to="/" style={{ color: '#64748B', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 28 }}>← Back to Home</Link>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>Buy Internet Voucher</h1>
        <p style={{ color: '#64748B', marginBottom: 20, fontSize: 14 }}>Select a plan, pay securely, and connect instantly</p>

        {/* ISP Status Banner */}
        {ispStatus === null && (
          <div style={{ background: '#6366F111', border: '1px solid #6366F133', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <div style={{ width: 14, height: 14, border: '2px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ color: '#94A3B8' }}>Checking internet availability...</span>
          </div>
        )}
        {ispStatus === false && (
          <div style={{ background: '#EF444411', border: '1px solid #EF444444', borderRadius: 12, padding: '18px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <strong style={{ color: '#EF4444', fontSize: 15 }}>Service Temporarily Unavailable</strong>
            </div>
            <p style={{ color: '#94A3B8', margin: 0, fontSize: 13 }}>
              {ispMessage || 'Internet service is temporarily unavailable. Please try again later.'}
            </p>
            <p style={{ color: '#64748B', margin: '8px 0 0', fontSize: 11 }}>
              Payment has been disabled until service is restored. Please contact support if this persists.
            </p>
          </div>
        )}
        {ispStatus === true && (
          <div style={{ background: '#10B98111', border: '1px solid #10B98133', borderRadius: 8, padding: '8px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span>✅</span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>Internet service is available — you can proceed with purchase</span>
          </div>
        )}

        {/* Step 1: Plan Selection */}
        {step === 1 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#94A3B8' }}>Step 1 — Choose a Plan</h3>
            {plans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>Loading plans...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
                {plans.map((plan, i) => (
                  <div key={plan.id}
                    onClick={() => { setSelected(plan); setStep(2); }}
                    style={{ background: '#12121E', border: `2px solid ${i === 1 ? primary : '#2D2D3F'}`, borderRadius: 14, padding: 22, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = i === 1 ? primary : '#2D2D3F'}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{plan.name}</div>
                    <div style={{ color: '#64748B', fontSize: 12, marginBottom: 14 }}>{plan.validityLabel}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: primary, marginBottom: 14 }}>₦{Number(plan.price).toLocaleString()}</div>
                    <div style={{ color: '#94A3B8', fontSize: 12 }}>
                      ⬇️ {plan.downloadSpeed}Mbps · {plan.unlimited ? '∞ Unlimited' : plan.dataLimit + 'MB'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 2: Details + Pay */}
        {step === 2 && selectedPlan && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>
            {/* Left: form */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#94A3B8' }}>Step 2 — Your Details</h3>
              <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, padding: 24 }}>
                {[['Full Name *','name','text','Aminu Bello'],['Email Address *','email','email','you@example.com'],['Phone Number','phone','tel','08012345678']].map(([l,k,t,ph]) => (
                  <div key={k} style={{ marginBottom: 16 }}>
                    <label style={lbl}>{l}</label>
                    <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={inp} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: summary */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#94A3B8' }}>Step 3 — Confirm & Pay</h3>
              <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, padding: 24 }}>
                {/* Plan summary */}
                <div style={{ background: primary + '11', border: `1px solid ${primary}33`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 17 }}>{selectedPlan.name}</div>
                      <div style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
                        {selectedPlan.validityLabel} · {selectedPlan.downloadSpeed}Mbps
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                        {selectedPlan.unlimited ? 'Unlimited data' : `${selectedPlan.dataLimit}MB data`}
                      </div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: primary }}>
                      ₦{Number(selectedPlan.price).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Gateway */}
                <div style={{ marginBottom: 20 }}>
                  <label style={lbl}>Payment Method</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[['PAYSTACK','💳 Paystack'],['FLUTTERWAVE','💸 Flutterwave']].map(([gw,label]) => (
                      <div key={gw} onClick={() => setGateway(gw)}
                        style={{ flex: 1, border: `2px solid ${gateway === gw ? primary : '#2D2D3F'}`, borderRadius: 9, padding: '11px', textAlign: 'center', cursor: 'pointer', background: gateway === gw ? primary + '22' : 'transparent', fontWeight: 700, fontSize: 13, color: gateway === gw ? '#fff' : '#64748B', transition: 'all 0.15s' }}>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep(1)}
                    style={{ background: '#2D2D3F', border: 'none', borderRadius: 8, color: '#94A3B8', padding: '12px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    ← Back
                  </button>
                  <button onClick={pay} disabled={loading}
                    style={{ flex: 1, background: `linear-gradient(135deg,${primary},${secondary})`, border: 'none', borderRadius: 8, color: '#fff', padding: '12px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Redirecting to payment...' : `Pay ₦${Number(selectedPlan.price).toLocaleString()}`}
                  </button>
                </div>
                <p style={{ color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 12 }}>🔒 Secured by {gateway} · SSL encrypted</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT VERIFY
// ══════════════════════════════════════════════════════════════════════════════
export function PaymentVerify({ gateway }) {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const [status, setStatus]   = useState('verifying');
  const [voucher, setVoucher] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        let res;
        if (gateway === 'flutterwave') {
          const txId  = params.get('transaction_id');
          const txRef = params.get('tx_ref');
          res = await publicFetch(`/payments/flutterwave/verify?transaction_id=${txId}&tx_ref=${txRef}`).then(r => r.json());
        } else {
          const ref = params.get('reference');
          if (!ref) { setStatus('failed'); return; }
          res = await publicFetch(`/payments/paystack/verify/${ref}`).then(r => r.json());
        }
        if (res.success) { setVoucher(res.data.voucher); setStatus('success'); }
        else setStatus('failed');
      } catch { setStatus('failed'); }
    };
    verify();
  }, [params, gateway]);

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter','Segoe UI',sans-serif", padding: 20 }}>
      <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 20, padding: 40, width: '100%', maxWidth: 460, textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ color: '#F1F5F9', margin: '0 0 8px' }}>Verifying Payment...</h2>
            <p style={{ color: '#64748B' }}>Please wait, do not close this page</p>
          </>
        )}
        {status === 'success' && voucher && (
          <>
            {/* Auto-login success state */}
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#10B98122,#6366F122)', border: '3px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36 }}>🌐</div>
            <h2 style={{ color: '#10B981', margin: '0 0 6px', fontSize: 24, fontWeight: 900 }}>You're Connected!</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
              Payment successful. Your internet session has been <strong style={{ color: '#10B981' }}>automatically activated</strong>.
            </p>

            {/* Session info card */}
            <div style={{ background: 'linear-gradient(135deg,#10B98111,#6366F111)', border: '1px solid #10B98133', borderRadius: 14, padding: 20, marginBottom: 20, textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Plan',     voucher.plan?.name          || '—'],
                  ['Duration', voucher.plan?.validityLabel  || '—'],
                  ['Speed',    voucher.plan?.downloadSpeed  ? `${voucher.plan.downloadSpeed}/${voucher.plan.uploadSpeed} Mbps` : '—'],
                  ['Data',     voucher.plan?.unlimited ? 'Unlimited' : voucher.plan?.dataLimit ? `${voucher.plan.dataLimit}MB` : '—'],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '10px 13px' }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voucher code (for reference) */}
            <div style={{ background: '#0D0D1A', border: '1px dashed #334155', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Your Voucher Code (keep for reference)</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 900, color: '#A5B4FC', letterSpacing: 3 }}>{voucher.code}</div>
                <button onClick={() => { navigator.clipboard?.writeText(voucher.code); toast.success('Code copied!'); }}
                  style={{ background: '#2D2D3F', border: 'none', borderRadius: 6, color: '#94A3B8', padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                  📋 Copy
                </button>
              </div>
              <div style={{ color: '#64748B', fontSize: 11, marginTop: 6 }}>
                ✉️ Also sent to your email · Session expires: {voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleString() : 'Check your plan duration'}
              </div>
            </div>

            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20, background: '#6366F111', border: '1px solid #6366F133', borderRadius: 8, padding: '10px 14px' }}>
              💡 <strong style={{ color: '#A5B4FC' }}>Already connected!</strong> You can start browsing now. If you are not yet on the hotspot Wi-Fi, connect and your session will be recognized automatically.
            </p>

            <button onClick={() => navigate('/')}
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', padding: '12px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              🏠 Back to Home
            </button>
          </>
        )}
        {status === 'failed' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#EF4444', margin: '0 0 8px' }}>Payment Failed</h2>
            <p style={{ color: '#64748B', marginBottom: 24 }}>We could not confirm your payment. Please try again or contact support.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => navigate('/buy')}
                style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', padding: '11px 22px', fontWeight: 700, cursor: 'pointer' }}>
                Try Again
              </button>
              <Link to="/legal/contact" style={{ background: '#2D2D3F', borderRadius: 8, color: '#94A3B8', padding: '11px 22px', fontWeight: 700, fontSize: 14, display: 'inline-block' }}>
                Contact Support
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LEGAL PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function LegalPage() {
  const slug = window.location.pathname.split('/legal/')[1];
  const [page, setPage]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    publicFetch(`/legal/${slug}`)
      .then(r => r.json())
      .then(r => { if (r.success) setPage(r.data.page); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A14', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#F1F5F9', padding: '60px 5%' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link to="/" style={{ color: '#64748B', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 28, textDecoration: 'none' }}>← Back</Link>
        {loading ? (
          <div style={{ color: '#64748B' }}>Loading...</div>
        ) : page ? (
          <>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>{page.title}</h1>
            <div style={{ color: '#64748B', fontSize: 12, marginBottom: 32 }}>Last updated: {new Date().toLocaleDateString()}</div>
            <div style={{ color: '#94A3B8', lineHeight: 1.8, fontSize: 15 }} dangerouslySetInnerHTML={{ __html: page.content }} />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
            <p>Page not found. <Link to="/" style={{ color: '#6366F1' }}>Go Home</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
