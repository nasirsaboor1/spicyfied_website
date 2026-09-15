import { useState } from 'react';
import { ArrowLeft, MapPin, Phone, Mail, Twitter, Instagram, Facebook, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContactPageProps {
  onNavigateHome: () => void;
}

export default function ContactPage({ onNavigateHome }: ContactPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle');
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setSubmitStatus('error');
      setErrorMessage('Please fill in all required fields');
      return;
    }

    if (!validateEmail(formData.email)) {
      setSubmitStatus('error');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (formData.message.length > 2000) {
      setSubmitStatus('error');
      setErrorMessage('Message is too long. Please keep it under 2000 characters');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert([{
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          subject: formData.subject.trim(),
          message: formData.message.trim()
        }]);

      if (error) throw error;

      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });

      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus('error');
      setErrorMessage('Failed to submit your message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-ink hover:text-saffron-light mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div className="max-w-2xl mb-12">
          <h1 className="font-serif text-[28px] md:text-3xl font-semibold text-ink mb-4">Contact Us</h1>
          <p className="text-charcoal/70">
            Have a question or want to learn more about our premium spices? We'd love to hear from you!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Contact Information */}
          <div className="border border-black/10 rounded-lg divide-y divide-black/10">
            <div className="p-8">
              <h2 className="text-lg font-semibold text-ink mb-6">Get In Touch</h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Our Address</h3>
                    <p className="text-charcoal leading-relaxed">
                      J-31/95, B-1, AMINA TOWER,<br />
                      KACHI BAGH, PILI KOTHI,<br />
                      VARANASI-221001<br />
                      UTTAR PRADESH, INDIA
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Call Us</h3>
                    <a href="tel:+919044631515" className="text-charcoal hover:text-saffron-light transition-colors">
                      +91-9044631515
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Email Us</h3>
                    <a
                      href="mailto:southmountainenter@gmail.com"
                      className="text-charcoal hover:text-saffron-light transition-colors break-all"
                    >
                      southmountainenter@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="p-8">
              <h2 className="text-lg font-semibold text-ink mb-6">Follow Us</h2>
              <p className="text-charcoal/70 mb-6">
                Stay connected with us on social media for the latest updates, recipes, and special offers.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://x.com/spicyfiedsme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink hover:text-saffron-light transition-colors"
                  aria-label="Follow us on Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://www.instagram.com/spicyfiedsme/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink hover:text-saffron-light transition-colors"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.facebook.com/spicyfiedsme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink hover:text-saffron-light transition-colors"
                  aria-label="Follow us on Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Business Hours */}
            <div className="p-8">
              <h2 className="text-lg font-semibold text-ink mb-6">Business Hours</h2>
              <div className="space-y-3 text-charcoal">
                <div className="flex justify-between">
                  <span className="font-medium">Monday - Friday:</span>
                  <span>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Saturday:</span>
                  <span>10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Sunday:</span>
                  <span>Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="border border-black/10 rounded-lg p-8">
            <h2 className="text-lg font-semibold text-ink mb-6">Send Us a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-lg border border-black/10 focus:ring-2 focus:ring-ink focus:border-transparent outline-none transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-lg border border-black/10 focus:ring-2 focus:ring-ink focus:border-transparent outline-none transition-all"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-charcoal mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-lg border border-black/10 focus:ring-2 focus:ring-ink focus:border-transparent outline-none transition-all"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-charcoal mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-lg border border-black/10 focus:ring-2 focus:ring-ink focus:border-transparent outline-none transition-all"
                  placeholder="What's this about?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-charcoal mb-2">
                  Your Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  maxLength={2000}
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-black/10 focus:ring-2 focus:ring-ink focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Tell us how we can help you..."
                />
                <p className="text-sm text-charcoal/60 mt-1">
                  {formData.message.length}/2000 characters
                </p>
              </div>

              {submitStatus === 'success' && (
                <div className="bg-sage-tint border border-moss/30 rounded-lg p-4">
                  <p className="text-ink font-medium">
                    Thank you for contacting us! We'll get back to you soon.
                  </p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-ink hover:bg-saffron-light text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
