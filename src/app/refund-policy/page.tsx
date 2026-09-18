import { Legal } from "../legal";
export const metadata = { title: "Refunds · Sponsor My Auto" };
export default function Page() {
  return (
    <Legal title="Refund policy" updated="18 September 2026">
      <h2>Taken over</h2>
      <p>If someone takes your slot by paying double, your payment is refunded automatically to your original payment method, minus payment processing fees kept by the payment provider. Usually minutes, up to 7 business days depending on your bank.</p>
      <h2>The auto doesn&apos;t roll</h2>
      <p>If we call the campaign off and the auto never gets wrapped, every sponsor is refunded in full minus processing fees, no questions asked, within 7 business days.</p>
      <h2>Off the road</h2>
      <p>If the auto is off the road for a day during the month, that day is added to the end. If the auto is off the road for good (accident, driver leaves), you choose between a pro-rata refund of the remaining days or the same slot on a replacement auto.</p>
      <h2>Rejected artwork</h2>
      <p>If we decline your logo under the <a className="underline" href="/content-policy">content policy</a> before printing, you&apos;re refunded in full minus processing fees. If you swap in prohibited content after approval, the slot is removed and the payment is forfeit.</p>
      <h2>Changed your mind</h2>
      <p>No refunds for a change of mind once a slot is confirmed and not taken over. If you have a genuine issue, DM on X and we&apos;ll sort it.</p>
    </Legal>
  );
}
