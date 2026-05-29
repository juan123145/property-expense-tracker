import { Receipt, Users, BarChart3, FileText } from "lucide-react";

const features = [
  {
    icon: Receipt,
    title: "Receipt Storage",
    description:
      "Snap and upload receipts instantly. Every transaction has a permanent digital paper trail for tax time.",
  },
  {
    icon: Users,
    title: "Shared Access",
    description:
      "Invite your accountant or co-owner as a collaborator. They get read access, you stay in control.",
  },
  {
    icon: BarChart3,
    title: "Year-Over-Year Reports",
    description:
      "See exactly how much you spent this year vs last. Track trends across every property in your portfolio.",
  },
  {
    icon: FileText,
    title: "CPA Tax Packages",
    description:
      "One click exports a clean, structured financial bundle your accountant can open and use immediately.",
  },
];

export function MarketingFeatures() {
  return (
    <section id="features" className="py-24 bg-[#F5F3FF]">
      <div className="container max-w-6xl mx-auto px-4">
        <h2 className="text-5xl font-bold tracking-tight text-gray-900 mb-20">
          Built for landlords.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="group p-6 bg-white border border-slate-200 border-l-4 border-l-violet-500 rounded-2xl hover:shadow-md hover:border-violet-300 transition-all duration-300 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center mb-4 group-hover:bg-violet-100 transition-colors">
                <feat.icon className="h-5 w-5 text-violet-600" strokeWidth={2} />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                {feat.title}
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm font-normal">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
