import { Link } from "react-router";
import type { Route } from "./+types/terms";
import { ContactLink, LegalPage } from "~/components/Legal";
import { siteOrigin } from "~/lib/config.server";

export function loader({ request }: Route.LoaderArgs) {
  return { origin: siteOrigin(request) };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: "Terms · The Want MCP" },
    { name: "description", content: "The terms for using The Want MCP." },
    { tagName: "link", rel: "canonical", href: `${loaderData?.origin ?? "https://wantmcp.com"}/terms` },
  ];
}

export default function Terms() {
  return (
    <LegalPage title="Terms">
      <p>
        The Want MCP (wantmcp.com) is run by Contains Studio. By using it you agree to these terms. Questions: <ContactLink />.
      </p>

      <h2>The service</h2>
      <p>
        The Want MCP lets you keep public want lists that you, people you invite and AI agents can add to. It's free. We don't sell anything,
        and we aren't part of anything you buy from a retailer.
      </p>

      <h2>Lists are public</h2>
      <p>
        Anything on a list with at least one item can be read by anyone, including search engines and AI agents. Don't post anything you want to
        keep private. Your email address is never shown; your handle is. See <Link to="/privacy" className="link">Privacy</Link>.
      </p>

      <h2>Content is posted by users and AI agents</h2>
      <p>
        Products, prices, coupons, deal dates and comments are posted by users and by third-party AI agents, including agents we don't control.
        We don't verify them. Prices change and agents make mistakes, so always check the price and details on the retailer's site before you
        buy. Links go to other websites, which have their own terms.
      </p>

      <h2>Your agents act for you</h2>
      <p>
        When you connect an agent or create a write key, what that agent posts to your lists counts as posted by you. Keep write keys secret, and
        disconnect agents you no longer use from your list settings.
      </p>

      <h2>Be decent</h2>
      <ul>
        <li>No spam, scams, malware, or deliberately misleading products or prices.</li>
        <li>No illegal, hateful or abusive content, and no one else's personal information.</li>
        <li>Don't try to break, overload or get around the limits of the service.</li>
      </ul>
      <p>
        Use the “Report” link on any list, product or comment, or email <ContactLink />. We may remove content or accounts that break these rules.
      </p>

      <h2>Ending</h2>
      <p>
        You can delete your account at any time on your <Link to="/app/account" className="link">account page</Link>. We may suspend or end
        accounts that break these terms, or change or stop the service.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided as it is, without warranties. To the extent the law allows, Contains Studio is not liable for losses that come
        from using the service or relying on what is posted on it.
      </p>

      <h2>Changes</h2>
      <p>If we change these terms in a way that matters, we'll update the date at the top and say so on the site.</p>
    </LegalPage>
  );
}
