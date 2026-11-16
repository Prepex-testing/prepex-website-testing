import type { Metadata } from "next";
import { CommunityLink } from "@/components/legal/CommunityLink";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal/contacts";

export const metadata: Metadata = { title: "Contact | Prepex", description: "How to reach Prepex: support, privacy requests and grievances." };

const SECTIONS: LegalSection[] = [
  {
    heading: "Help with the app",
    body: [
      `E-mail ${LEGAL.supportEmail}. In the app you can also use Report a bug or Share an idea (ask Pexo, or go to Profile, Settings).`,
      {
        node: (
          <p>
            WhatsApp:{" "}
            <a href={LEGAL.whatsAppUrl} target="_blank" rel="noopener noreferrer" className="underline" data-testid="contact-whatsapp">
              {LEGAL.whatsAppSupport}
            </a>
          </p>
        ),
      },
      `We reply within ${LEGAL.responseHours} hours.`,
    ],
  },
  {
    heading: "Prepex community",
    body: [{ node: <CommunityLink placement="contact" variant="card" /> }],
  },
  {
    heading: "Your data",
    body: [
      "Download everything we keep about you, or delete your account, from Profile, Settings, Your data. A parent or guardian of a student under 18 can write to us to see, correct or delete their child's information.",
      `For anything else about your personal data, e-mail ${LEGAL.supportEmail}.`,
    ],
  },
  {
    heading: "Grievance Officer",
    body: [
      `${LEGAL.grievanceOfficer}, ${LEGAL.grievanceEmail}. We acknowledge a grievance within ${LEGAL.responseHours} hours. If you are not satisfied with our answer, you can complain to the Data Protection Board of India.`,
    ],
  },
  {
    heading: "Security",
    body: [`Found a security problem? Please report it privately to ${LEGAL.securityEmail}.`],
  },
  {
    heading: "Who runs Prepex",
    body: [`${LEGAL.entityName}, ${LEGAL.address}. Prepex is not yet incorporated; it is run by ${LEGAL.operator} as an individual.`, LEGAL.addressNote],
  },
];

export default function ContactPage() {
  return <LegalPage title="Contact" updated={LEGAL.effectiveDate} intro="Questions, problems, data requests or a complaint: here is how to reach us." sections={SECTIONS} />;
}
