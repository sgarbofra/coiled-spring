import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Coiled Spring Strategy App</h1>
      <p>Frontend operativo.</p>

      <nav style={{ marginTop: "16px" }}>
        <Link href="/watchlists">Vai a Watchlists</Link>
      </nav>
    </main>
  );
}