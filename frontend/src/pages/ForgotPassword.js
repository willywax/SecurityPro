import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Shield, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await forgotPassword(email);

    if (result.success) {
      setIsSubmitted(true);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4" data-testid="forgot-password-page">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Lakezone Operation System</span>
          </div>

          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                  Reset your password
                </h1>
                <p className="text-slate-500 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div 
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                  data-testid="forgot-password-error"
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 border-slate-300 focus:border-[#0F172A] focus:ring-[#0F172A]/20"
                    data-testid="input-forgot-email"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#0F172A] hover:bg-slate-800 text-white font-medium transition-colors"
                  data-testid="btn-reset-password"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </Button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center" data-testid="forgot-password-success">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                Check your email
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                If an account with that email exists, we've sent a password reset link.
              </p>
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                variant="outline"
                className="w-full h-11"
                data-testid="btn-try-another"
              >
                Try another email
              </Button>
            </div>
          )}

          {/* Back to login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              data-testid="link-back-login"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
