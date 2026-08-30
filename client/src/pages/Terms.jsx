import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

export default function Terms() {
  return (
    <div className="app">
      <Header />
      <main className="legal-page">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: August 30, 2026</p>

        <section>
          <h2>Acceptance</h2>
          <p>By using Monkeybook, you agree to these terms. If you do not agree, do not use the service.</p>
        </section>

        <section>
          <h2>Your account</h2>
          <p>You must be at least 13 years old to use Monkeybook. You are responsible for keeping your login credentials secure and for all activity under your account.</p>
        </section>

        <section>
          <h2>Acceptable use</h2>
          <p>You may not use Monkeybook to harass, threaten, spam, post illegal content, or impersonate others. We may remove content and suspend accounts that violate these rules.</p>
        </section>

        <section>
          <h2>Monkey personas</h2>
          <p>Your monkey name is a display identity within the app. While posts can be anonymous to other users, we maintain account records for safety, moderation, and legal compliance.</p>
        </section>

        <section>
          <h2>Content ownership</h2>
          <p>You retain ownership of content you post. By posting, you grant Monkeybook a license to display and distribute that content within the service.</p>
        </section>

        <section>
          <h2>Moderation</h2>
          <p>We reserve the right to remove content, resolve reports, and terminate accounts at our discretion to keep the community safe.</p>
        </section>

        <section>
          <h2>Disclaimer</h2>
          <p>Monkeybook is provided &quot;as is&quot; without warranties. We are not liable for user-generated content or service interruptions.</p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>Questions? Email <a href="mailto:legal@monkeybook.app">legal@monkeybook.app</a>.</p>
        </section>

        <p><Link to="/">← Back to Monkeybook</Link></p>
      </main>
    </div>
  );
}
