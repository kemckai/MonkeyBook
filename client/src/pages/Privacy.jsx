import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

export default function Privacy() {
  return (
    <div className="app">
      <Header />
      <main className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: August 30, 2026</p>

        <section>
          <h2>What we collect</h2>
          <p>When you create an account, we store your email address and a hashed password (or Google account ID if you sign in with Google). We also assign you a monkey persona with a display name, avatar, posts, reactions, and friend connections.</p>
        </section>

        <section>
          <h2>How we use your data</h2>
          <p>We use your information to operate Monkeybook: authenticate you, display your profile, deliver your feed, send notifications, and moderate reported content. We do not sell your personal data to third parties.</p>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>We use httpOnly session cookies to keep you logged in. These are essential for the service to work.</p>
        </section>

        <section>
          <h2>Content you post</h2>
          <p>Posts, reactions, and profile information you create are visible to other users according to the feature (public feed, friend feed, troops). Do not post content you would not want others to see.</p>
        </section>

        <section>
          <h2>Data retention</h2>
          <p>We retain your account data while your account is active. You may request account deletion by contacting us. Deleted accounts will have personal identifiers removed within 30 days.</p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>Questions about this policy? Email <a href="mailto:privacy@monkeybook.app">privacy@monkeybook.app</a>.</p>
        </section>

        <p><Link to="/">← Back to Monkeybook</Link></p>
      </main>
    </div>
  );
}
