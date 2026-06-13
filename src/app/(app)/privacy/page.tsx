export default function PrivacyPage() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 22px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ fontWeight: '800', fontSize: '24px', marginBottom: '6px' }}>Privacy Policy</div>
        <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '32px' }}>Last updated: June 2026</div>
        {[
          { title: '1. Information We Collect', body: 'We collect information you provide directly: name, email address, username, profile photo, and bio. We also collect content you create (posts, messages, comments) and usage data such as rooms joined, posts liked, and interactions with the platform.' },
          { title: '2. How We Use Your Information', body: 'We use your information to provide and improve our services, personalize your feed and room recommendations, send notifications about activity on your content, and ensure platform safety through content moderation.' },
          { title: '3. Data Storage', body: 'Your data is stored securely using Supabase (PostgreSQL) and Supabase Storage for media files. Data is stored in servers located in the European Union. We use industry-standard security measures to protect your data.' },
          { title: '4. Data Sharing', body: 'We do not sell your personal data. We do not share your data with advertisers. We may share data with service providers necessary to operate our platform (hosting, authentication). We may disclose data if required by law.' },
          { title: '5. Cookies & Tracking', body: 'We use cookies and local storage only for authentication and session management. We do not use tracking cookies or third-party advertising cookies. Our analytics, if enabled, are privacy-first and do not track individuals.' },
          { title: '6. Your Rights', body: 'You have the right to access, correct, or delete your personal data at any time. You can update your profile information from your profile settings. To request account deletion, contact us through the platform.' },
          { title: '7. Data Retention', body: 'We retain your data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law.' },
          { title: '8. Children\'s Privacy', body: 'Rooms is not intended for children under 13. We do not knowingly collect data from children under 13. If we become aware of such collection, we will delete that data immediately.' },
          { title: '9. Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will notify users of significant changes. Continued use of Rooms after changes constitutes acceptance of the updated policy.' },
          { title: '10. Contact', body: 'If you have questions about this Privacy Policy or your data, please contact us through the platform.' },
        ].map(s => (
          <div key={s.title} style={{ marginBottom: '24px' }}>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text1)', marginBottom: '8px' }}>{s.title}</div>
            <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.7' }}>{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
