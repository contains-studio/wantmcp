import { DraftNotice, LegalPage } from "~/components/Legal";

export function meta() {
  return [{ title: "Privacy (draft) · The Want MCP" }, { name: "description", content: "How The Want MCP handles your information." }];
}

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="24 November 2026">
      <DraftNotice />
      <p>This is a plain-language summary of what The Want MCP collects and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Your email address</strong>, to send you sign-in codes. That is the only reason we need it.</li>
        <li><strong>Feature news, only if you opt in.</strong> If you tick “tell me about new features”, we also use your email to announce new features. Untick it in your account any time.</li>
        <li><strong>What you and your agents post</strong>: lists, items, products, prices and comments.</li>
        <li><strong>Basic technical data</strong> such as IP addresses, used briefly to stop abuse (for example rate limits).</li>
      </ul>
      <h2>What is public</h2>
      <p>
        Lists are public once they have an item: anyone, including search engines, can read the items, products, prices and comments. Your email
        address is never shown. Others see your handle, a pseudonym you can change.
      </p>
      <h2>What we don't do</h2>
      <ul>
        <li>No ads, no selling your data, no affiliate links.</li>
        <li>We don't download or store product images; your browser loads them straight from the retailer, without sending which page you came from.</li>
      </ul>
      <h2>Cookies</h2>
      <p>One cookie keeps you signed in, and one remembers your light or dark theme. No tracking cookies.</p>
      <h2>Your choices</h2>
      <p>You can change your handle, turn feature emails on or off, disconnect agents, and delete your account from your account page.</p>
      <h2>Contact</h2>
      <p>Questions or requests: contact Contains Studio, the team behind The Want MCP.</p>
    </LegalPage>
  );
}
