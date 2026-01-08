"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    // TODO: Save email to Supabase waitlist table
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-purple-50 to-pink-100" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-200/50 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-purple-200/30 rounded-full blur-2xl" />
      </div>

      {/* Decorative sparkles */}
      <div className="fixed inset-0 -z-5 overflow-hidden pointer-events-none">
        <svg className="absolute top-[20%] left-[15%] w-3 h-3 text-gray-400/50" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
        <svg className="absolute top-[60%] left-[10%] w-2 h-2 text-gray-400/40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
        <svg className="absolute top-[40%] right-[10%] w-3 h-3 text-gray-400/50" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
        <svg className="absolute bottom-[30%] right-[20%] w-2 h-2 text-gray-400/40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
        <svg className="absolute bottom-[20%] left-[30%] w-2 h-2 text-gray-400/30" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
        {/* White Card Container */}
        <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-purple-500/5 border border-white/50 p-8 md:p-12">

          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <Image
              src="/logo.png"
              alt="Bloggish"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full"
            />
            <span
              className="text-2xl text-gray-900 tracking-tight"
              style={{ fontFamily: "'PT Serif', Georgia, serif", fontWeight: 700 }}
            >
              Bloggish
            </span>
          </div>


          {/* Heading - Using PT Serif to match editor H1 */}
          <h1
            className="text-4xl md:text-5xl text-gray-900 text-center leading-tight mb-6"
            style={{ fontFamily: "'PT Serif', Georgia, serif", fontWeight: 400 }}
          >
            It's like a blog but...<br /><span className="font-bold">better</span>
          </h1>

          {/* Subtext */}
          <p className="text-center text-gray-500 mb-10 text-lg">
            Ready to turn your blog into a conversion engine?<br />
            Secure your spot on the waitlist.
          </p>

          {/* Waitlist Card */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 md:p-8">
            {/* Badge */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/80 border border-gray-200/50">
                <svg className="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
                </svg>
                <span className="text-xs text-gray-700 font-medium">Bloggish is live by <span className="font-bold">INVITE ONLY</span></span>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center">
              Join the waitlist
            </h2>
            <p className="text-gray-500 text-sm mb-6 text-center">
              Sign up to be one of the first to use Bloggish.
            </p>

            {/* Form */}
            {!isSubmitted ? (
              <form onSubmit={handleWaitlistSubmit}>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="Enter your email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Get Notified
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <p className="text-emerald-700 font-medium">🎉 You're on the list! We'll be in touch soon.</p>
              </div>
            )}
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-500 mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-gray-900 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
