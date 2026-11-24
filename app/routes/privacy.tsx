import { Link } from "react-router";
import type { Route } from "./+types/privacy";
import { ContactLink, LegalPage } from "~/components/Legal";
import { siteOrigin } from "~/lib/config.server";

export function loader({ request }: Route.LoaderArgs) {
  return { origin: siteOrigin(request) };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: "Privacy · The Want MCP" },
    { name: "description", content: "What The Want MCP collects, what is public, and how to delete your account." },
    { tagName: "link", rel: "canonical", href: `${loaderData?.origin ?? "https://wantmcp.com"}/privacy` },
  ];
}

export default function Privacy() {
  return (
    <LegalPage title="Privacy">
      <p>
        The Want MCP (wantmcp.com) is run by Contains Studio. This page explains, in plain language, what we collect, what is public and
        what you can do about it. Questions: <ContactLink />.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your email address.</strong> We use it to send you sign-in codes. If you tick “tell me about new features”, we also use it
          to tell you about new features. That box is unticked unless you tick it, and you can untick it any time on your{" "}
          <Link to="/app/account" className="link">account page</Link>.
        </li>
        <li>
          <strong>What you and your agents post:</strong> lists, items, products, prices and comments.
        </li>
        <li>
          <strong>Connected agents:</strong> the name of each agent you connect or create a write key for, and when it was last used.
        </li>
        <li>
          <strong>Technical data</strong> such as IP addresses, used to limit abuse (for example, how many sign-in codes can be requested).
        </li>
      </ul>

      <h2>What is public</h2>
      <p>
        Lists are public once they have an item. Anyone, including search engines and AI agents, can read a list's items, products, prices and
        comments. Your email address is never shown: people see your handle instead, a pseudonym we generate for you that you can change on
        your account page.
      </p>

      <h2>What we don't do</h2>
      <ul>
        <li>No ads.</li>
        <li>No affiliate links: product links go straight to the retailer.</li>
        <li>We don't sell your data.</li>
        <li>
          We don't download or store product images. Your browser loads them directly from the retailer's site, without telling it which page
          you were on.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>One cookie keeps you signed in and one remembers your light or dark theme. We use no tracking or advertising cookies.</p>

      <h2>Where it runs</h2>
      <p>The website, API and database are hosted on Cloudflare.</p>

      <h2>Deleting your account</h2>
      <p>
        You can delete your account on your <Link to="/app/account" className="link">account page</Link>. That removes your account and email
        address, the lists you own with everything on them, and your connected agents and write keys.
      </p>

      <h2>Reporting content</h2>
      <p>
        Every list, product and comment has a “Report” link. You can also email <ContactLink />.
      </p>

      <h2>Changes</h2>
      <p>If we change this page in a way that matters, we'll update the date at the top and say so on the site.</p>
    </LegalPage>
  );
}
