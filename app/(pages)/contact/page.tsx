"use client";

import { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface PropertySettings {
  phone?:    string;
  email?:    string;
  whatsapp?: string;
  address?: {
    street?:  string;
    estate?:  string;
    city?:    string;
    mapsUrl?: string;
  };
  businessHours?: {
    day:   string;
    open:  boolean;
    from:  string;
    to:    string;
  }[];
}

interface ContactForm {
  name:    string;
  email:   string;
  phone:   string;
  message: string;
}

const EMPTY_FORM: ContactForm = { name: "", email: "", phone: "", message: "" };

export default function ContactPage() {
  const [form, setForm]       = useState<ContactForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  // ── Property settings ────────────────────────────────────────────────────────
  const [settings, setSettings]               = useState<PropertySettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/property-settings")
      .then(r => r.json())
      .then(data => { if (data.success) setSettings(data.data); })
      .catch(console.error)
      .finally(() => setSettingsLoading(false));
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────────
  const phone    = settings?.phone    || "+1 (312) 000-0000";
  const email    = settings?.email    || "info@jluvstays.com";
  const whatsapp = settings?.whatsapp || "13120000000";
  const city     = settings?.address?.city   || "Chicago";
  const estate   = settings?.address?.estate || "";
  const mapsUrl  = settings?.address?.mapsUrl || "";
  const addressLabel = [estate, city].filter(Boolean).join(", ");

  const officeHours = (() => {
    const open = settings?.businessHours?.filter(h => h.open);
    if (!open?.length) return "Mon – Sat, 8:00 AM – 6:00 PM";
    const fmt = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
    };
    return `Mon – Sat, ${fmt(open[0].from)} – ${fmt(open[open.length - 1].to)}`;
  })();

  const contactDetails = [
    { icon: "📞", label: "Phone",        value: phone,         href: `tel:${phone}`    },
    { icon: "✉️", label: "Email",        value: email,         href: `mailto:${email}` },
    { icon: "📍", label: "Address",      value: addressLabel,  href: null              },
    { icon: "🕐", label: "Office Hours", value: officeHours,   href: null              },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setSuccess("Message sent! We'll get back to you within 24 hours.");
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fb]">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#7A1B0F] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/70 text-sm font-semibold tracking-widest uppercase mb-3">
            We are here to help
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            Get in Touch
          </h1>
          <p className="text-white/85 text-lg">
            Questions about a room, a booking, or anything else — send us a message and we will respond within 24 hours.
          </p>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-14 grid lg:grid-cols-5 gap-10">

        {/* ── Left sidebar: details, map, whatsapp ─────────────────────── */}
        <aside className="lg:col-span-2 flex flex-col gap-6">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Contact Details</h2>

            {settingsLoading ? (
              <div className="space-y-5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-start gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-1">
                      <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-5">
                {contactDetails.map((item) => (
                  <li key={item.label} className="flex items-start gap-4">
                    <span className="w-10 h-10 rounded-xl bg-[#7A1B0F]/10 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                        {item.label}
                      </p>
                      {item.href ? (
                        <a href={item.href} className="text-sm font-medium text-slate-800 hover:text-[#7A1B0F] transition-colors">
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-slate-800">{item.value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Map — moved here so the sidebar and the form column balance out ── */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 h-56">
            {settingsLoading ? (
              <div className="w-full h-full animate-pulse bg-slate-200" />
            ) : mapsUrl ? (
              <iframe
                src={mapsUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Our location"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 px-4 text-center">
                <span className="text-3xl">📍</span>
                <p className="text-sm font-medium">Map not configured yet</p>
                <p className="text-xs text-slate-300">Add a Google Maps embed URL in Property Settings</p>
              </div>
            )}
          </div>

          {/* WhatsApp CTA */}
          <a
            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-3 bg-[#25d366] hover:bg-[#1ebe5d] text-white font-semibold py-4 rounded-2xl shadow-sm transition-colors"
          >
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Chat on WhatsApp
          </a>

        </aside>

        {/* ── Right: Form ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 h-full">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Send a Message</h2>
            <p className="text-sm text-slate-500 mb-8">Fill in your details and we will be in touch soon.</p>

            {success && (
              <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0 mt-0.5">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {success}
              </div>
            )}
            {error && (
              <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name" name="name" type="text"
                  value={form.name} onChange={handleChange}
                  placeholder="Jane Doe" required
                  className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 bg-white border-2 border-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-[#7A1B0F] focus:ring-4 focus:ring-[#7A1B0F]/10 transition"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    id="phone" name="phone" type="tel"
                    value={form.phone} onChange={handleChange}
                    placeholder="+1 (312) 000-0000"
                    className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 bg-white border-2 border-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-[#7A1B0F] focus:ring-4 focus:ring-[#7A1B0F]/10 transition"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email" name="email" type="email"
                    value={form.email} onChange={handleChange}
                    placeholder="jane@example.com" required
                    className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 bg-white border-2 border-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-[#7A1B0F] focus:ring-4 focus:ring-[#7A1B0F]/10 transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message" name="message" rows={8}
                  value={form.message} onChange={handleChange}
                  placeholder="Tell us how we can help you…" required
                  className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 bg-white border-2 border-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-[#7A1B0F] focus:ring-4 focus:ring-[#7A1B0F]/10 resize-none transition"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide bg-[#7A1B0F] hover:opacity-90 text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-[#7A1B0F]/20 transition-colors shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Sending…
                  </span>
                ) : "Send Message"}
              </button>
            </form>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}