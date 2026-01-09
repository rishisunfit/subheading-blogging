import { useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useDialog } from "@/hooks/useDialog";

interface CTAFormProps {
  postId?: string;
  quizId?: string | null;
}

export function CTAForm({ postId }: CTAFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showDialog } = useDialog();

  const validateForm = () => {
    const newErrors: { email?: string; phone?: string } = {};

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // At least one contact method is required
    if (!formData.email.trim() && !formData.phone.trim()) {
      newErrors.email = "Please provide either an email or phone number";
      newErrors.phone = "Please provide either an email or phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/submit-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          message: formData.message,
          post_id: postId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit question");
      }

      await response.json();

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ email: "", phone: "", message: "" });
        setErrors({});
      }, 3000);
    } catch (error) {
      console.error("Error submitting form:", error);
      await showDialog({
        type: "alert",
        message: "Failed to send message. Please try again.",
        title: "Error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="my-8 flex justify-center"
      data-cta-id={`cta-form-${postId || "default"}`}
    >
      <div className="w-full max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden w-full">
          <div className="px-6 py-12">
            {/* Decorative element */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 rotate-12 bg-blue-50 mx-auto">
              <MessageCircle className="text-blue-500" size={32} />
            </div>

            {/* Subtitle */}
            <p className="text-sm font-medium tracking-wide uppercase mb-4 text-center text-blue-600">
              GET IN TOUCH
            </p>

            {/* Title */}
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
              Have a question? Text me
            </h3>

            {/* Description */}
            <p className="text-lg max-w-xl mx-auto mb-10 opacity-70 leading-relaxed text-gray-700 text-center">
              I'd love to hear from you. Drop me a message and I'll get back to
              you soon. <br />
              <span className="text-sm">
                → My DMs and email inbox get flooded. This is a great, private
                way for me to answer your questions :)
              </span>
            </p>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center max-w-md mx-auto">
                <p className="text-green-800 font-semibold">
                  ✓ Message sent! I'll be in touch soon.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-4 max-w-md mx-auto"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errors.phone) {
                        setErrors({ ...errors, phone: undefined });
                      }
                    }}
                    placeholder="+1 (555) 123-4567"
                    disabled={isLoading}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                <p className="text-sm text-gray-500 -mt-2">
                  Please provide at least one contact method (email or phone)
                </p>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Quick Message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="Your message here..."
                    required
                    rows={4}
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold transition-all duration-300 hover:gap-4 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "#000000",
                    color: "#ffffff",
                    borderRadius: "1rem",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send
                        size={20}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
