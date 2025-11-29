import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Card from "~/components/common/Card";
import Button from "~/components/common/Button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("next-auth.session-token") || 
                       cookieStore.get("__Secure-next-auth.session-token");

  if (sessionToken) {
    redirect("/dashboard");
  }

  return (
    <>
      {/* Hero Section */}
      <section className="py-16 md:py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
            Build AI Chatbots
            <span className="block text-purple-600 mt-2">Powered by RAG</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-700 mb-8">
            Create intelligent chatbots that understand your documents. Upload PDFs, ask questions, get smart answers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button variant="primary" size="lg">
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Why Choose AmanaRAG?</h2>
          <p className="text-slate-700 max-w-2xl mx-auto">
            Everything you need to build and deploy intelligent chatbots
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: (
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              title: "Document Upload",
              description: "Upload PDFs, DOCX, CSV, and Markdown files. AI processes everything automatically.",
            },
            {
              icon: (
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ),
              title: "Smart Conversations",
              description: "AI-powered chat that understands context and provides accurate answers from your content.",
            },
            {
              icon: (
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              ),
              title: "Easy Integration",
              description: "One line of code to embed your chatbot anywhere. No complex setup required.",
            },
            {
              icon: (
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
              title: "Secure & Private",
              description: "Your API keys are encrypted. Your data stays private and secure.",
            },
            {
              icon: (
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              title: "Fast & Reliable",
              description: "Lightning-fast responses powered by advanced AI models.",
            },
            {
              icon: (
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
              title: "Analytics & Insights",
              description: "Track conversations and understand what your users need most.",
            },
          ].map((feature, index) => (
            <Card key={index} hover className="text-center">
              <div className="flex justify-center mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-700 text-sm">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Simple Pricing</h2>
          <p className="text-slate-700">Choose the plan that works for you</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            {
              name: "Starter",
              price: "Free",
              description: "Perfect for trying out",
              features: ["Up to 10 documents", "100 messages/month", "Basic support"],
              cta: "Get Started",
              variant: "secondary" as const,
            },
            {
              name: "Pro",
              price: "$29",
              period: "/month",
              description: "Most popular",
              features: ["Unlimited documents", "Unlimited messages", "Priority support", "Advanced analytics"],
              cta: "Start Free Trial",
              variant: "primary" as const,
              popular: true,
            },
            {
              name: "Enterprise",
              price: "Custom",
              description: "For large teams",
              features: ["Everything in Pro", "Custom integrations", "Dedicated support", "SLA guarantee"],
              cta: "Contact Sales",
              variant: "secondary" as const,
            },
          ].map((plan, index) => (
            <Card
              key={index}
              hover
              className={`relative ${plan.popular ? 'ring-2 ring-purple-600' : ''}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                  {plan.period && <span className="text-slate-700 ml-1">{plan.period}</span>}
                </div>
                <p className="text-slate-700 mb-6 text-sm">{plan.description}</p>
                <ul className="text-left space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={plan.name === "Enterprise" ? "/login" : "/signup"}>
                  <Button variant={plan.variant} size="lg" className="w-full">
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16">
        <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0">
          <div className="text-center max-w-2xl mx-auto py-8">
            <h2 className="text-3xl font-bold mb-3">Ready to get started?</h2>
            <p className="text-lg text-white/90 mb-6">
              Join thousands building intelligent chatbots with AmanaRAG.
            </p>
            <Link href="/signup">
              <Button variant="secondary" size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                Start Building Now
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </>
  );
}
