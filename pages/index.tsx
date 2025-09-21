import Link from "next/link";

export default function Home() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
      <h1>Welcome to SafeTrip</h1>
      <p>Smart Tourist Safety Monitoring System</p>

      <div style={{ marginTop: "2rem" }}>
        <Link href="/login">
          <button style={{ margin: "0.5rem", padding: "0.5rem 1rem" }}>Login</button>
        </Link>
        <Link href="/register">
          <button style={{ margin: "0.5rem", padding: "0.5rem 1rem" }}>Register</button>
        </Link>
        <Link href="/dashboard">
          <button style={{ margin: "0.5rem", padding: "0.5rem 1rem" }}>Dashboard</button>
        </Link>
      </div>
    </div>
  );
}