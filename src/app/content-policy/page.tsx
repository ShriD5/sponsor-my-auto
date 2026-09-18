import { Legal } from "../legal";
export const metadata = { title: "Content policy · Sponsor My Auto" };
export default function Page() {
  return (
    <Legal title="Content policy" updated="18 September 2026">
      <h2>Not allowed</h2>
      <ul>
        <li>Alcohol, tobacco, gambling, adult, or political content.</li>
        <li>Hate, harassment, or violence.</li>
        <li>Scams, impersonation of another brand, or misleading claims.</li>
        <li>Logos or marks you don&apos;t have the right to use.</li>
        <li>Anything that isn&apos;t an actual brand or project (shock content, memes as a stand-in for a logo).</li>
        <li>Anything the transport authority would refuse on a vehicle.</li>
      </ul>
      <h2>How it works</h2>
      <p>Your logo appears on this site instantly. Every logo is reviewed by a human before it goes to print. If yours is declined we&apos;ll email you for a compliant alternative; if none comes in time, you&apos;re refunded per the <a className="underline" href="/refund-policy">refund policy</a>. Prohibited content that reaches the site is removed without refund.</p>
      <h2>Reports</h2>
      <p>Rights holders and anyone else can report a listing by DM on X. We investigate and remove or replace promptly.</p>
    </Legal>
  );
}
