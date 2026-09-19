import { Legal } from "../legal";
export const metadata = { title: "Privacy · Sponsor My Auto" };
export default function Page() {
  return (
    <Legal title="Privacy" updated="20 September 2026">
      <h2>What we store</h2>
      <p>For sponsors: brand name, link, logo, email, amount, and payment reference from Dodo Payments. For visitors: an anonymous random ID in your browser&apos;s local storage to count who&apos;s here now, plus per page view the site you came from, any campaign tag in the link, your rough location (country and city, derived from your IP by our host; the IP itself is not stored), and your device and browser type. No cookies, no ad tracking, no third-party analytics scripts.</p>
      <h2>What we do with it</h2>
      <p>Show your logo and link on the site and the auto, email you about your slot, refunds, and wrap day. Nothing is sold or shared beyond the payment processor.</p>
      <h2>Removal</h2>
      <p>Email shrithanofficial@gmail.com to delete your data after the campaign ends.</p>
    </Legal>
  );
}
