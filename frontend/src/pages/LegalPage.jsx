import "../styles/LegalPage.css";

const contentByType = {
  "privacy-policy": {
    eyebrow: "Privacy Policy",
    title: "Privacy Policy",
    intro:
      "Effective Date: July 21, 2026. Welcome to Rangila Bro. Your privacy matters to us, and this policy explains how we collect, use, and protect information when you browse the site or place an order.",
    sections: [
      {
        heading: "Information We Collect",
        type: "list",
        items: [
          "Full name",
          "Shipping and billing address",
          "Email address",
          "Phone number",
          "Order details",
        ],
      },
      {
        heading: "How We Use Your Information",
        type: "list",
        items: [
          "Process and fulfill orders",
          "Provide customer support",
          "Send order confirmations and shipping updates",
          "Improve our website and customer experience",
        ],
      },
      {
        heading: "Sharing Information",
        body:
          "We do not sell or rent your personal information. We may share information only with trusted service providers such as Stripe, shipping carriers, and website hosting providers.",
      },
      {
        heading: "Security",
        body:
          "We use reasonable security measures to protect your personal information. However, no online transmission is completely secure.",
      },
    ],
  },
  "terms-of-service": {
    eyebrow: "Terms of Service",
    title: "Terms of Service",
    intro:
      "By using the Rangila Bro website, you agree to these Terms of Service.",
    sections: [
      {
        heading: "Products",
        body: "We sell packaged Nepali snack products.",
      },
      {
        heading: "Pricing",
        body:
          "All prices are listed in U.S. Dollars (USD). Prices may change without prior notice.",
      },
      {
        heading: "Orders",
        body:
          "We reserve the right to refuse or cancel any order, limit quantities purchased, and correct pricing errors.",
      },
      {
        heading: "Payments",
        body: "Payments are securely processed through Stripe.",
      },
      {
        heading: "Intellectual Property",
        body:
          "All content, logos, product images, and branding belong to Rangila Bro and may not be copied without permission.",
      },
      {
        heading: "Limitation of Liability",
        body:
          "To the maximum extent permitted by law, Rangila Bro shall not be liable for indirect or consequential damages resulting from use of our products or website.",
      },
      {
        heading: "Governing Law",
        body: "These Terms are governed by the laws of the State of Texas.",
      },
    ],
  },
  "refund-policy": {
    eyebrow: "Refund Policy",
    title: "Refund Policy",
    intro:
      "Because our products are packaged food items, we generally do not accept returns once an order has shipped.",
    sections: [
      {
        heading: "When to Contact Us",
        body:
          "If your order arrives damaged, contains incorrect items, or is defective, please contact us within 48 hours of delivery.",
      },
      {
        heading: "What to Include",
        type: "list",
        items: [
          "Order number",
          "Photos of the package and product",
          "Description of the issue",
        ],
      },
      {
        heading: "Possible Resolution",
        body:
          "If approved, we may provide a replacement product, store credit, or refund. Refunds are issued to the original payment method.",
      },
    ],
  },
  "shipping-policy": {
    eyebrow: "Shipping Policy",
    title: "Shipping Policy",
    intro:
      "Orders are typically processed within 1–2 business days, and delivery times vary based on destination and carrier.",
    sections: [
      {
        heading: "Processing Time",
        body: "Orders are typically processed within 1–2 business days.",
      },
      {
        heading: "Shipping",
        body:
          "Delivery times vary depending on destination and shipping carrier. Tracking information will be provided once your order ships.",
      },
      {
        heading: "Incorrect Address",
        body:
          "Customers are responsible for providing accurate shipping addresses. We are not responsible for delays or failed deliveries caused by incorrect addresses.",
      },
      {
        heading: "Lost Packages",
        body:
          "If your package appears lost, please contact us and we will work with the carrier to resolve the issue.",
      },
    ],
  },
};

function LegalPage({ pageType }) {
  const page = contentByType[pageType] || contentByType["privacy-policy"];

  return (
    <section className="page legal-page">
      <div className="section-heading">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p className="legal-intro">{page.intro}</p>
      </div>

      <div className="legal-card">
        {page.sections.map((section) => (
          <div key={section.heading} className="legal-section">
            <h2>{section.heading}</h2>
            {section.type === "list" ? (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>{section.body}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default LegalPage;
