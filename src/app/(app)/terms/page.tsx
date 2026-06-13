export default function TermsPage() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 22px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ fontWeight: '800', fontSize: '24px', marginBottom: '6px' }}>Terms of Service</div>
        <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '32px' }}>Last updated: June 2026</div>
        {[
          { title: '1. Acceptance of Terms', body: 'By accessing or using Rooms, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.' },
          { title: '2. Eligibility', body: 'You must be at least 13 years old to use Rooms. By using our service, you represent that you meet this requirement.' },
          { title: '3. User Accounts', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use.' },
          { title: '4. User Content', body: 'You retain ownership of content you post. By posting, you grant us a non-exclusive, royalty-free license to display and distribute that content on our platform. You are solely responsible for your content.' },
          { title: '5. Prohibited Conduct', body: 'You agree not to post spam, harassment, hate speech, or illegal content; impersonate others; attempt to hack or disrupt our services; or engage in any activity that violates applicable laws.' },
          { title: '6. Content Moderation', body: 'We reserve the right to remove content and suspend accounts that violate these terms. Users can report content using the built-in report feature.' },
          { title: '7. Privacy', body: 'Your use of Rooms is also governed by our Privacy Policy. Please review it to understand how we handle your data.' },
          { title: '8. Disclaimers', body: 'Rooms is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service or accuracy of user-generated content.' },
          { title: '9. Limitation of Liability', body: 'To the maximum extent permitted by law, Rooms shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.' },
          { title: '10. Changes to Terms', body: 'We may update these terms from time to time. Continued use of Rooms after changes constitutes acceptance of the updated terms.' },
          { title: '11. Contact', body: 'If you have questions about these terms, please contact us through the platform.' },
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
