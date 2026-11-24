import Link from "next/link";
export default function Home() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <span className="landing-brand">
          ✳ &nbsp;matal<span>AI</span>
        </span>
        <Link href="/chat" className="landing-nav-link">
          Enter the bar
        </Link>
      </nav>
      <div className="landing-content">
        <div className="landing-copy">
          <span className="landing-kicker">YOUR QUESTIONABLE AI COMPANION</span>
          <h1>
            Good chat.
            <br />
            <em>Bad decisions.</em>
          </h1>
          <p>
            Meet the AI with a personality on tap. Pour a virtual drink, ask
            anything, and see where the conversation goes.
          </p>
          <Link href="/chat" className="landing-cta">
            Start a conversation
          </Link>
          <span className="landing-disclaimer">
            A fictional simulation. No actual alcohol involved.
          </span>
        </div>
        <div className="landing-art" aria-hidden="true">
          <div className="landing-orbit orbit-one" />
          <div className="landing-orbit orbit-two" />
          <div className="landing-glass">🍸</div>
          <div className="landing-tag">✳ &nbsp; PERSONALITY ON TAP</div>
        </div>
      </div>
      <div className="landing-footer">
        <span>GOOD TIMES, GREAT CHAT</span>
        <span>MADE FOR A GOOD TIME &nbsp; ✳</span>
      </div>
    </main>
  );
}
