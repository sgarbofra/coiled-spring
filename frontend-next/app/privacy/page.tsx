'use client'

/**
 * /privacy — Privacy Policy
 * Coiled Spring Terminal
 *
 * Redatta ai sensi del Regolamento UE 2016/679 (GDPR).
 *
 * TODO prima di andare in produzione:
 *   - Sostituire [TUO_NOME_O_RAGIONE_SOCIALE] con i dati reali del titolare
 *   - Sostituire privacy@coiledspring.io con l'email privacy reale
 *   - Verificare che i servizi terzi elencati siano effettivamente quelli in uso
 *   - Far revisionare da un professionista legale prima della pubblicazione
 */

const c = {
  bg: '#000000',
  card: '#080a0e',
  border: '#1c1c1c',
  orange: '#e87722',
  green: '#00CC44',
  textPrimary: '#f0f2f5',
  textSecondary: '#8892a0',
  textMuted: '#444',
  link: '#e87722',
}

const mono = "'JetBrains Mono', 'Courier New', monospace"
const sans = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

const LAST_UPDATED = 'August 1, 2026'
const CONTROLLER_NAME = 'Coiled Spring Strategy'
const CONTROLLER_EMAIL = 'privacy@coiledspring.io' // ← SOSTITUIRE con la tua email privacy prima del go-live
const CONTROLLER_COUNTRY = 'Italy'
const SUPERVISORY_AUTHORITY = 'Garante per la protezione dei dati personali'
const SUPERVISORY_URL = 'https://www.garanteprivacy.it'

type Section = {
  id: string
  title: string
  content: React.ReactNode
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: mono,
      fontSize: '0.8rem',
      fontWeight: '700',
      color: c.orange,
      letterSpacing: '2px',
      textTransform: 'uppercase',
      marginBottom: '1rem',
      marginTop: '0',
      paddingBottom: '0.5rem',
      borderBottom: `1px solid ${c.border}`,
    }}>
      {children}
    </h2>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: sans,
      fontSize: '0.9rem',
      color: c.textSecondary,
      lineHeight: '1.75',
      marginBottom: '0.875rem',
      marginTop: 0,
    }}>
      {children}
    </p>
  )
}

function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '0 0 0.875rem 0', paddingLeft: '1.5rem' }}>
      {items.map((item, i) => (
        <li key={i} style={{
          fontFamily: sans,
          fontSize: '0.9rem',
          color: c.textSecondary,
          lineHeight: '1.75',
          marginBottom: '0.25rem',
        }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontFamily: mono,
      fontSize: '0.6rem',
      fontWeight: '700',
      letterSpacing: '1.5px',
      color: color,
      border: `1px solid ${color}`,
      padding: '2px 6px',
      borderRadius: '2px',
      marginLeft: '0.75rem',
      verticalAlign: 'middle',
    }}>
      {text}
    </span>
  )
}

function LegalBadge({ article, text }: { article: string; text: string }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.35rem 0.75rem',
      border: `1px solid #1c2a1c`,
      background: 'rgba(0,204,68,0.04)',
      borderRadius: '2px',
      marginBottom: '0.5rem',
      marginRight: '0.5rem',
    }}>
      <span style={{ fontFamily: mono, fontSize: '0.62rem', color: c.green, fontWeight: '700' }}>{article}</span>
      <span style={{ fontFamily: sans, fontSize: '0.78rem', color: c.textSecondary }}>{text}</span>
    </div>
  )
}

export default function PrivacyPage() {
  const sections: Section[] = [
    {
      id: 'controller',
      title: '1. Data Controller',
      content: (
        <>
          <P>
            The data controller for the processing of your personal data through the Coiled Spring Terminal
            platform (&quot;the Service&quot;) is:
          </P>
          <div style={{
            padding: '1rem',
            border: `1px solid ${c.border}`,
            background: 'rgba(232,119,34,0.04)',
            borderLeft: `3px solid ${c.orange}`,
            marginBottom: '1rem',
            borderRadius: '0 2px 2px 0',
          }}>
            <p style={{ fontFamily: mono, fontSize: '0.82rem', color: c.textPrimary, margin: 0, lineHeight: '2' }}>
              <strong>{CONTROLLER_NAME}</strong><br />
              {CONTROLLER_COUNTRY}<br />
              Email: <a href={`mailto:${CONTROLLER_EMAIL}`} style={{ color: c.link, textDecoration: 'none' }}>{CONTROLLER_EMAIL}</a>
            </p>
          </div>
          <P>
            For any question relating to the processing of your personal data, or to exercise the rights
            listed in Section 8, please write to the email address above.
          </P>
        </>
      ),
    },
    {
      id: 'data-collected',
      title: '2. Personal Data We Collect',
      content: (
        <>
          <P>We collect the following categories of personal data:</P>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontFamily: mono, fontSize: '0.68rem', color: c.orange, marginBottom: '0.4rem', marginTop: 0 }}>
              ACCOUNT &amp; IDENTITY DATA
            </p>
            <UL items={[
              'Email address (mandatory for registration)',
              'Password (stored as a one-way bcrypt hash — we cannot recover it)',
              'Google Account ID and verified email (only when you register via Google OAuth)',
              'Date and time of registration',
              'Privacy policy acceptance timestamp',
            ]} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontFamily: mono, fontSize: '0.68rem', color: c.orange, marginBottom: '0.4rem', marginTop: 0 }}>
              SERVICE USAGE DATA
            </p>
            <UL items={[
              'Watchlists and tickers you save',
              'Portfolio trades and positions you record',
              'Broker configuration (stored encrypted at rest)',
              'AI query count per day',
              'User-generated notes',
              'Subscription plan (free / pro)',
            ]} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontFamily: mono, fontSize: '0.68rem', color: c.orange, marginBottom: '0.4rem', marginTop: 0 }}>
              TECHNICAL DATA
            </p>
            <UL items={[
              'IP address (collected by the web server for rate limiting and abuse prevention)',
              'HTTP request logs (method, path, timestamp, status code)',
              'Session tokens (stored as httpOnly cookies, not accessible by JavaScript)',
            ]} />
          </div>

          <P>
            We do <strong style={{ color: c.textPrimary }}>not</strong> collect: payment card numbers,
            bank account details, government-issued IDs, biometric data, or data relating to minors.
            The Service is intended for adults only.
          </P>
        </>
      ),
    },
    {
      id: 'purposes',
      title: '3. Purposes and Legal Basis for Processing',
      content: (
        <>
          <P>
            We process your personal data only for the purposes listed below. Each purpose is grounded
            in a specific legal basis under Article 6 of the GDPR.
          </P>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>

            <div style={{ padding: '0.875rem', border: `1px solid ${c.border}`, borderRadius: '2px' }}>
              <p style={{ fontFamily: mono, fontSize: '0.7rem', color: c.textPrimary, fontWeight: '700', margin: '0 0 0.4rem 0' }}>
                Account creation and authentication
              </p>
              <LegalBadge article="Art. 6(1)(b)" text="Performance of a contract" />
              <P>Creating your account, authenticating you via email/password or Google OAuth, maintaining your session, and providing access to the platform features you subscribed to.</P>
            </div>

            <div style={{ padding: '0.875rem', border: `1px solid ${c.border}`, borderRadius: '2px' }}>
              <p style={{ fontFamily: mono, fontSize: '0.7rem', color: c.textPrimary, fontWeight: '700', margin: '0 0 0.4rem 0' }}>
                Provision of the Service
              </p>
              <LegalBadge article="Art. 6(1)(b)" text="Performance of a contract" />
              <P>Storing and processing your watchlists, portfolios, trades, notes, and scanner results so that you can use the platform as intended.</P>
            </div>

            <div style={{ padding: '0.875rem', border: `1px solid ${c.border}`, borderRadius: '2px' }}>
              <p style={{ fontFamily: mono, fontSize: '0.7rem', color: c.textPrimary, fontWeight: '700', margin: '0 0 0.4rem 0' }}>
                Transactional communications
              </p>
              <LegalBadge article="Art. 6(1)(b)" text="Performance of a contract" />
              <P>Sending email verification messages, password reset emails, and welcome emails. These are service emails, not marketing — you cannot opt out of them while maintaining an active account.</P>
            </div>

            <div style={{ padding: '0.875rem', border: `1px solid ${c.border}`, borderRadius: '2px' }}>
              <p style={{ fontFamily: mono, fontSize: '0.7rem', color: c.textPrimary, fontWeight: '700', margin: '0 0 0.4rem 0' }}>
                Security, abuse prevention, and rate limiting
              </p>
              <LegalBadge article="Art. 6(1)(f)" text="Legitimate interests" />
              <P>Using IP addresses and request logs to prevent brute-force attacks, abuse of the API, and to maintain the integrity and availability of the Service. Our legitimate interest is the security of the platform and its users.</P>
            </div>

            <div style={{ padding: '0.875rem', border: `1px solid ${c.border}`, borderRadius: '2px' }}>
              <p style={{ fontFamily: mono, fontSize: '0.7rem', color: c.textPrimary, fontWeight: '700', margin: '0 0 0.4rem 0' }}>
                GDPR compliance record-keeping
              </p>
              <LegalBadge article="Art. 6(1)(c)" text="Legal obligation" />
              <P>Recording the timestamp of your consent to this Privacy Policy (privacy_accepted_at) as required by Article 7(1) GDPR, so that we can demonstrate that consent was freely given, specific, informed, and unambiguous.</P>
            </div>

          </div>

          <P>
            We do <strong style={{ color: c.textPrimary }}>not</strong> use your data for automated
            profiling, algorithmic scoring, or any form of automated decision-making that produces
            legal or similarly significant effects on you.
          </P>
        </>
      ),
    },
    {
      id: 'retention',
      title: '4. Data Retention',
      content: (
        <>
          <P>We retain your personal data for no longer than necessary for the purposes described above:</P>
          <UL items={[
            'Account data (email, password hash, plan): retained for as long as your account is active, plus 30 days after deletion to allow for recovery requests.',
            'Usage data (watchlists, portfolios, notes): deleted within 30 days of account deletion.',
            'Technical logs (IP addresses, HTTP logs): retained for a maximum of 90 days for security purposes.',
            'Privacy consent record (privacy_accepted_at): retained for the duration required by applicable law to demonstrate compliance — typically the duration of the contractual relationship plus the applicable statute of limitations.',
            'Password reset tokens: expire after 1 hour and are removed from the database upon use or expiry.',
          ]} />
          <P>
            When the retention period expires, or when you request deletion of your account, your
            personal data is permanently deleted from our databases. Backups are purged on their
            normal rotation schedule (maximum 30 days after the backup was created).
          </P>
        </>
      ),
    },
    {
      id: 'third-parties',
      title: '5. Third Parties and Data Processors',
      content: (
        <>
          <P>
            We share your data with the following categories of third-party service providers acting
            as data processors on our behalf. Each processor has entered into a data processing
            agreement with us and provides sufficient guarantees under Article 28 GDPR.
          </P>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              {
                name: 'Google LLC',
                role: 'OAuth 2.0 authentication provider',
                data: 'Your Google Account ID and verified email address, exchanged during the OAuth flow.',
                location: 'USA (adequacy decision / Standard Contractual Clauses)',
                privacy: 'https://policies.google.com/privacy',
              },
              {
                name: 'Railway / Hosting Provider',
                role: 'Cloud infrastructure and database hosting',
                data: 'All data stored in the application database, application logs.',
                location: 'USA (Standard Contractual Clauses)',
                privacy: 'https://railway.app/legal/privacy',
              },
              {
                name: 'Email delivery service',
                role: 'Transactional email delivery (verification, welcome, password reset)',
                data: 'Recipient email address, email subject and body.',
                location: 'EU or USA depending on provider',
                privacy: 'See provider documentation',
              },
            ].map((p, i) => (
              <div key={i} style={{ padding: '0.875rem', border: `1px solid ${c.border}`, borderRadius: '2px' }}>
                <p style={{ fontFamily: mono, fontSize: '0.7rem', color: c.textPrimary, fontWeight: '700', margin: '0 0 0.35rem 0' }}>
                  {p.name}
                </p>
                <p style={{ fontFamily: sans, fontSize: '0.82rem', color: c.textSecondary, margin: '0 0 0.25rem 0' }}>
                  <strong style={{ color: '#aaa' }}>Role:</strong> {p.role}
                </p>
                <p style={{ fontFamily: sans, fontSize: '0.82rem', color: c.textSecondary, margin: '0 0 0.25rem 0' }}>
                  <strong style={{ color: '#aaa' }}>Data shared:</strong> {p.data}
                </p>
                <p style={{ fontFamily: sans, fontSize: '0.82rem', color: c.textSecondary, margin: '0 0 0.25rem 0' }}>
                  <strong style={{ color: '#aaa' }}>Location:</strong> {p.location}
                </p>
                <p style={{ fontFamily: sans, fontSize: '0.82rem', color: c.textSecondary, margin: 0 }}>
                  <strong style={{ color: '#aaa' }}>Privacy policy:</strong>{' '}
                  <a href={p.privacy} target="_blank" rel="noopener noreferrer"
                    style={{ color: c.link, textDecoration: 'none' }}>{p.privacy}</a>
                </p>
              </div>
            ))}
          </div>

          <P>
            We do <strong style={{ color: c.textPrimary }}>not</strong> sell, rent, or trade your
            personal data to any third party for marketing or advertising purposes.
          </P>
        </>
      ),
    },
    {
      id: 'international-transfers',
      title: '6. International Data Transfers',
      content: (
        <>
          <P>
            Some of our data processors are located outside the European Economic Area (EEA),
            in particular in the United States. Where we transfer personal data to countries not
            providing an adequate level of protection as determined by the European Commission, we
            rely on one or more of the following safeguards:
          </P>
          <UL items={[
            'Standard Contractual Clauses (SCCs) approved by the European Commission under Article 46(2)(c) GDPR.',
            'The EU-U.S. Data Privacy Framework where applicable.',
          ]} />
          <P>
            You may request a copy of the transfer safeguards in place by contacting us at{' '}
            <a href={`mailto:${CONTROLLER_EMAIL}`} style={{ color: c.link, textDecoration: 'none' }}>
              {CONTROLLER_EMAIL}
            </a>.
          </P>
        </>
      ),
    },
    {
      id: 'cookies',
      title: '7. Cookies and Session Tokens',
      content: (
        <>
          <P>We use a single first-party cookie:</P>
          <div style={{ padding: '0.875rem', border: `1px solid ${c.border}`, borderRadius: '2px', marginBottom: '1rem' }}>
            <p style={{ fontFamily: mono, fontSize: '0.7rem', color: c.textPrimary, fontWeight: '700', margin: '0 0 0.35rem 0' }}>
              cs_token — Authentication session cookie
            </p>
            <UL items={[
              'Type: HttpOnly, Secure, SameSite=Lax',
              'Duration: 7 days (session)',
              'Purpose: Authenticates you with the Coiled Spring backend. Contains a signed JWT with your user ID.',
              'Accessible to JavaScript: No (HttpOnly flag prevents XSS access)',
              'Third-party: No — set exclusively by coiledspring.io',
            ]} />
          </div>
          <P>
            We do <strong style={{ color: c.textPrimary }}>not</strong> use tracking cookies,
            advertising cookies, analytics cookies (Google Analytics, Mixpanel, etc.), or any
            third-party cookies. The Service is ad-free and does not engage in behavioural tracking.
          </P>
          <P>
            The cs_token cookie is strictly necessary for the Service to function. It is set only
            after you successfully log in and is deleted when you log out. No cookie banner is
            legally required for strictly necessary cookies under Directive 2002/58/EC (ePrivacy).
          </P>
        </>
      ),
    },
    {
      id: 'rights',
      title: '8. Your Rights Under the GDPR',
      content: (
        <>
          <P>
            As a data subject under the GDPR, you have the following rights. You may exercise any
            of them by contacting us at{' '}
            <a href={`mailto:${CONTROLLER_EMAIL}`} style={{ color: c.link, textDecoration: 'none' }}>
              {CONTROLLER_EMAIL}
            </a>. We will respond within 30 days as required by Article 12(3) GDPR.
          </P>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { right: 'Right of Access (Art. 15)', desc: 'You may request a copy of all personal data we hold about you and information on how it is processed.' },
              { right: 'Right to Rectification (Art. 16)', desc: 'You may request correction of inaccurate or incomplete personal data. Most account data can be corrected directly in your account settings.' },
              { right: 'Right to Erasure / "Right to be Forgotten" (Art. 17)', desc: 'You may request deletion of your account and all associated personal data. We will process erasure requests within 30 days. Certain data may be retained for legal compliance (e.g., consent records).' },
              { right: 'Right to Restriction of Processing (Art. 18)', desc: 'You may request that we restrict processing of your data in certain circumstances (e.g., while you contest the accuracy of data).' },
              { right: 'Right to Data Portability (Art. 20)', desc: 'You may request a machine-readable export of your personal data that you provided to us (account information, watchlists, portfolios).' },
              { right: 'Right to Object (Art. 21)', desc: 'You may object to processing based on legitimate interests (Art. 6(1)(f)), including for security logging. We will cease processing unless we can demonstrate compelling legitimate grounds.' },
              { right: 'Right to Withdraw Consent (Art. 7(3))', desc: 'Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing. Note: withdrawal of consent to this Privacy Policy results in account deletion, as consent is necessary for the provision of the Service.' },
              { right: 'Right to Lodge a Complaint (Art. 77)', desc: `You have the right to lodge a complaint with the supervisory authority in your country of residence. In Italy, this is the ${SUPERVISORY_AUTHORITY} (${SUPERVISORY_URL}). In other EU/EEA member states, contact your national data protection authority.` },
            ].map((r, i) => (
              <div key={i} style={{ padding: '0.75rem', border: `1px solid ${c.border}`, borderRadius: '2px', display: 'flex', gap: '0.75rem' }}>
                <span style={{ color: c.green, fontFamily: mono, fontSize: '0.8rem', flexShrink: 0, marginTop: '1px' }}>✓</span>
                <div>
                  <p style={{ fontFamily: mono, fontSize: '0.68rem', color: c.orange, fontWeight: '700', margin: '0 0 0.25rem 0' }}>{r.right}</p>
                  <p style={{ fontFamily: sans, fontSize: '0.85rem', color: c.textSecondary, margin: 0, lineHeight: '1.6' }}>{r.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <P>
            We will never ask you to pay a fee to exercise your rights, and will not discriminate
            against you for exercising them.
          </P>
        </>
      ),
    },
    {
      id: 'security',
      title: '9. Security Measures',
      content: (
        <>
          <P>We implement the following technical and organisational measures (TOMs) to protect your data:</P>
          <UL items={[
            'Passwords hashed with bcrypt (cost factor 10) — irreversible, not recoverable',
            'Session tokens signed with HS256 JWT, transmitted only over HTTPS',
            'Authentication cookies set with HttpOnly, Secure, and SameSite=Lax flags',
            'Rate limiting on authentication endpoints to prevent brute-force attacks',
            'API keys (BYOK) encrypted at rest using AES encryption before storage',
            'Database access restricted to application layer — no direct public access',
            'No sensitive data (API keys, credentials) stored in logs or client-side storage',
          ]} />
          <P>
            In the event of a personal data breach that is likely to result in a risk to your rights
            and freedoms, we will notify the competent supervisory authority within 72 hours of
            becoming aware (Art. 33 GDPR) and will notify you without undue delay where required
            by Article 34 GDPR.
          </P>
        </>
      ),
    },
    {
      id: 'minors',
      title: '10. Minors',
      content: (
        <>
          <P>
            The Service is intended exclusively for adults (18 years of age or older). We do not
            knowingly collect personal data from minors. If we become aware that we have
            inadvertently collected data from a minor, we will delete it immediately upon notification.
            If you believe a minor has registered, please contact us at{' '}
            <a href={`mailto:${CONTROLLER_EMAIL}`} style={{ color: c.link, textDecoration: 'none' }}>
              {CONTROLLER_EMAIL}
            </a>.
          </P>
        </>
      ),
    },
    {
      id: 'changes',
      title: '11. Changes to This Policy',
      content: (
        <>
          <P>
            We may update this Privacy Policy from time to time to reflect changes in our practices,
            the Services we offer, or applicable law. We will notify you of material changes by:
          </P>
          <UL items={[
            'Sending an email to your registered address at least 14 days before the changes take effect.',
            'Displaying a prominent notice in the application.',
            'Updating the "Last Updated" date at the top of this page.',
          ]} />
          <P>
            Your continued use of the Service after the effective date of the updated Policy
            constitutes acceptance of the new terms. If you do not agree, you must stop using
            the Service and may request deletion of your account.
          </P>
        </>
      ),
    },
    {
      id: 'contact',
      title: '12. Contact',
      content: (
        <>
          <P>
            For any question, request, or complaint regarding the processing of your personal data,
            please contact the Data Controller:
          </P>
          <div style={{
            padding: '1rem',
            border: `1px solid ${c.border}`,
            background: 'rgba(232,119,34,0.04)',
            borderLeft: `3px solid ${c.orange}`,
            borderRadius: '0 2px 2px 0',
            marginBottom: '1rem',
          }}>
            <p style={{ fontFamily: mono, fontSize: '0.82rem', color: c.textPrimary, margin: 0, lineHeight: '2.2' }}>
              {CONTROLLER_NAME}<br />
              <a href={`mailto:${CONTROLLER_EMAIL}`} style={{ color: c.link, textDecoration: 'none' }}>
                {CONTROLLER_EMAIL}
              </a>
            </p>
          </div>
          <P>
            If you are not satisfied with our response, you have the right to lodge a complaint
            with the{' '}
            <a href={SUPERVISORY_URL} target="_blank" rel="noopener noreferrer" style={{ color: c.link, textDecoration: 'none' }}>
              {SUPERVISORY_AUTHORITY}
            </a>
            {' '}(Italy) or with the supervisory authority of your country of habitual residence.
          </P>
        </>
      ),
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #333; }
        .toc-link { color: #8892a0; text-decoration: none; transition: color 0.15s; font-family: ${mono}; font-size: 0.7rem; line-height: 2; display: block; }
        .toc-link:hover { color: #e87722; }
        a { transition: opacity 0.15s; }
        a:hover { opacity: 0.8; }
      `}</style>

      <div style={{
        backgroundColor: c.bg,
        minHeight: '100vh',
        fontFamily: sans,
        padding: '0',
      }}>

        {/* Subtle grid */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(232,119,34,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(232,119,34,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          zIndex: 0,
        }} />

        {/* Header */}
        <div style={{
          borderBottom: `1px solid ${c.border}`,
          padding: '1.5rem 2rem',
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <a href="/" style={{ fontFamily: mono, fontSize: '0.8rem', fontWeight: '700', color: c.orange, textDecoration: 'none', letterSpacing: '2px' }}>
              COILED SPRING
            </a>
            <span style={{ color: c.textMuted, fontFamily: mono, fontSize: '0.7rem' }}>/</span>
            <span style={{ fontFamily: mono, fontSize: '0.7rem', color: c.textMuted, letterSpacing: '1px' }}>PRIVACY POLICY</span>
          </div>
          <a href="/login" style={{
            fontFamily: mono, fontSize: '0.7rem', color: c.textMuted,
            textDecoration: 'none', letterSpacing: '0.5px',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = c.orange)}
            onMouseLeave={e => (e.currentTarget.style.color = c.textMuted)}>
            ← Back to app
          </a>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem', position: 'relative', zIndex: 1, display: 'flex', gap: '3rem', alignItems: 'flex-start' }}>

          {/* Sidebar TOC */}
          <nav style={{
            width: '220px', flexShrink: 0,
            position: 'sticky', top: '5rem',
            display: 'none',  /* hidden on mobile — shown via @media in a real implementation */
          }} aria-label="Table of contents">
            <p style={{ fontFamily: mono, fontSize: '0.62rem', color: c.textMuted, letterSpacing: '2px', marginBottom: '0.75rem' }}>SECTIONS</p>
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`} className="toc-link">{s.title}</a>
            ))}
          </nav>

          {/* Main content */}
          <main style={{ flex: 1, minWidth: 0 }}>

            {/* Hero */}
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: c.green }} />
                <span style={{ fontFamily: mono, fontSize: '0.62rem', color: c.green, letterSpacing: '2px' }}>GDPR COMPLIANT</span>
                <Tag text="Reg. UE 2016/679" color={c.green} />
              </div>
              <h1 style={{
                fontFamily: mono, fontSize: '1.75rem', fontWeight: '700',
                color: c.textPrimary, letterSpacing: '1px', marginBottom: '0.75rem',
              }}>
                Privacy Policy
              </h1>
              <p style={{ fontFamily: sans, fontSize: '0.9rem', color: c.textSecondary, lineHeight: '1.7', maxWidth: '600px' }}>
                This document explains how <strong style={{ color: c.textPrimary }}>{CONTROLLER_NAME}</strong> collects,
                uses, stores, and protects your personal data when you use the Coiled Spring Terminal
                platform, in compliance with the EU General Data Protection Regulation (GDPR —
                Regulation 2016/679).
              </p>
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: mono, fontSize: '0.65rem', color: c.textMuted }}>
                  Last updated: <span style={{ color: c.textSecondary }}>{LAST_UPDATED}</span>
                </span>
                <span style={{ fontFamily: mono, fontSize: '0.65rem', color: c.textMuted }}>
                  Language: <span style={{ color: c.textSecondary }}>English</span>
                </span>
                <span style={{ fontFamily: mono, fontSize: '0.65rem', color: c.textMuted }}>
                  Supervisory authority:{' '}
                  <a href={SUPERVISORY_URL} target="_blank" rel="noopener noreferrer"
                    style={{ color: c.link, textDecoration: 'none' }}>
                    {SUPERVISORY_AUTHORITY}
                  </a>
                </span>
              </div>
            </div>

            {/* Summary box */}
            <div style={{
              padding: '1.25rem 1.5rem',
              border: `1px solid #1a2a1a`,
              borderLeft: `3px solid ${c.green}`,
              background: 'rgba(0,204,68,0.04)',
              borderRadius: '0 2px 2px 0',
              marginBottom: '3rem',
            }}>
              <p style={{ fontFamily: mono, fontSize: '0.65rem', color: c.green, letterSpacing: '2px', marginBottom: '0.75rem' }}>TL;DR — THE SHORT VERSION</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[
                  'We collect only what is necessary to run the Service (email, password hash, usage data).',
                  'We do not sell your data, show you ads, or share your data with anyone except infrastructure providers.',
                  'We use a single session cookie (cs_token) — no tracking or analytics cookies.',
                  'You can request access, correction, or deletion of your data at any time.',
                  'We store your data on servers located primarily in the USA, under Standard Contractual Clauses.',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ color: c.green, fontFamily: mono, fontSize: '0.8rem', flexShrink: 0 }}>✓</span>
                    <span style={{ fontFamily: sans, fontSize: '0.85rem', color: c.textSecondary, lineHeight: '1.5' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {sections.map(section => (
                <section key={section.id} id={section.id} style={{
                  padding: '1.75rem',
                  background: c.card,
                  border: `1px solid ${c.border}`,
                  borderTop: `2px solid ${c.border}`,
                  borderRadius: '2px',
                  scrollMarginTop: '6rem',
                }}>
                  <H2>{section.title}</H2>
                  {section.content}
                </section>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              marginTop: '3rem',
              paddingTop: '2rem',
              borderTop: `1px solid ${c.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <span style={{ fontFamily: mono, fontSize: '0.62rem', color: c.textMuted, letterSpacing: '1px' }}>
                © {new Date().getFullYear()} {CONTROLLER_NAME} · All rights reserved
              </span>
              <a href={`mailto:${CONTROLLER_EMAIL}`} style={{
                fontFamily: mono, fontSize: '0.65rem', color: c.textMuted,
                textDecoration: 'none', letterSpacing: '0.5px',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = c.orange)}
                onMouseLeave={e => (e.currentTarget.style.color = c.textMuted)}>
                {CONTROLLER_EMAIL}
              </a>
            </div>

          </main>
        </div>
      </div>
    </>
  )
}
